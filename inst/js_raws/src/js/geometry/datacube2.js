import { AbstractThreeBrainObject } from './abstract.js';
import { THREE } from '../threeplugins.js';
import { CONSTANTS } from '../constants.js';
import { get_or_default } from '../utils.js';

// source: https://github.com/mrdoob/three.js/blob/790811db742ea9d7c54fe28f83865d7576f14134/examples/jsm/loaders/RGBELoader.js#L352-L396
const float_to_int32 = ( function () {

	// Source: http://gamedev.stackexchange.com/questions/17326/conversion-of-a-number-from-single-precision-floating-point-representation-to-a/17410#17410

	var floatView = new Float32Array( 1 );
	var int32View = new Int32Array( floatView.buffer );

	/* This method is faster than the OpenEXR implementation (very often
	 * used, eg. in Ogre), with the additional benefit of rounding, inspired
	 * by James Tursa?s half-precision code. */
	function toHalf( val ) {

		floatView[ 0 ] = val;
		var x = int32View[ 0 ];

		var bits = ( x >> 16 ) & 0x8000; /* Get the sign */
		var m = ( x >> 12 ) & 0x07ff; /* Keep one extra bit for rounding */
		var e = ( x >> 23 ) & 0xff; /* Using int is faster here */

		/* If zero, or denormal, or exponent underflows too much for a denormal
		 * half, return signed zero. */
		if ( e < 103 ) return bits;

		/* If NaN, return NaN. If Inf or exponent overflow, return Inf. */
		if ( e > 142 ) {

			bits |= 0x7c00;
			/* If exponent was 0xff and one mantissa bit was set, it means NaN,
					 * not Inf, so make sure we set one mantissa bit too. */
			bits |= ( ( e == 255 ) ? 0 : 1 ) && ( x & 0x007fffff );
			return bits;

		}

		/* If exponent underflows but not too much, return a denormal */
		if ( e < 113 ) {

			m |= 0x0800;
			/* Extra rounding may overflow and set mantissa to 0 and exponent
			 * to 1, which is OK. */
			bits |= ( m >> ( 114 - e ) ) + ( ( m >> ( 113 - e ) ) & 1 );
			return bits;

		}

		bits |= ( ( e - 112 ) << 10 ) | ( m >> 1 );
		/* Extra rounding. An overflow will set mantissa to 0 and increment
		 * the exponent, which is OK. */
		bits += m & 1;
		return bits;

	}

	return toHalf;

} )();




class DataCube2 extends AbstractThreeBrainObject {

  _set_palette(pal){
    // pal must be a dict or array

    // this muse be a valid cube
    if(!Array.isArray(this._cube_values)){ return; }


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
          fslut = canvas.global_data('__global_data__FreeSurferColorLUT'),
          max_colID = canvas.global_data('__global_data__FreeSurferColorLUTMaxColorID');
    // If webgl2 is enabled, then we can show 3d texture, otherwise we can only show 3D plane
    if( canvas.has_webgl2 ){
      // Generate 3D texture, to do so, we need to customize shaders

      this._cube_values = cube_values;
      const data = new Uint16Array( cube_dim[0] * cube_dim[1] * cube_dim[2] );
      const color = new Uint8Array( cube_dim[0] * cube_dim[1] * cube_dim[2] * 3 );

      this._map_data = data;
      this._map_color = color;

      // Debug use
      let i = 0, ii = 0, tmp;
      let bounding_min = Math.min(cube_dim[0], cube_dim[1], cube_dim[2]) / 2,
          bounding_max = bounding_min;
      for ( let z = 0; z < cube_dim[0]; z ++ ) {
					for ( let y = 0; y < cube_dim[1]; y ++ ) {
						for ( let x = 0; x < cube_dim[2]; x ++ ) {
						  i = parseInt(cube_values[ii]);

						  tmp = fslut[i];
						  if(tmp && (i !== 0)){
						    color[ 3 * ii ] = tmp.R;
						    color[ 3 * ii + 1 ] = tmp.G;
						    color[ 3 * ii + 2 ] = tmp.B;

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
              data[ ii ] = float_to_int32(i / max_colID);
						  ii += 1;
						}
					}
      }

      // 3D texture
      let texture = new THREE.DataTexture3D(
        data, cube_dim[0], cube_dim[1], cube_dim[2]
      );

      texture.minFilter = THREE.NearestFilter;
      texture.magFilter = THREE.NearestFilter;
      texture.format = THREE.RedFormat;
      // texture.type = THREE.FloatType;
      texture.type = THREE.HalfFloatType;
      texture.unpackAlignment = 1;

      texture.needsUpdate = true;
      this._data_texture = texture;

      // Color texture - used to render colors
      let color_texture = new THREE.DataTexture3D(
        color, cube_dim[0], cube_dim[1], cube_dim[2]
      );

      color_texture.minFilter = THREE.NearestFilter;
      color_texture.magFilter = THREE.NearestFilter;
      color_texture.format = THREE.RGBFormat;
      color_texture.type = THREE.UnsignedByteType;
      color_texture.unpackAlignment = 1;

      color_texture.needsUpdate = true;
      this._color_texture = texture;


    	// Material
    	const shader = THREE.VolumeRenderShader1;


    	let uniforms = THREE.UniformsUtils.clone( shader.uniforms );
    	uniforms.map.value = texture;
    	uniforms.cmap.value = color_texture;

    	//uniforms.threshold_lb.value = 0.023;

      uniforms.threshold_lb.value = 0;
    	// uniforms.threshold_ub.value = 1;
    	uniforms.value_scale.value = max_colID;
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
