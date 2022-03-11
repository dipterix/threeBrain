import { AbstractThreeBrainObject } from './abstract.js';
import { Vector3, DataTexture3D, NearestFilter, FloatType, RedFormat,
         RGBAFormat, UnsignedByteType, LinearFilter, RGBFormat, UniformsUtils,
         RawShaderMaterial, BackSide, SphereBufferGeometry, Mesh,
         BoxBufferGeometry } from '../../build/three.module.js';
import { CONSTANTS } from '../constants.js';
import { get_or_default } from '../utils.js';
import { VolumeRenderShader1 } from '../shaders/VolumeShader.js';
import { ConvexGeometry } from '../jsm/geometries/ConvexGeometry.js';


class DataCube2 extends AbstractThreeBrainObject {

  // must be after _map_data _map_color are set
  _compute_normals() {

    let i = 0, ii = 0, jj,
        nml = new Vector3(), u = new Vector3(),
        tmp, x, y, z, a, b, c;
    const zdim = this._cube_dim[0],
          ydim = this._cube_dim[1],
          xdim = this._cube_dim[2],
          pad = 1;

    for ( z = pad; z < zdim - pad; z += 1 ) {
      for ( y = pad; y < ydim - pad; y += 1 ) {
        for ( x = pad; x < xdim - pad; x += 1 ) {

          ii = x + xdim * ( y + ydim * z );

          if( this._map_color[ 4 * ii + 3 ] !== 0){
            jj = ii + this._value_index_skip * this._voxel_length;
            i = this._cube_values[ jj ];

            nml.set( 0, 0, 0 );

            for( a = -pad; a <= pad; a+=1 ){
              for( b = -pad; b <= pad; b+=1 ){
                for( c = -pad; c <= pad; c+=1 ){

                  if( this._cube_values[ jj + a + (b + c * ydim) * xdim ] != i ) {
                    u.set( a, b, c ).normalize();
                    nml.add( u );
                  }

                }
              }
            }

            nml.normalize()


            this._map_normals[ ii * 3 ] = (nml.x / 2.0 + 1.0) * 127;
            this._map_normals[ ii * 3 + 1 ] = (nml.y / 2.0 + 1.0) * 127;
            this._map_normals[ ii * 3 + 2 ] = (nml.z / 2.0 + 1.0) * 127;

          }
        }
      }
    }

    if( this._normals_texture ){
      this._normals_texture.needsUpdate = true;
    }


  }

  _set_palette( color_ids, skip, compute_boundingbox = false ){

    if( this._canvas.has_webgl2 ){

      // WARNING, no check on color_ids to speed up
      // I assume color_ids is always array of integers
      if( color_ids !== undefined ){
        this._color_ids.length = 0;
        for( let jj = 0; jj < color_ids.length; jj++ ) {
          this._color_ids[ color_ids[ jj ] ] = true;
        }
        if( this._color_ids[0] ){
          this._color_ids_length = 0;
        } else {
          this._color_ids_length = color_ids.length;
        }
        compute_boundingbox = true;
      }
      if( typeof(skip) === "number" ){
        this._value_index_skip = Math.floor( skip );
      }

      let i = 0, ii = 0, jj = this._value_index_skip * this._voxel_length, tmp, x, y, z;
      if( compute_boundingbox ){
        this._bounding_min = Math.max(this._cube_dim[0], this._cube_dim[1], this._cube_dim[2]);
        this._bounding_max = 0;
      }

      for ( z = 0; z < this._cube_dim[0]; z ++ ) {
        for ( y = 0; y < this._cube_dim[1]; y ++ ) {
          for ( x = 0; x < this._cube_dim[2]; x ++ ) {

            // no need to round up as this has been done in the constructor
            i = this._cube_values[jj];

            if( i !== 0 ){

              tmp = this._lut_map[i];

              if( tmp ){

                // valid voxel to render

                this._map_color[ 4 * ii ] = tmp.R;
                this._map_color[ 4 * ii + 1 ] = tmp.G;
                this._map_color[ 4 * ii + 2 ] = tmp.B;

                if( this._color_ids_length === 0 || this._color_ids[ i ] ) {
                  this._map_color[ 4 * ii + 3 ] = this._map_alpha ? tmp.A : 255;

                  // this._map_data[ ii ] = i;

                  if( compute_boundingbox ){
                    // set bounding box
                    if( Math.min(x,y,z) < this._bounding_min ){
                      this._bounding_min = Math.min(x,y,z);
                    }
                    if( Math.max(x,y,z) > this._bounding_max ){
                      this._bounding_max = Math.max(x,y,z);
                    }
                  }

                  ii++;
                  jj++;
                  continue;

                }

              }

            }
            // voxel is invisible, no need to render! hence data is 0
            // this._map_data[ ii ] = 0;
            this._map_color[ 4 * ii + 3 ] = 0;
            ii++;
            jj++;
          }
        }
      }

      if( compute_boundingbox ){
        this.object.material.uniforms.bounding.value = Math.min(
          Math.max(
            this._bounding_max / Math.min(...(this._cube_dim)) - 0.5,
            0.5 - this._bounding_min / Math.max(...(this._cube_dim)),
            0.0
          ),
          0.5
        );
        this.object.material.uniformsNeedUpdate = true;
      }

      if( this._color_texture ){
        this._color_texture.needsUpdate = true;
      }
      // this._normals_texture.needsUpdate = true;


    }

  }

