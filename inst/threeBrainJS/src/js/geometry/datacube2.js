import { AbstractThreeBrainObject } from './abstract.js';
import { Vector3, Matrix4, Data3DTexture, NearestFilter, FloatType,
         RGBAFormat, RedFormat, UnsignedByteType, LinearFilter, UniformsUtils,
         RawShaderMaterial, BackSide, Mesh,
         BoxGeometry } from 'three';
import { CONSTANTS } from '../core/constants.js';
import { get_or_default } from '../utils.js';
import { VolumeRenderShader1 } from '../shaders/VolumeShader.js';
import { ConvexGeometry } from '../jsm/geometries/ConvexGeometry.js';


class DataCube2 extends AbstractThreeBrainObject {

  _filterDataContinuous( dataLB, dataUB, timeSlice ) {
    if( dataLB < this.__dataLB ) {
      dataLB = this.__dataLB;
    }
    if( dataUB > this.__dataUB ) {
      dataUB = this.__dataUB;
    }

    this._selectedDataValues.length = 2;
    this._selectedDataValues[ 0 ] = dataLB;
    this._selectedDataValues[ 1 ] = dataUB;

    // calculate voxelData -> colorKey transform
    let data2ColorKeySlope = 1, data2ColorKeyIntercept = 0;
    if( this.lutAutoRescale ) {
      data2ColorKeySlope = (this.lutMaxColorID - this.lutMinColorID) / (this.__dataUB - this.__dataLB);
      data2ColorKeyIntercept = (this.lutMinColorID + this.lutMaxColorID - data2ColorKeySlope * (this.__dataLB + this.__dataUB)) / 2.0;
    }

    if( typeof(timeSlice) === "number" ){
      this._timeSlice = Math.floor( timeSlice );
    }

    const mapAlpha = this.lut.mapAlpha;
    const voxelData = this.voxelData;
    const lutMap = this.lutMap;
    const singleChannel = this.colorFormat === RedFormat;
    const voxelColor = this.voxelColor;

    const voxelIndexOffset = this._timeSlice * this.nVoxels;
    let voxelIndex = 0,
        boundingMinX = Infinity, boundingMinY = Infinity, boundingMinZ = Infinity,
        boundingMaxX = -Infinity, boundingMaxY = -Infinity, boundingMaxZ = -Infinity;
    let withinFilters, voxelValue, voxelColorKey;

    if( singleChannel ) {

      // voxel alpha value
      let voxelA;

      for ( let z = 0; z < this.modelShape.z; z++ ) {
        for ( let y = 0; y < this.modelShape.y; y++ ) {
          for ( let x = 0; x < this.modelShape.x; x++, voxelIndex++ ) {
            // no need to round up as this has been done in the constructor
            voxelValue = voxelData[ voxelIndex + voxelIndexOffset ];
            if( voxelValue < dataLB || voxelValue > dataUB) {
              // hide this voxel as it's beyong threshold
              voxelColor[ voxelIndex ] = 0;
            } else {
              voxelColorKey = Math.floor(voxelValue * data2ColorKeySlope + data2ColorKeyIntercept);
              voxelA = lutMap[ voxelColorKey ];

              // NOTICE: we expect consecutive integer color keys!
              if( voxelA === undefined ) {
                // This shouldn't happen if color keys are consecutive
                voxelColor[ voxelIndex ] = 0;
              } else {

                voxelColor[ voxelIndex ] = voxelA.R;

                // set bounding box
                if( boundingMinX > x ) { boundingMinX = x; }
                if( boundingMinY > y ) { boundingMinY = y; }
                if( boundingMinZ > z ) { boundingMinZ = z; }
                if( boundingMaxX < x ) { boundingMaxX = x; }
                if( boundingMaxY < y ) { boundingMaxY = y; }
                if( boundingMaxZ < z ) { boundingMaxZ = z; }

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
            if( voxelValue < dataLB || voxelValue > dataUB) {
              // hide this voxel as it's beyong threshold
              voxelColor[ voxelIndex * 4 + 3 ] = 0;
            } else {
              voxelColorKey = Math.round(voxelValue * data2ColorKeySlope + data2ColorKeyIntercept);
              voxelRGBA = lutMap[ voxelColorKey ];

              // NOTICE: we expect consecutive integer color keys!
              if( voxelRGBA === undefined ) {
                // This shouldn't happen if color keys are consecutive
                voxelColor[ voxelIndex * 4 + 3 ] = 0;
              } else {

                voxelColor[ voxelIndex * 4 ] = voxelRGBA.R;
                voxelColor[ voxelIndex * 4 + 1 ] = voxelRGBA.G;
                voxelColor[ voxelIndex * 4 + 2 ] = voxelRGBA.B;

                if( mapAlpha ) {
                  voxelColor[ voxelIndex * 4 + 3 ] = voxelRGBA.A;
                } else {
                  voxelColor[ voxelIndex * 4 + 3 ] = 255;
                }

                // set bounding box
                if( boundingMinX > x ) { boundingMinX = x; }
                if( boundingMinY > y ) { boundingMinY = y; }
                if( boundingMinZ > z ) { boundingMinZ = z; }
                if( boundingMaxX < x ) { boundingMaxX = x; }
                if( boundingMaxY < y ) { boundingMaxY = y; }
                if( boundingMaxZ < z ) { boundingMaxZ = z; }

              }
            }

          }
        }
      }

    }

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

    this.colorTexture.needsUpdate = true;
  }
  _filterDataDiscrete( selectedDataValues, timeSlice ) {

    if( Array.isArray( selectedDataValues ) ){

      // discrete color keys
      this._selectedDataValues.length = 0;
      let dataValue;

      for( let jj = 0; jj < selectedDataValues.length; jj++ ) {
        dataValue = selectedDataValues[ jj ];
        if( dataValue <= this.lutMinColorID ) {
          this._selectedDataValues.length = 0;
          break;
        }
        this._selectedDataValues[ dataValue ] = true;
      }
      if( this._selectedDataValues.length === 0 ) {
        for( dataValue = this.lutMinColorID + 1;
              dataValue < this.lutMaxColorID; dataValue++ ) {
          this._selectedDataValues[ dataValue ] = true;
        }
      }
    }

    if( typeof(timeSlice) === "number" ){
      this._timeSlice = Math.floor( timeSlice );
    }

    const mapAlpha = this.lut.mapAlpha;
    const voxelData = this.voxelData;
    const lutMap = this.lutMap;
    const singleChannel = this.colorFormat === RedFormat;
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
            if( voxelValue <= this.lutMinColorID ) {
              // special: always hide this voxel
              voxelColor[ voxelIndex ] = 0;
            } else {

              voxelA = lutMap[ voxelValue ];
              withinFilters = this._selectedDataValues[ voxelValue ];

              if( voxelA !== undefined && withinFilters ) {
                // this voxel should be displayed
                voxelColor[ voxelIndex ] = voxelA.R;

                // set bounding box
                if( boundingMinX > x ) { boundingMinX = x; }
                if( boundingMinY > y ) { boundingMinY = y; }
                if( boundingMinZ > z ) { boundingMinZ = z; }
                if( boundingMaxX < x ) { boundingMaxX = x; }
                if( boundingMaxY < y ) { boundingMaxY = y; }
                if( boundingMaxZ < z ) { boundingMaxZ = z; }
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
            if( voxelValue <= this.lutMinColorID ) {
              // special: always hide this voxel
              voxelColor[ voxelIndex * 4 + 3 ] = 0;
            } else {

              voxelRGBA = lutMap[ voxelValue ];
              withinFilters = this._selectedDataValues[ voxelValue ];

              if( voxelRGBA !== undefined && withinFilters ) {
                // this voxel should be displayed
                voxelColor[ voxelIndex * 4 ] = voxelRGBA.R;
                voxelColor[ voxelIndex * 4 + 1 ] = voxelRGBA.G;
                voxelColor[ voxelIndex * 4 + 2 ] = voxelRGBA.B;

                if( mapAlpha ) {
                  voxelColor[ voxelIndex * 4 + 3 ] = voxelRGBA.A;
                } else {
                  voxelColor[ voxelIndex * 4 + 3 ] = 255;
                }
                // set bounding box
                if( boundingMinX > x ) { boundingMinX = x; }
                if( boundingMinY > y ) { boundingMinY = y; }
                if( boundingMinZ > z ) { boundingMinZ = z; }
                if( boundingMaxX < x ) { boundingMaxX = x; }
                if( boundingMaxY < y ) { boundingMaxY = y; }
                if( boundingMaxZ < z ) { boundingMaxZ = z; }
              } else {
                voxelColor[ voxelIndex * 4 + 3 ] = 0;
              }

            }

          }
        }
      }

    }

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
    this.colorTexture.needsUpdate = true;

  }

