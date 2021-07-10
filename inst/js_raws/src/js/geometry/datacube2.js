import { AbstractThreeBrainObject } from './abstract.js';
import { THREE } from '../threeplugins.js';
import { CONSTANTS } from '../constants.js';
import { get_or_default } from '../utils.js';


class DataCube2 extends AbstractThreeBrainObject {

  _reset_palette(){
    if( this._canvas.has_webgl2 ){

      let bounding_min = Math.min(this._cube_dim[0], this._cube_dim[1], this._cube_dim[2]) / 2,
          bounding_max = bounding_min;
      let i = 0, ii = 0, tmp;

      for ( let z = 0; z < this._cube_dim[0]; z ++ ) {
  			for ( let y = 0; y < this._cube_dim[1]; y ++ ) {
  				for ( let x = 0; x < this._cube_dim[2]; x ++ ) {
  				  i = parseInt(this._cube_values[ii]);

  				  tmp = this._lut.map[i];
  				  if(tmp && (i !== 0)){
  				    this._map_color[ 4 * ii ] = tmp.R;
  				    this._map_color[ 4 * ii + 1 ] = tmp.G;
  				    this._map_color[ 4 * ii + 2 ] = tmp.B;
  				    this._map_color[ 4 * ii + 3 ] = 1; //tmp.A === undefined ? 1 : (tmp.A / 255);

  				    if( Math.min(x,y,z) < bounding_min ){
  				      bounding_min = Math.min(x,y,z);
  				    }
  				    if( Math.max(x,y,z) > bounding_max ){
  				      bounding_max = Math.max(x,y,z);
  				    }

  				  } else {
  				    i = 0;
  				  }
  				  // unknown fs color ID
            if(i > this._lut.mapMaxColorID || i < 0){
              i = 0;
            }
            // risky as the target type is int32 signed but uint16 is desired
            // however value range is from 0 to 1 so should be fine?
            this._map_data[ ii ] = i; //float_to_int32(i / max_colID);
  				  ii += 1;
  				}
  			}
      }

    }
  }

