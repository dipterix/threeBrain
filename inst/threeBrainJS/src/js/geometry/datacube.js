import { AbstractThreeBrainObject } from './abstract.js';
import { CONSTANTS } from '../core/constants.js';
import { to_array, get_or_default } from '../utils.js';
import { Object3D, LineBasicMaterial, BufferGeometry, Data3DTexture, RedFormat,
         LinearFilter, NearestFilter,
         UnsignedByteType, RawShaderMaterial, Vector3, DoubleSide, UniformsUtils,
         PlaneGeometry, Mesh, LineSegments } from 'three';
import { SliceShader } from '../shaders/SliceShader.js';
import { Volume2dArrayShader_xy, Volume2dArrayShader_xz,
         Volume2dArrayShader_yz } from '../shaders/Volume2DShader.js';

/* WebGL doesn't take transparency into consideration when calculating depth
https://stackoverflow.com/questions/11165345/three-js-webgl-transparent-planes-hiding-other-planes-behind-them

The hack is to rewrite shader, force transparent fragments to have depth of 1, which means transparent parts
always hide behind other objects.

However, is we set brain mesh to be transparent, the volume is still hidden behind the mesh and invisible.
This is because when the renderer calculate depth first, and the mesh is in the front, then volume gets
not rendered.
What we need to do is to set render order to be -1, which means always render volume first, then the opaque
parts will show.

*/