  updatePalette( selectedDataValues, timeSlice ){
    if( !this._canvas.has_webgl2 ){ return; }

    if( this.isDataContinuous ) {

      if( !Array.isArray( selectedDataValues ) ) {
        selectedDataValues = this._selectedDataValues;
      }
      let lb, ub;
      if( selectedDataValues.length >= 2 ) {
        /*lb = selectedDataValues[ 0 ];
        ub = selectedDataValues[ 1 ];*/
        lb = Math.min(...selectedDataValues);
        ub = Math.max(...selectedDataValues);
      } else {
        lb = this.lutMinColorID;
        ub = this.lutMaxColorID;
      }
      this._filterDataContinuous( lb, ub, timeSlice );

    } else {

      if( !Array.isArray( selectedDataValues ) ) {
        selectedDataValues = this._selectedDataValues;
      }
      this._filterDataDiscrete( selectedDataValues, timeSlice );

    }
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
    this._selectedDataValues = [];
    this._timeSlice = 0;
    // transform before applying trans_mat specified by `g`
    // only useful for VolumeCube2
    this._transform = new Matrix4().set(1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1);

    if( Array.isArray(g.trans_mat) && g.trans_mat.length === 16 ) {
      this._transform.set(...g.trans_mat);
    } else {
      this._transform.set(1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1);
    }

    let mesh;

    // Need to check if this is VolumeCube2
    if( g.isVolumeCube2 ) {
      const niftiData = canvas.get_data("volume_data", g.name, g.group.group_name);
      this.voxelData = niftiData.image;
      // width, height, depth of the model (not in world)
      this.modelShape = new Vector3().copy( niftiData.shape );

      // Make sure to register the initial transform matrix (from IJK to RAS)
      // original g.trans_mat is nifti RAS to tkrRAS
      // this._transform = g.trans_mat * niftiData.model2RAS
      //   -> new transform from model center to tkrRAS
      if( niftiData.model2tkrRAS && niftiData.model2tkrRAS.isMatrix4 ) {
        // special:: this is MGH data and transfor is embedded
        this._transform.copy( niftiData.model2tkrRAS );
      } else {
        this._transform.multiply( niftiData.model2RAS );
      }
      this._originalData = niftiData;
    } else {
      // g.trans_mat is from model to tkrRAS
      this.voxelData = canvas.get_data('datacube_value_'+g.name, g.name, g.group.group_name);
      // width, height, depth of the model (not in world)
      this.modelShape = new Vector3().fromArray(
        canvas.get_data('datacube_dim_'+g.name, g.name, g.group.group_name)
      );
    }
    this.nVoxels = this.modelShape.x * this.modelShape.y * this.modelShape.z;
    // The color map might be specified separately
    this.lut = g.color_map || canvas.global_data('__global_data__.VolumeColorLUT');
    this.lutMap = this.lut.map;
    this.lutMaxColorID = this.lut.mapMaxColorID;
    this.lutMinColorID = this.lut.mapMinColorID;
    this.lutAutoRescale = this.lut.colorIDAutoRescale === true;
    this.isDataContinuous = this.lut.mapDataType === "continuous";
    this.__dataLB = this.lutMinColorID;
    this.__dataUB = this.lutMaxColorID;

    // Generate 3D texture, to do so, we need to customize shaders
    if( g.color_format === "RedFormat" ) {
      this.colorFormat = RedFormat;
      this.nColorChannels = 1;
      this.voxelColor = new Uint8Array( this.nVoxels );
    } else {
      this.colorFormat = RGBAFormat;
      this.nColorChannels = 4;
      this.voxelColor = new Uint8Array( this.nVoxels * 4 );
    }

    // Change voxelData so all elements are integers (non-negative)
    if( this.isDataContinuous ) {
      if( this.lutAutoRescale ) {

        this.__dataLB = Infinity;
        this.__dataUB = -Infinity;
        this.voxelData.forEach((vd) => {
          if( this.__dataLB > vd ) { this.__dataLB = vd; }
          if( this.__dataUB < vd ) { this.__dataUB = vd; }
        })

        if( this.__dataLB === Infinity ) {
          this.__dataLB = this.lutMinColorID;
        }
        if( this.__dataUB === -Infinity ) {
          this.__dataUB = this.lutMaxColorID;
        }

      }

    } else {

      this.voxelData.forEach((vd, ii) => {
        if( vd < this.lutMinColorID || vd > this.lutMaxColorID ) {
          this.voxelData[ ii ] = this.lutMinColorID;
        } else if( !Number.isInteger(vd) ) {
          this.voxelData[ ii ] =  Math.round( vd );
        }
      })
    }

    // Color texture - used to render colors
    this.colorTexture = new Data3DTexture(
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

    const geometry = new BoxGeometry(
      this.modelShape.x,
      this.modelShape.y,
      this.modelShape.z
    );

    mesh = new Mesh( geometry, material );
    mesh.name = 'mesh_datacube_' + g.name;

    mesh.position.fromArray( g.position );
    // TODO: need to check how threejs handle texture 3D to know why the s

    mesh.userData.pre_render = () => { return( this.pre_render() ); };
    mesh.userData.dispose = () => { this.dispose(); };

    this._mesh = mesh;
    this.object = mesh;

    // initialize voxelColor
    this.updatePalette();
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

    const transformDisabled = this._params.disable_trans_mat;

    // temporarily disable transform matrix
    this._params.disable_trans_mat = true;

    // Finalize setups
    super.finish_init();

    // override transform
    this._params.disable_trans_mat = transformDisabled;
    this.object.userData.trans_mat = this._transform;

    if( !transformDisabled ) {

      this.object.applyMatrix4( this._transform );
      this.object.updateMatrixWorld();

    }

    // data cube 2 must have groups and group parent is scene
    // let gp = this.get_group_object();
    // Move gp to global scene as its center is always 0,0,0
    // this._canvas.origin.remove( gp );
    // this._canvas.scene.add( gp );

    this.register_object( ['atlases'] );

  }

  pre_render() {
    super.pre_render();
  }

}


function gen_datacube2(g, canvas){
  return( new DataCube2(g, canvas) );
}



export { gen_datacube2 };

