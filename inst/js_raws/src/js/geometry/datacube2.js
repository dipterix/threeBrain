import { AbstractThreeBrainObject } from './abstract.js';
import { Vector3, Matrix4, DataTexture3D, NearestFilter, FloatType,
         RGBAFormat, AlphaFormat, UnsignedByteType, LinearFilter, UniformsUtils,
         RawShaderMaterial, BackSide, SphereBufferGeometry, Mesh,
         BoxBufferGeometry } from '../../build/three.module.js';
import { CONSTANTS } from '../constants.js';
import { get_or_default } from '../utils.js';
import { VolumeRenderShader1 } from '../shaders/VolumeShader.js';
import { ConvexGeometry } from '../jsm/geometries/ConvexGeometry.js';


class DataCube2 extends AbstractThreeBrainObject {

  updatePalette( selectedColorKeys, timeSlice, computeBoundingBox = false ){

    if( !this._canvas.has_webgl2 ){ return; }

    if(
      selectedColorKeys === undefined &&
      timeSlice === undefined &&
      !computeBoundingBox
    ) {
      return;
    }

    // WARNING, no check on selectedColorKeys to speed up
    // I assume selectedColorKeys is always array of non-negative integers
    this.__thresholdMin = Infinity;
    if( selectedColorKeys !== undefined ){
      this._selectedColorKeys.length = 0;
      for( let jj = 0; jj < selectedColorKeys.length; jj++ ) {
        const color_id = selectedColorKeys[ jj ];
        if( this.__thresholdMin > color_id ) {
          this.__thresholdMin = color_id;
        }
        if( color_id == 0 ) {
          this._selectedColorKeys.length = 0;
          break;
        }
        this._selectedColorKeys[ color_id ] = true;
      }
      computeBoundingBox = true;
    }
    if( typeof(timeSlice) === "number" ){
      this._timeSlice = Math.floor( timeSlice );
    }

    const mapAlpha = this.lut.mapAlpha;
    const includeAllColors = this._selectedColorKeys.length === 0;
    const voxelData = this.voxelData;
    const lutMap = this.lutMap;
    const singleChannel = this.colorFormat === AlphaFormat;
    const voxelColor = this.voxelColor;

    const voxelIndexOffset = this._timeSlice * this.nVoxels;
    let voxelIndex = 0,
        boundingMinX = Infinity, boundingMinY = Infinity, boundingMinZ = Infinity,
        boundingMaxX = -Infinity, boundingMaxY = -Infinity, boundingMaxZ = -Infinity;
    let withinFilters, voxelValue;

    if( singleChannel ) {

      // voxel alpha value
      let voxelA;

      for ( let z = 0; z < this.modelShape.z; z++ ) {
        for ( let y = 0; y < this.modelShape.y; y++ ) {
          for ( let x = 0; x < this.modelShape.x; x++, voxelIndex++ ) {

            // no need to round up as this has been done in the constructor
            voxelValue = voxelData[ voxelIndex + voxelIndexOffset ];
            if( voxelValue === 0 ) {
              // special: always hide this voxel
              voxelColor[ voxelIndex ] = 0;
            } else {

              voxelA = lutMap[ voxelValue ];
              withinFilters = includeAllColors || this._selectedColorKeys[ voxelValue ];

              if( voxelA !== undefined && withinFilters ) {
                // this voxel should be displayed
                voxelColor[ voxelIndex ] = voxelA.R;

                if( computeBoundingBox ){
                  // set bounding box
                  if( boundingMinX > x ) { boundingMinX = x; }
                  if( boundingMinY > y ) { boundingMinY = y; }
                  if( boundingMinZ > z ) { boundingMinZ = z; }
                  if( boundingMaxX < x ) { boundingMaxX = x; }
                  if( boundingMaxY < y ) { boundingMaxY = y; }
                  if( boundingMaxZ < z ) { boundingMaxZ = z; }
                }
              } else {
                voxelColor[ voxelIndex ] = 0;
              }

            }

          }
        }
      }
    } else {

      // voxel RGBA value
      let voxelRGBA;
      for ( let z = 0; z < this.modelShape.z; z++ ) {
        for ( let y = 0; y < this.modelShape.y; y++ ) {
          for ( let x = 0; x < this.modelShape.x; x++, voxelIndex++ ) {

            // no need to round up as this has been done in the constructor
            voxelValue = voxelData[ voxelIndex + voxelIndexOffset ];
            if( voxelValue === 0 ) {
              // special: always hide this voxel
              voxelColor[ voxelIndex * 4 + 3 ] = 0;
            } else {

              voxelRGBA = lutMap[ voxelValue ];
              withinFilters = includeAllColors || this._selectedColorKeys[ voxelValue ];

              if( voxelA !== undefined && withinFilters ) {
                // this voxel should be displayed
                voxelColor[ voxelIndex * 4 ] = voxelRGBA.R;
                voxelColor[ voxelIndex * 4 + 1 ] = voxelRGBA.G;
                voxelColor[ voxelIndex * 4 + 2 ] = voxelRGBA.B;

                if( mapAlpha ) {
                  voxelColor[ voxelIndex * 4 + 3 ] = voxelRGBA.A;
                } else {
                  voxelColor[ voxelIndex * 4 + 3 ] = 255;
                }
                if( computeBoundingBox ){
                  // set bounding box
                  if( boundingMinX > x ) { boundingMinX = x; }
                  if( boundingMinY > y ) { boundingMinY = y; }
                  if( boundingMinZ > z ) { boundingMinZ = z; }
                  if( boundingMaxX < x ) { boundingMaxX = x; }
                  if( boundingMaxY < y ) { boundingMaxY = y; }
                  if( boundingMaxZ < z ) { boundingMaxZ = z; }
                }
              } else {
                voxelColor[ voxelIndex * 4 + 3 ] = 0;
              }

            }

          }
        }
      }

    }

    if( computeBoundingBox ){
      this.object.material.uniforms.bounding.value = Math.min(
        Math.max(
          boundingMaxX / this.modelShape.x - 0.5,
          boundingMaxY / this.modelShape.y - 0.5,
          boundingMaxZ / this.modelShape.z - 0.5,
          0.5 - boundingMinX / this.modelShape.x,
          0.5 - boundingMinY / this.modelShape.y,
          0.5 - boundingMinZ / this.modelShape.z,
          0.0
        ),
        0.5
      );
      this.object.material.uniformsNeedUpdate = true;
    }

    this.colorTexture.needsUpdate = true;

  }