class DataCube extends AbstractThreeBrainObject {
  constructor(g, canvas){
    super(g, canvas);

    this.type = 'DataCube';
    this.isDataCube = true;
    this.mainCanvasActive = false;
    this._uniforms = UniformsUtils.clone( SliceShader.uniforms );

    const subjectData = this._canvas.shared_data.get( this.subject_code );

    // Shader will take care of it
    g.disable_trans_mat = true;
    let dataTextureType = UnsignedByteType;

    // get cube (volume) data
    if( g.isVolumeCube ) {
      const niftiData = canvas.get_data("volume_data", g.name, g.group.group_name);

      if( niftiData.imageDataType === undefined ) {
        // float64 array, not supported
        let imageMin = Infinity, imageMax = -Infinity;
        niftiData.image.forEach(( v ) => {
          if( imageMin > v ){ imageMin = v; }
          if( imageMax < v ){ imageMax = v; }
        })
        this.cubeData = new Uint8Array( niftiData.image.length );
        const slope = 255 / (imageMax - imageMin),
              intercept = 255 - imageMax * slope,
              threshold = g.threshold || 0;
        niftiData.image.forEach(( v, ii ) => {
          const d = v * slope + intercept;
          if( d > threshold ) {
            this.cubeData[ ii ] = d;
          } else {
            this.cubeData[ ii ] = 0;
          }
        })
      } else {
        this.cubeData = niftiData.image;
        dataTextureType = niftiData.imageDataType;
      }
      this.cubeShape = new Vector3().copy( niftiData.shape );
      const affine = niftiData.affine.clone();
      if( subjectData && typeof subjectData === "object" && subjectData.matrices ) {
        affine.copy( subjectData.matrices.Torig )
          .multiply( subjectData.matrices.Norig.clone().invert() )
          .multiply( niftiData.affine );
      }
      this._uniforms.world2IJK.value.copy( affine ).invert();
    } else {
      this.cubeData = new Uint8Array(canvas.get_data('datacube_value_'+g.name, g.name, g.group.group_name));
      this.cubeShape = new Vector3().fromArray( canvas.get_data('datacube_dim_'+g.name, g.name, g.group.group_name) );
      this._uniforms.world2IJK.value.set(1,0,0,128, 0,1,0,128, 0,0,1,128, 0,0,0,1);
    }
    this.dataTexture = new Data3DTexture(
      this.cubeData, this.cubeShape.x, this.cubeShape.y, this.cubeShape.z
    );
    this.dataTexture.minFilter = NearestFilter;
    this.dataTexture.magFilter = NearestFilter;
    this.dataTexture.format = RedFormat;
    this.dataTexture.type = dataTextureType;
    this.dataTexture.unpackAlignment = 1;
    this.dataTexture.needsUpdate = true;

    // Generate shader
    this._uniforms.map.value = this.dataTexture;
    this._uniforms.mapShape.value.copy( this.cubeShape );

    const sliceMaterial = new RawShaderMaterial( {
      uniforms: this._uniforms,
      vertexShader: SliceShader.vertexShader,
      fragmentShader: SliceShader.fragmentShader,
      side: DoubleSide,
      transparent : false,
      depthWrite: true
    } );
    this.sliceMaterial = sliceMaterial;
    const sliceGeometryXY = new PlaneGeometry( 256, 256 );
    this.sliceGeometryXY = sliceGeometryXY;
    const sliceMeshXY = new Mesh( sliceGeometryXY, sliceMaterial );
    sliceMeshXY.renderOrder = -1;
    sliceMeshXY.position.copy( CONSTANTS.VEC_ORIGIN );
    sliceMeshXY.name = 'mesh_datacube__axial_' + g.name;


    const sliceGeometryXZ = new PlaneGeometry( 256, 256 );
    this.sliceGeometryXZ = sliceGeometryXZ;
    const sliceMeshXZ = new Mesh( sliceGeometryXZ, sliceMaterial );
    sliceMeshXZ.rotateX( Math.PI / 2 );
    sliceMeshXZ.renderOrder = -1;
    sliceMeshXZ.position.copy( CONSTANTS.VEC_ORIGIN );
    sliceMeshXZ.name = 'mesh_datacube__coronal_' + g.name;

    const sliceGeometryYZ = new PlaneGeometry( 256, 256 );
    this.sliceGeometryYZ = sliceGeometryYZ;
    const sliceMeshYZ = new Mesh( sliceGeometryYZ, sliceMaterial );
    sliceMeshYZ.rotateY( Math.PI / 2 ).rotateZ( Math.PI / 2 );
    sliceMeshYZ.renderOrder = -1;
    sliceMeshYZ.position.copy( CONSTANTS.VEC_ORIGIN );
    sliceMeshYZ.name = 'mesh_datacube__sagittal_' + g.name;


  	this.object = [ sliceMeshXZ, sliceMeshXY, sliceMeshYZ ];

  	// generate crosshair
  	this.crosshairGroup = new Object3D();
  	const crosshairGeometryLR = new BufferGeometry()
  	  .setFromPoints([
  	    new Vector3( -256, 0, 0 ), new Vector3( -4, 0, 0 ),
  	    new Vector3( 4, 0, 0 ), new Vector3( 256, 0, 0 )
  	  ]);
  	const crosshairMaterialLR = new LineBasicMaterial({
      color: 0x00ff00, transparent: false, depthTest : false
    });
    this.crosshairLR = new LineSegments( crosshairGeometryLR, crosshairMaterialLR );
    this.crosshairLR.renderOrder = CONSTANTS.RENDER_ORDER.DataCube;
    this.crosshairLR.layers.set( CONSTANTS.LAYER_SYS_CORONAL_9 );
    this.crosshairLR.layers.enable( CONSTANTS.LAYER_SYS_AXIAL_10 );
    this.crosshairGroup.add( this.crosshairLR );

    const crosshairGeometryPA = new BufferGeometry()
  	  .setFromPoints([
  	    new Vector3( 0, -256, 0 ), new Vector3( 0, -4, 0 ),
  	    new Vector3( 0, 4, 0 ), new Vector3( 0, 256, 0 )
  	  ]);
  	const crosshairMaterialPA = new LineBasicMaterial({
      color: 0x00ff00, transparent: false, depthTest : false
    });
    this.crosshairPA = new LineSegments( crosshairGeometryPA, crosshairMaterialPA );
    this.crosshairPA.renderOrder = CONSTANTS.RENDER_ORDER.DataCube;
    this.crosshairPA.layers.set( CONSTANTS.LAYER_SYS_AXIAL_10 );
    this.crosshairPA.layers.enable( CONSTANTS.LAYER_SYS_SAGITTAL_11 );
    this.crosshairGroup.add( this.crosshairPA );

    const crosshairGeometryIS = new BufferGeometry()
  	  .setFromPoints([
  	    new Vector3( 0, 0, -256 ), new Vector3( 0, 0, -4 ),
  	    new Vector3( 0, 0, 4 ), new Vector3( 0, 0, 256 )
  	  ]);
  	const crosshairMaterialIS = new LineBasicMaterial({
      color: 0x00ff00, transparent: false, depthTest : false
    });
    this.crosshairIS = new LineSegments( crosshairGeometryIS, crosshairMaterialIS );
    this.crosshairIS.renderOrder = CONSTANTS.RENDER_ORDER.DataCube;
    this.crosshairIS.layers.set( CONSTANTS.LAYER_SYS_CORONAL_9 );
    this.crosshairIS.layers.enable( CONSTANTS.LAYER_SYS_SAGITTAL_11 );
    this.crosshairGroup.add( this.crosshairIS );


    sliceMeshXY.userData.dispose = () => {
  	  sliceMaterial.dispose();
  	  sliceGeometryXY.dispose();
      this.dataTexture.dispose();
      this.crosshairIS.geometry.dispose();
      this.crosshairIS.material.dispose();
    };
    sliceMeshXY.userData.instance = this;
    this.sliceXY = sliceMeshXY;

    sliceMeshXZ.userData.dispose = () => {
  	  sliceMaterial.dispose();
  	  sliceGeometryXZ.dispose();
      this.dataTexture.dispose();
      this.crosshairPA.geometry.dispose();
      this.crosshairPA.material.dispose();
    };
    sliceMeshXZ.userData.instance = this;
    this.sliceXZ = sliceMeshXZ;

    sliceMeshYZ.userData.dispose = () => {
  	  sliceMaterial.dispose();
  	  sliceGeometryYZ.dispose();
      this.dataTexture.dispose();
      this.crosshairLR.geometry.dispose();
      this.crosshairLR.material.dispose();
    };
    sliceMeshYZ.userData.instance = this;
    this.sliceYZ = sliceMeshYZ;



    // set up events
    this._canvas.$el.addEventListener( "viewerApp.canvas.setSliceCrosshair", this._onSetSliceCrosshair );
  }

