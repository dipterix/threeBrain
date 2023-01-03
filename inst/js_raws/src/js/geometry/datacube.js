import { AbstractThreeBrainObject } from './abstract.js';
import { CONSTANTS } from '../constants.js';
import { to_array, get_or_default } from '../utils.js';
import { LineBasicMaterial, BufferGeometry, DataTexture3D, RedFormat, LinearFilter,
         UnsignedByteType, RawShaderMaterial, Vector3, DoubleSide, UniformsUtils,
         PlaneBufferGeometry, Mesh, Line } from '../../build/three.module.js';
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

    // get cube (volume) data
    this.cubeData = new Uint8Array(canvas.get_data('datacube_value_'+g.name, g.name, g.group.group_name));
    this.cubeShape = new Vector3().fromArray( canvas.get_data('datacube_dim_'+g.name, g.name, g.group.group_name) );
    this.dataTexture = new DataTexture3D(
      this.cubeData, this.cubeShape.x, this.cubeShape.y, this.cubeShape.z
    );
    this.dataTexture.minFilter = LinearFilter;
    this.dataTexture.magFilter = LinearFilter;
    this.dataTexture.format = RedFormat;
    this.dataTexture.type = UnsignedByteType;
    this.dataTexture.unpackAlignment = 1;
    this.dataTexture.needsUpdate = true;

    // Generate shader
    this._uniforms = UniformsUtils.clone( SliceShader.uniforms );
    this._uniforms.map.value = this.dataTexture;
    this._uniforms.mapShape.value.copy( this.cubeShape );
    // TODO: set this._uniforms.world2IJK
    const subjectData = this._canvas.shared_data.get( this.subject_code );
    if( subjectData && typeof subjectData === "object" && subjectData.matrices ) {
      this._uniforms.world2IJK.value.copy( subjectData.matrices.Torig ).invert();
    }
    this._uniforms.world2IJK.value.set(1,0,0,128, 0,1,0,128, 0,0,1,128, 0,0,0,1);


    const sliceMaterial = new RawShaderMaterial( {
      uniforms: this._uniforms,
      vertexShader: SliceShader.vertexShader,
      fragmentShader: SliceShader.fragmentShader,
      side: DoubleSide,
      transparent : false,
      depthWrite: true
    } );
    this.sliceMaterial = sliceMaterial;
    const sliceGeometryXY = new PlaneBufferGeometry( 256, 256 );
    const sliceMeshXY = new Mesh( sliceGeometryXY, sliceMaterial );
    sliceMeshXY.renderOrder = -1;
    sliceMeshXY.position.copy( CONSTANTS.VEC_ORIGIN );
    sliceMeshXY.name = 'mesh_datacube__axial_' + g.name;

    const sliceGeometryXZ = new PlaneBufferGeometry( 256, 256 );
    const sliceMeshXZ = new Mesh( sliceGeometryXZ, sliceMaterial );
    sliceMeshXZ.rotateX( Math.PI / 2 );
    sliceMeshXZ.renderOrder = -1;
    sliceMeshXZ.position.copy( CONSTANTS.VEC_ORIGIN );
    sliceMeshXZ.name = 'mesh_datacube__coronal_' + g.name;

    const sliceGeometryYZ = new PlaneBufferGeometry( 256, 256 );
    const sliceMeshYZ = new Mesh( sliceGeometryYZ, sliceMaterial );
    sliceMeshYZ.rotateY( Math.PI / 2 ).rotateZ( Math.PI / 2 );
    sliceMeshYZ.renderOrder = -1;
    sliceMeshYZ.position.copy( CONSTANTS.VEC_ORIGIN );
    sliceMeshYZ.name = 'mesh_datacube__sagittal_' + g.name;

  	this.object = [ sliceMeshXZ, sliceMeshXY, sliceMeshYZ ];

  	// generate diagonal line of the plane which will appear as crosshair
    const crosshairGeometry = new BufferGeometry();
    const crosshairMaterial = new LineBasicMaterial({ color: 0x00ff00, transparent: true });
    crosshairGeometry.depthTest = false;
    crosshairGeometry.setFromPoints( [ new Vector3( -128, -128, 0 ), new Vector3( 128, 128, 0 ) ] );
    this.crosshairGeometry = crosshairGeometry;
    this.crosshairMaterial = crosshairMaterial;

    const crosshairXZ = new Line( crosshairGeometry, crosshairMaterial ),
          crosshairXY = new Line( crosshairGeometry, crosshairMaterial ),
          crosshairYZ = new Line( crosshairGeometry, crosshairMaterial );
    crosshairXZ.renderOrder = CONSTANTS.RENDER_ORDER.DataCube;
    crosshairXY.renderOrder = CONSTANTS.RENDER_ORDER.DataCube;
    crosshairYZ.renderOrder = CONSTANTS.RENDER_ORDER.DataCube;
    crosshairXZ.layers.set( CONSTANTS.LAYER_SYS_AXIAL_10 );
    crosshairXZ.layers.enable( CONSTANTS.LAYER_SYS_SAGITTAL_11 );
    crosshairXY.layers.set( CONSTANTS.LAYER_SYS_CORONAL_9 );
    crosshairXY.layers.enable( CONSTANTS.LAYER_SYS_SAGITTAL_11 );
    crosshairYZ.layers.set( CONSTANTS.LAYER_SYS_CORONAL_9 );
    crosshairYZ.layers.enable( CONSTANTS.LAYER_SYS_AXIAL_10 );
    sliceMeshXZ.add( crosshairXZ );
    sliceMeshXY.add( crosshairXY );
    sliceMeshYZ.add( crosshairYZ );

    sliceMeshXY.userData.dispose = () => {
  	  sliceMaterial.dispose();
  	  sliceGeometryXY.dispose();
      crosshairGeometry.dispose();
      crosshairMaterial.dispose();
      this.dataTexture.dispose();
    };
    sliceMeshXY.userData.instance = this;
    this.sliceXY = sliceMeshXY;

    sliceMeshXZ.userData.dispose = () => {
  	  sliceMaterial.dispose();
  	  sliceGeometryXZ.dispose();
      crosshairGeometry.dispose();
      crosshairMaterial.dispose();
      this.dataTexture.dispose();
    };
    sliceMeshXZ.userData.instance = this;
    this.sliceXZ = sliceMeshXZ;

    sliceMeshYZ.userData.dispose = () => {
  	  sliceMaterial.dispose();
  	  sliceGeometryYZ.dispose();
      crosshairGeometry.dispose();
      crosshairMaterial.dispose();
      this.dataTexture.dispose();
    };
    sliceMeshYZ.userData.instance = this;
    this.sliceYZ = sliceMeshYZ;
  }

  dispose(){
    this.crosshairMaterial.dispose();
    this.crosshairGeometry.dispose();
    this.sliceMaterial.dispose();
    this.sliceGeometryXY.dispose();
    this.sliceGeometryXZ.dispose();
  	this.sliceGeometryYZ.dispose();
    this.dataTexture.dispose();
  }

  get_track_data( track_name, reset_material ){}

  pre_render( results ){}

  setCrosshair({ x, y, z } = {}) {
    let changed = false;
    if( x !== undefined ) {
      // set sagittal
      if( x > 128 ) { x = 128; }
      if( x < -128 ) { x = -128; }
      this.sliceYZ.position.x = x;
      this._canvas.set_state( 'sagittal_depth', x );
      this._canvas.set_state( 'sagittal_posy', x );
      changed = true;
    }
    if( y !== undefined ) {
      // set coronal
      if( y > 128 ) { y = 128; }
      if( y < -128 ) { y = -128; }
      this.sliceXZ.position.y = y;
      this._canvas.set_state( 'coronal_depth', y );
      this._canvas.set_state( 'coronal_posy', y );
      changed = true;
    }
    if( z !== undefined ) {
      // set axial
      if( z > 128 ) { z = 128; }
      if( z < -128 ) { z = -128; }
      this.sliceXY.position.z = z;
      this._canvas.set_state( 'axial_depth', z );
      this._canvas.set_state( 'axial_posy', z );
      changed = true;
    }
    if( changed ) {
      this._canvas.trim_electrodes();
      // Animate on next refresh
      this._canvas.start_animation( 0 );
    }
  }

  showPlane( which ) {
    const planType = to_array( which );
    if( planType.length === 0 ) { return; }
    if( planType.includes( 'coronal' ) ) {
      this.sliceXZ.layers.enable( CONSTANTS.LAYER_SYS_MAIN_CAMERA_8 );
      this._canvas.set_state( 'coronal_overlay', true );
    }
    if( planType.includes( 'sagittal' ) ) {
      this.sliceYZ.layers.enable( CONSTANTS.LAYER_SYS_MAIN_CAMERA_8 );
      this._canvas.set_state( 'sagittal_overlay', true );
    }
    if( planType.includes( 'axial' ) ) {
      this.sliceXY.layers.enable( CONSTANTS.LAYER_SYS_MAIN_CAMERA_8 );
      this._canvas.set_state( 'axial_overlay', true );
    }
    this._canvas.start_animation( 0 );
  }

  hidePlane( which ) {
    const planType = to_array( which );
    if( planType.length === 0 ) { return; }
    if( planType.includes( 'coronal' ) ) {
      this.sliceXZ.layers.disable( CONSTANTS.LAYER_SYS_MAIN_CAMERA_8 );
      this._canvas.set_state( 'coronal_overlay', false );
    }
    if( planType.includes( 'sagittal' ) ) {
      this.sliceYZ.layers.disable( CONSTANTS.LAYER_SYS_MAIN_CAMERA_8 );
      this._canvas.set_state( 'sagittal_overlay', false );
    }
    if( planType.includes( 'axial' ) ) {
      this.sliceXY.layers.disable( CONSTANTS.LAYER_SYS_MAIN_CAMERA_8 );
      this._canvas.set_state( 'axial_overlay', false );
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

    // data cube must have groups. The group is directly added to scene,
    // regardlessly
    let gp = this.get_group_object();
    // Move gp to global scene as its center is always 0,0,0
    this._canvas.origin.remove( gp );
    this._canvas.scene.add( gp );

    // set layer, add tp group
    this.object.forEach((plane) => {

      this.set_layer( [], plane );

      gp.add( plane );
      plane.userData.construct_params = this._params;
      plane.updateMatrixWorld();
    });

    this.register_object( ['slices'] );

    // Add handlers to set plane location when an electrode is clicked
    this._canvas.add_mouse_callback(
      (evt) => {
        return({
          pass  : evt.action === 'mousedown' && evt.event.button === 2, // right-click, but only when mouse down (mouse drag won't affect)
          type  : 'clickable'
        });
      },
      ( res, evt ) => {
        const obj = res.target_object;
        if( obj && obj.isMesh && obj.userData.construct_params ){
          const pos = obj.getWorldPosition( gp.position.clone() );
          this.setCrosshair( pos );
        }
      },
      'side_viewer_depth'
    );


    // reset side camera positions
    // this.origin.position.set( -cube_center[0], -cube_center[1], -cube_center[2] );
    // this.reset_side_cameras( CONSTANTS.VEC_ORIGIN, Math.max(...cube_half_size) * 2 );

  }

}


function gen_datacube(g, canvas){
  return( new DataCube(g, canvas) );
}

export { gen_datacube };