  constructor(g, canvas){


    super( g, canvas );

    if( !canvas.has_webgl2 ){
      throw 'DataCube2, i.e. voxel cube must need WebGL2 support';
    }

    // this._params is g
    // this.name = this._params.name;
    // this.group_name = this._params.group.group_name;

    this.type = 'DataCube2';
    this.isDataCube2 = true;
    this._display_mode = "hidden";
    this.__thresholdMin = Infinity;
    this._selectedColorKeys = [];
    this._timeSlice = 0;

    let mesh;

    // Need to check if this is nifticube
    if( g.isNiftiCube ) {
      const niftiData = canvas.get_data("nifti_data", g.name, g.group.group_name);
      this.voxelData = niftiData.image;
      // width, height, depth of the model (not in world)
      this.modelShape = new Vector3().fromArray( niftiData.shape );

      // Make sure to register the initial transform matrix (from IJK to RAS)
      if( Array.isArray(g.trans_mat) && g.trans_mat.length === 16 ) {
        const m = new Matrix4().set(...g.trans_mat)
                    .multiply( niftiData.model2RAS );
        g.trans_mat = m.toArray();
      } else {
        g.trans_mat = niftiData.model2RAS.toArray();
      }
    } else {
      this.voxelData = canvas.get_data('datacube_value_'+g.name, g.name, g.group.group_name);
      // width, height, depth of the model (not in world)
      this.modelShape = new Vector3().fromArray(
        canvas.get_data('datacube_dim_'+g.name, g.name, g.group.group_name)
      );
    }
    // Change voxelData so all elements are integers (non-negative)
    this.voxelData.forEach( (el, ii) => {
      if( el > this.lutMaxColorID || el < 0 ){
        this.voxelData[ ii ] = 0;
        return;
      }
      if ( !Number.isInteger( el ) ) {
        this.voxelData[ ii ] = Math.round( el );
      }
    });
    this.nVoxels = this.modelShape.x * this.modelShape.y * this.modelShape.z;

    this.lut = canvas.global_data('__global_data__.VolumeColorLUT');
    this.lutMap = this.lut.map;
    this.lutMaxColorID = this.lut.mapMaxColorID;

    // Generate 3D texture, to do so, we need to customize shaders
    if( g.color_format === "AlphaFormat" ) {
      this.colorFormat = AlphaFormat;
      this.nColorChannels = 1;
      this.voxelColor = new Uint8Array( this.nVoxels );
    } else {
      this.colorFormat = RGBAFormat;
      this.nColorChannels = 4;
      this.voxelColor = new Uint8Array( this.nVoxels * 4 );
    }

    // Color texture - used to render colors
    this.colorTexture = new DataTexture3D(
      this.voxelColor, this.modelShape.x, this.modelShape.y, this.modelShape.z
    );

    this.colorTexture.minFilter = NearestFilter;
    this.colorTexture.magFilter = NearestFilter;
    this.colorTexture.format = this.colorFormat;
    this.colorTexture.type = UnsignedByteType;
    this.colorTexture.unpackAlignment = 1;

    this.colorTexture.needsUpdate = true;

    // Material
    const shader = VolumeRenderShader1;


    const uniforms = UniformsUtils.clone( shader.uniforms );
    this._uniforms = uniforms;
    // uniforms.map.value = data_texture;
    uniforms.cmap.value = this.colorTexture;
    uniforms.colorChannels.value = this.nColorChannels;
    uniforms.alpha.value = -1.0;
    uniforms.scale_inv.value.set(1 / this.modelShape.x, 1 / this.modelShape.y, 1 / this.modelShape.z);
    uniforms.bounding.value = 0.5;

    let material = new RawShaderMaterial( {
      uniforms: uniforms,
      vertexShader: shader.vertexShader,
      fragmentShader: shader.fragmentShader,
      side: BackSide, // The volume shader uses the backface as its "reference point"
      transparent : true
    } );

    const geometry = new BoxBufferGeometry(
      this.modelShape.x,
      this.modelShape.y,
      this.modelShape.z
    );

    mesh = new Mesh( geometry, material );
    mesh.name = 'mesh_datacube_' + g.name;

    mesh.position.fromArray( g.position );
    // TODO: need to check how threejs handle texture 3D to know why the s

    mesh.userData.pre_render = ( results ) => { return( this.pre_render( results ) ); };
    mesh.userData.dispose = () => { this.dispose(); };

    this._mesh = mesh;
    this.object = mesh;

    // initialize voxelColor
    this.updatePalette( [] );
  }

  dispose(){
    if( this._canvas.has_webgl2 && this._mesh ){
      this._mesh.material.dispose();
      this._mesh.geometry.dispose();
      // this._data_texture.dispose();
      this.colorTexture.dispose();

      // this._map_data = undefined;
      // this.voxelData = undefined;
    }
  }

  get_track_data( track_name, reset_material ){}

  finish_init(){
    // this.object

    // Finalize setups
    super.finish_init();

    // data cube 2 must have groups and group parent is scene
    // let gp = this.get_group_object();
    // Move gp to global scene as its center is always 0,0,0
    // this._canvas.origin.remove( gp );
    // this._canvas.scene.add( gp );

    this.register_object( ['atlases'] );

  }

/*
  pre_render( results ) {
    if(!this.object) { return; }
    const camera = this._canvas.main_camera;
    this._uniforms.camera_center.value.set(
      (camera.right + camera.left) / (camera.left - camera.right),
      (camera.top + camera.bottom) / (camera.bottom - camera.top)
    );
    this._mesh.material.uniformsNeedUpdate = true;
  }
  */


}


function gen_datacube2(g, canvas){
  return( new DataCube2(g, canvas) );
}



export { gen_datacube2 };