  dispose(){
    this._canvas.$el.removeEventListener( "viewerApp.canvas.setSliceCrosshair", this._onSetSliceCrosshair );
    this.crosshairLR.geometry.dispose();
    this.crosshairLR.material.dispose();
    this.crosshairPA.geometry.dispose();
    this.crosshairPA.material.dispose();
    this.crosshairIS.geometry.dispose();
    this.crosshairIS.material.dispose();
    this.sliceMaterial.dispose();
    this.sliceGeometryXY.dispose();
    this.sliceGeometryXZ.dispose();
  	this.sliceGeometryYZ.dispose();
    this.dataTexture.dispose();
  }

  get_track_data( track_name, reset_material ){}

  pre_render(){}

  setCrosshair({ x, y, z } = {}) {
    if( x === undefined ) {
      x = this._canvas.get_state( 'sagittal_depth', 0 );
    }
    // set sagittal
    if( x > 128 ) { x = 128; }
    if( x < -128 ) { x = -128; }
    this.sliceYZ.position.x = x;
    this.crosshairGroup.position.x = x;
    this._canvas.set_state( 'sagittal_depth', x );

    if( y === undefined ) {
      y = this._canvas.get_state( 'coronal_depth', 0 );
    }
    // set coronal
    if( y > 128 ) { y = 128; }
    if( y < -128 ) { y = -128; }
    this.sliceXZ.position.y = y;
    this.crosshairGroup.position.y = y;
    this._canvas.set_state( 'coronal_depth', y );

    if( z === undefined ) {
      z = this._canvas.get_state( 'axial_depth', 0 );
    }
    // set axial
    if( z > 128 ) { z = 128; }
    if( z < -128 ) { z = -128; }
    this.sliceXY.position.z = z;
    this.crosshairGroup.position.z = z;
    this._canvas.set_state( 'axial_depth', z );

    this._canvas.updateElectrodeVisibilityOnSideCanvas();

    // Calculate MNI305 positions
    const crosshairMNI = this._canvas.getSideCanvasCrosshairMNI305(
      this.crosshairGroup.position.clone() );
    const displayText = `${crosshairMNI.x.toFixed(1)}, ${crosshairMNI.y.toFixed(1)}, ${crosshairMNI.z.toFixed(1)}`

    this._canvas.setControllerValue({
      name : "Intersect MNI305",
      value: displayText
    });
    // Animate on next refresh
    this._canvas.start_animation( 0 );
  }