  constructor(g, canvas){

    super( g, canvas );
    // this._params is g
    // this.name = this._params.name;
    // this.group_name = this._params.group.group_name;

    this.type = 'DataCube2';
    this.isDataCube2 = true;
    this._display_mode = "hidden";

    let mesh;

    // Cube values Must be from 0 to 1, float
    const cube_values = canvas.get_data('datacube_value_'+g.name, g.name, g.group.group_name),
          cube_half_size = canvas.get_data('datacube_half_size_'+g.name, g.name, g.group.group_name),
          cube_dim = canvas.get_data('datacube_dim_'+g.name, g.name, g.group.group_name),
          volume = {
            'xLength' : cube_half_size[0]*2,
            'yLength' : cube_half_size[1]*2,
            'zLength' : cube_half_size[2]*2,
          },
          lut = canvas.global_data('__global_data__.VolumeColorLUT'),
          lut_map = lut.map,
          max_colID = lut.mapMaxColorID;
    this._margin_length = volume;
    // If webgl2 is enabled, then we can show 3d texture, otherwise we can only show 3D plane
    if( canvas.has_webgl2 ){
      // Generate 3D texture, to do so, we need to customize shaders

      this._voxel_length = cube_dim[0] * cube_dim[1] * cube_dim[2];
      // const data = new Float32Array( this._voxel_length );
      const color = new Uint8Array( this._voxel_length * 4 );
      const normals = new Uint8Array( this._voxel_length * 3 );
      const vertex_position = [];

      this._cube_values = cube_values;
      this._lut = lut;
      this._lut_map = lut_map;
      this._cube_dim = cube_dim;
      // this._map_data = data;
      this._map_color = color;
      this._map_normals = normals;
      this._map_alpha = lut.mapAlpha;
      this._color_ids = [];
      this._color_ids_length = 0;
      this._value_index_skip = 0;

      let bounding_min = Math.min(cube_dim[0], cube_dim[1], cube_dim[2]) / 2,
          bounding_max = bounding_min;

      // Change cube_values so all elements are integers (non-negative)
      cube_values.forEach( (el, ii) => {
        if( el > max_colID || el < 0 ){
          cube_values[ ii ] = 0;
          return;
        }
        if ( !Number.isInteger( el ) ) {
          cube_values[ ii ] = Math.round( el );
        }
      });

      let i = 0, ii = 0, tmp;
      for ( let z = 0; z < cube_dim[0]; z ++ ) {
        for ( let y = 0; y < cube_dim[1]; y ++ ) {
          for ( let x = 0; x < cube_dim[2]; x ++ ) {
            i = cube_values[ii];

            if( i !== 0 ){
              tmp = lut_map[i];
              if( tmp ) {
                color[ 4 * ii ] = tmp.R;
                color[ 4 * ii + 1 ] = tmp.G;
                color[ 4 * ii + 2 ] = tmp.B;
                color[ 4 * ii + 3 ] = tmp.A === undefined ? 255 : tmp.A;

                if( Math.min(x,y,z) < bounding_min ){
                  bounding_min = Math.min(x,y,z);
                }
                if( Math.max(x,y,z) > bounding_max ){
                  bounding_max = Math.max(x,y,z);
                }
                // this._map_data[ ii ] = i;

                // calculate vertex positions
                vertex_position.push(
                  new Vector3().set(
                    ((x + 0.5) / (cube_dim[2] - 1) - 0.5) * volume.xLength,
                    ((y - 0.5) / (cube_dim[1] - 1) - 0.5) * volume.yLength,
                    ((z + 0.5) / (cube_dim[0] - 1) - 0.5) * volume.zLength
                  )
                );

              }
            }
            /**
             * No need to assign data if keys are invalid
             * data are initialized with 0 according to js specifications
             */
            ii++;
          }
        }
      }

      this._compute_normals();

      // 3D texture
      /*let data_texture = new DataTexture3D(
        this._map_data, cube_dim[0], cube_dim[1], cube_dim[2]
      );
      data_texture.minFilter = NearestFilter;
      data_texture.magFilter = NearestFilter;
      data_texture.format = RedFormat;
      data_texture.type = FloatType;
      data_texture.unpackAlignment = 1;
      data_texture.needsUpdate = true;
      this._data_texture = data_texture;
      this._data_texture.needsUpdate = true;*/


      // Color texture - used to render colors
      let color_texture = new DataTexture3D(
        color, cube_dim[0], cube_dim[1], cube_dim[2]
      );

      color_texture.minFilter = NearestFilter;
      color_texture.magFilter = NearestFilter;
      color_texture.format = RGBAFormat;
      color_texture.type = UnsignedByteType;
      color_texture.unpackAlignment = 1;

      this._color_texture = color_texture;
      this._color_texture.needsUpdate = true;

      // normals
      let normals_texture = new DataTexture3D(
        normals, cube_dim[0], cube_dim[1], cube_dim[2]
      );

      // magFilter must be nearest
      // minFilter can be locally smoothed
      normals_texture.minFilter = LinearFilter;
      normals_texture.magFilter = NearestFilter;
      normals_texture.format = RGBFormat;
      normals_texture.type = UnsignedByteType;
      normals_texture.unpackAlignment = 1;

      this._normals_texture = normals_texture;
      this._normals_texture.needsUpdate = true;

      // Material
      const shader = VolumeRenderShader1;


      const uniforms = UniformsUtils.clone( shader.uniforms );
      this._uniforms = uniforms;
      // uniforms.map.value = data_texture;
      uniforms.cmap.value = color_texture;
      uniforms.nmap.value = normals_texture;

      uniforms.alpha.value = -1.0;
      uniforms.scale_inv.value.set(1 / volume.xLength, 1 / volume.yLength, 1 / volume.zLength);

      this._bounding_min = bounding_min;
      this._bounding_max = bounding_max;
      let bounding = Math.max(
        bounding_max / Math.min(...cube_dim) - 0.5,
        0.5 - bounding_min / Math.max(...cube_dim),
        0.0
      );
      bounding = Math.min(bounding, 0.5);
      uniforms.bounding.value = bounding;

      let material = new RawShaderMaterial( {
        uniforms: uniforms,
        vertexShader: shader.vertexShader,
        fragmentShader: shader.fragmentShader,
        side: BackSide, // The volume shader uses the backface as its "reference point"
        transparent : true
      } );

      // let geometry = new SphereBufferGeometry(
      //   new Vector3().fromArray(cube_half_size).length(), 29, 14
      // );

      const geometry = new ConvexGeometry( vertex_position );

      // This translate will make geometry rendered correctly
      // geometry.translate( volume.xLength / 2, volume.yLength / 2, volume.zLength / 2 );

      mesh = new Mesh( geometry, material );
      mesh.name = 'mesh_datacube_' + g.name;

      mesh.position.fromArray( g.position );
      // TODO: need to check how threejs handle texture 3D to know why the s

      mesh.userData.pre_render = ( results ) => { return( this.pre_render( results ) ); };
      mesh.userData.dispose = () => { this.dispose(); };

    }
    this._mesh = mesh;
    this.object = mesh;
  }

  dispose(){
    if( this._canvas.has_webgl2 && this._mesh ){
      this._mesh.material.dispose();
      this._mesh.geometry.dispose();
      // this._data_texture.dispose();
      this._color_texture.dispose();
      this._normals_texture.dispose();

      // this._map_data = undefined;
      // this._cube_values = undefined;
    }
  }

  get_track_data( track_name, reset_material ){}

  finish_init(){
    // this.object

    // Finalize setups
    super.finish_init();

    // data cube 2 must have groups and group parent is scene
    let gp = this.get_group_object();
    // Move gp to global scene as its center is always 0,0,0
    // this._canvas.origin.remove( gp );
    // this._canvas.scene.add( gp );

    this.register_object( ['atlases'] );

  }


}


function gen_datacube2(g, canvas){
  return( new DataCube2(g, canvas) );
}



export { gen_datacube2 };