  constructor(g, canvas){

    super( g, canvas );
    // this._params is g
    // this.name = this._params.name;
    // this.group_name = this._params.group.group_name;

    this.type = 'DataCube2';
    this.isDataCube2 = true;

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
          fslut = lut.map,
          max_colID = lut.mapMaxColorID;
          // fslut = canvas.global_data('__global_data__VolumeColorLUT'),
          // max_colID = canvas.global_data('__global_data__VolumeColorLUTMaxColorID');

    // If webgl2 is enabled, then we can show 3d texture, otherwise we can only show 3D plane
    if( canvas.has_webgl2 ){
      // Generate 3D texture, to do so, we need to customize shaders

      this._cube_values = cube_values;
      this._lut = lut;
      this._cube_dim = cube_dim;
      const data = new Float32Array( cube_dim[0] * cube_dim[1] * cube_dim[2] );
      const color = new Uint8Array( cube_dim[0] * cube_dim[1] * cube_dim[2] * 4 );

      this._map_data = data;
      this._map_color = color;

      // Debug use

      let bounding_min = Math.min(cube_dim[0], cube_dim[1], cube_dim[2]) / 2,
          bounding_max = bounding_min;
      let i = 0, ii = 0, tmp;
      for ( let z = 0; z < cube_dim[0]; z ++ ) {
				for ( let y = 0; y < cube_dim[1]; y ++ ) {
					for ( let x = 0; x < cube_dim[2]; x ++ ) {
					  i = parseInt(cube_values[ii]);

					  tmp = fslut[i];
					  if(tmp && (i !== 0)){
					    color[ 4 * ii ] = tmp.R;
					    color[ 4 * ii + 1 ] = tmp.G;
					    color[ 4 * ii + 2 ] = tmp.B;
					    color[ 4 * ii + 3 ] = 1; //tmp.A === undefined ? 1 : tmp.A;

					    if( Math.min(x,y,z) < bounding_min ){
					      bounding_min = Math.min(x,y,z);
					    }
					    if( Math.max(x,y,z) > bounding_max ){
					      bounding_max = Math.max(x,y,z);
					    }

					  } else {
					    i = 0;
					  }
					  // unknown fs color ID
            if(i > max_colID || i < 0){
              i = 0;
            }
            // risky as the target type is int32 signed but uint16 is desired
            // however value range is from 0 to 1 so should be fine?
            data[ ii ] = i; //float_to_int32(i / max_colID);
					  ii += 1;
					}
				}
      }
      //this._reset_palette();

      // 3D texture
      let texture = new THREE.DataTexture3D(
        data, cube_dim[0], cube_dim[1], cube_dim[2]
      );

      texture.minFilter = THREE.NearestFilter;
      texture.magFilter = THREE.NearestFilter;
      texture.format = THREE.RedFormat;
      texture.type = THREE.FloatType;
      // texture.type = THREE.HalfFloatType;
      texture.unpackAlignment = 1;

      texture.needsUpdate = true;
      this._data_texture = texture;

      // Color texture - used to render colors
      let color_texture = new THREE.DataTexture3D(
        color, cube_dim[0], cube_dim[1], cube_dim[2]
      );

      color_texture.minFilter = THREE.NearestFilter;
      color_texture.magFilter = THREE.NearestFilter;
      // color_texture.format = THREE.RGBFormat;
      color_texture.format = THREE.RGBAFormat;
      color_texture.type = THREE.UnsignedByteType;
      color_texture.unpackAlignment = 1;

      color_texture.needsUpdate = true;
      this._color_texture = texture;


    	// Material
    	const shader = THREE.VolumeRenderShader1;


    	let uniforms = THREE.UniformsUtils.clone( shader.uniforms );
    	uniforms.map.value = texture;
    	uniforms.cmap.value = color_texture;

    	uniforms.alpha.value = 1.0;
    	uniforms.scale.value.set(volume.xLength, volume.yLength, volume.zLength);

    	let bounding = Math.max(
    	  bounding_max / Math.min(...cube_dim) - 0.5,
    	  0.5 - bounding_min / Math.max(...cube_dim),
    	  0.0
    	);
    	bounding = Math.min(bounding, 0.5);
    	uniforms.bounding.value = bounding;

      let material = new THREE.RawShaderMaterial( {
    		uniforms: uniforms,
    		vertexShader: shader.vertexShader,
    		fragmentShader: shader.fragmentShader,
    		side: THREE.BackSide, // The volume shader uses the backface as its "reference point"
    		transparent : true
    	} );

    	let geometry = new THREE.SphereBufferGeometry(
    	  new THREE.Vector3().fromArray(cube_half_size).length(), 29, 14
    	);

      // let geometry = new THREE.BoxBufferGeometry(volume.xLength, volume.yLength, volume.zLength);


    	// This translate will make geometry rendered correctly
    	// geometry.translate( volume.xLength / 2, volume.yLength / 2, volume.zLength / 2 );

    	mesh = new THREE.Mesh( geometry, material );
    	mesh.name = 'mesh_datacube_' + g.name;

      /*mesh.position.fromArray([
        g.position[0] - cube_half_size[0],
        g.position[1] - cube_half_size[1],
        g.position[2] - cube_half_size[2]
      ]);
      */
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
      this._data_texture.dispose();
      this._color_texture.dispose();

      // this._map_data = undefined;
      // this._cube_values = undefined;
    }
  }

  get_track_data( track_name, reset_material ){}

  pre_render( results ){
    this._mesh.material.uniforms.cameraPos.value.copy( this._canvas.main_camera.position );
  }

  finish_init(){
    // this.object

    // Finalize setups
    super.finish_init();

    // data cube 2 must have groups and group parent is scene
    let gp = this.get_group_object();
    // Move gp to global scene as its center is always 0,0,0
    this._canvas.origin.remove( gp );
    this._canvas.scene.add( gp );

    this.register_object( ['atlases'] );

  }
}


function gen_datacube2(g, canvas){
  return( new DataCube2(g, canvas) );
}



export { gen_datacube2 };