  showSlices( which ) {
    const planType = to_array( which );
    if( planType.length === 0 ) { return; }
    if( planType.includes( 'coronal' ) ) {
      this.sliceXZ.layers.enable( CONSTANTS.LAYER_SYS_MAIN_CAMERA_8 );
      this._canvas.set_state( 'coronal_overlay', true );
      this.coronalActive = true;
    }
    if( planType.includes( 'sagittal' ) ) {
      this.sliceYZ.layers.enable( CONSTANTS.LAYER_SYS_MAIN_CAMERA_8 );
      this._canvas.set_state( 'sagittal_overlay', true );
      this.sagittalActive = true;
    }
    if( planType.includes( 'axial' ) ) {
      this.sliceXY.layers.enable( CONSTANTS.LAYER_SYS_MAIN_CAMERA_8 );
      this._canvas.set_state( 'axial_overlay', true );
      this.axialActive = true;
    }
    // update crosshair to latest version
    this.setCrosshair();
    // this._canvas.start_animation( 0 );
  }

  hideSlices( which ) {
    const planType = to_array( which );
    if( planType.length === 0 ) { return; }
    if( planType.includes( 'coronal' ) ) {
      this.sliceXZ.layers.disable( CONSTANTS.LAYER_SYS_MAIN_CAMERA_8 );
      this._canvas.set_state( 'coronal_overlay', false );
      this.coronalActive = false;
    }
    if( planType.includes( 'sagittal' ) ) {
      this.sliceYZ.layers.disable( CONSTANTS.LAYER_SYS_MAIN_CAMERA_8 );
      this._canvas.set_state( 'sagittal_overlay', false );
      this.sagittalActive = false;
    }
    if( planType.includes( 'axial' ) ) {
      this.sliceXY.layers.disable( CONSTANTS.LAYER_SYS_MAIN_CAMERA_8 );
      this._canvas.set_state( 'axial_overlay', false );
      this.axialActive = false;
    }
    this._canvas.start_animation( 0 );
  }

  finish_init(){
    // Special, as m is a array of three planes
    // this.object = mesh = [ mesh_xz, sliceMeshXY, mesh_yz ];

    this._canvas.mesh.set( '_coronal_' + this.name, this.sliceXZ );
    this._canvas.mesh.set( '_axial_' + this.name, this.sliceXY );
    this._canvas.mesh.set( '_sagittal_' + this.name, this.sliceYZ );

    if( this.clickable ){
      this._canvas.add_clickable( '_coronal_' + this.name, this.sliceXZ );
      this._canvas.add_clickable( '_axial_' + this.name, this.sliceXY );
      this._canvas.add_clickable( '_sagittal_' + this.name, this.sliceYZ );
    }
    this.sliceXY.layers.set( CONSTANTS.LAYER_SYS_AXIAL_10 );
    this.sliceXZ.layers.set( CONSTANTS.LAYER_SYS_CORONAL_9 );
    this.sliceYZ.layers.set( CONSTANTS.LAYER_SYS_SAGITTAL_11 );

    // data cube must have groups. The group is directly added to scene,
    // regardlessly
    let gp = this.get_group_object();
    // Move gp to global scene as its center is always 0,0,0
    this._canvas.origin.remove( gp );
    gp.add( this.crosshairGroup );
    this._canvas.scene.add( gp );

    // set layer, add tp group
    this.object.forEach((plane) => {

      this.set_layer( [], plane );

      gp.add( plane );
      plane.userData.construct_params = this._params;
      plane.updateMatrixWorld();
    });

    this.register_object( ['slices'] );


    this.setCrosshair();
    // reset side camera positions
    // this.origin.position.set( -cube_center[0], -cube_center[1], -cube_center[2] );
    // this.reset_side_cameras( CONSTANTS.VEC_ORIGIN, Math.max(...cube_half_size) * 2 );


  }

  _onSetSliceCrosshair = ( event ) => {
    this.setCrosshair( event.detail );
  }

}


function gen_datacube(g, canvas){
  return( new DataCube(g, canvas) );
}

export { gen_datacube };
