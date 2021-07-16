import { AbstractThreeBrainObject } from './abstract.js';
import { THREE } from '../threeplugins.js';
import { CONSTANTS } from '../constants.js';
import { to_array, min2, sub2 } from '../utils.js';

const MATERIAL_PARAMS = {
  'transparent' : true,
  'side': THREE.DoubleSide,
  'wireframeLinewidth' : 0.1,
  'vertexColors' : THREE.VertexColors
};

// freemesh
// CONSTANTS.DEFAULT_COLOR = 0;
// CONSTANTS.VERTEX_COLOR = 1;
// CONSTANTS.VOXEL_COLOR = 2;
// CONSTANTS.ELECTRODE_COLOR = 3;

class FreeMesh extends AbstractThreeBrainObject {

  constructor(g, canvas){

    super( g, canvas );
    // this._params is g
    // this.name = this._params.name;
    // this.group_name = this._params.group.group_name;

    this.type = 'FreeMesh';
    this.isFreeMesh = true;

    // STEP 1: initial settings
    // when subject brain is messing, subject_code will be template subject such as N27,
    // and display_code will be the missing subject
    // actuall subject
    this.subject_code = this._params.subject_code;
    // display subject
    this.display_code = canvas.get_data('subject_code', this._params.name,
                                        this.group_name) || this.subject_code;
    this.hemisphere = this._params.hemisphere || 'left';
    this.surface_type = this._params.surface_type;
    this.misc_name = '_misc_' + this.subject_code;
    this.misc_group_name = '_internal_group_data_' + this.subject_code;
    this._vertex_cname = this._canvas.get_data(
      `default_vertex_${ this.hemisphere[0] }h_${ this.surface_type }`, this.name, this.group_name);

    // STEP 2: data settings
    const vertices = this._canvas.get_data('free_vertices_'+this.name, this.name, this.group_name);
    const faces = this._canvas.get_data('free_faces_'+g.name, this.name, this.group_name);

    // Make sure face index starts from 0
    const _face_min = min2(faces, 0);
    if(_face_min !== 0) {
      sub2(faces, _face_min);
    }

    // STEP 3: mesh settings
    this._materials = {
      'MeshPhongMaterial' : new THREE.MeshPhongMaterial( MATERIAL_PARAMS),
      'MeshLambertMaterial': new THREE.MeshLambertMaterial( MATERIAL_PARAMS )
    };
    this._shader_uniforms_which_map = { value : CONSTANTS.DEFAULT_COLOR };

    // For volume colors
    this._volume_margin_size = 128;
    this._volume_length = 2097152;
    this._shader_uniforms_scale_inv = {
      value : new THREE.Vector3(
        1 / this._volume_margin_size, 1 / this._volume_margin_size,
        1 / this._volume_margin_size
      )
    };
    this._shader_uniforms_shift = { value : new THREE.Vector3() };
    this._shader_uniforms_sampler_bias = { value : 3.0 };
    this._shader_uniforms_sampler_step = { value : 1.5 };
    this._volume_array = new Uint8Array( 32 );
    // fake texture, will update later
    this._volume_texture = new THREE.DataTexture3D(
      this._volume_array, 2, 2, 2
    );
    this._volume_texture.minFilter = THREE.NearestFilter;
    this._volume_texture.magFilter = THREE.LinearFilter;
    this._volume_texture.format = THREE.RGBAFormat;
    this._volume_texture.type = THREE.UnsignedByteType;
    this._volume_texture.unpackAlignment = 1;
    this._shader_uniforms_volume_map = { value : this._volume_texture };

    this._geometry = new THREE.BufferGeometry();

    // construct geometry

    const vertex_positions = new Float32Array( vertices.length * 3 ),
          track_color = new Uint8Array( vertices.length * 3 ),
          face_orders = new Uint32Array( faces.length * 3 ),
          vertex_color = new Uint8Array( vertices.length * 3 ).fill(255);

    this._track_color = track_color;
    this._vertex_color = vertex_color;

    vertices.forEach((v, ii) => {
      vertex_positions[ ii * 3 ] = v[0];
      vertex_positions[ ii * 3 + 1 ] = v[1];
      vertex_positions[ ii * 3 + 2 ] = v[2];
    });
    faces.forEach((v, ii) => {
      face_orders[ ii * 3 ] = v[0];
      face_orders[ ii * 3 + 1 ] = v[1];
      face_orders[ ii * 3 + 2 ] = v[2];
    });

    this._geometry.setIndex( new THREE.BufferAttribute(face_orders, 1) );
    this._geometry.setAttribute( 'position', new THREE.BufferAttribute(vertex_positions, 3) );
    this._geometry.setAttribute( 'track_color', new THREE.BufferAttribute( track_color, 3, true ) );
    this._geometry.setAttribute( 'color', new THREE.BufferAttribute( vertex_color, 3, true ) );


    // gb.setAttribute( 'color', new THREE.Float32BufferAttribute( vertex_colors, 3 ) );
    // gb.setAttribute( 'normal', new THREE.Float32BufferAttribute( normals, 3 ) );

    this._geometry.computeVertexNormals();
    this._geometry.computeBoundingBox();
    this._geometry.computeBoundingSphere();
    //gb.faces = faces;

    this._geometry.name = 'geom_free_' + g.name;

    this._material_type = g.material_type || 'MeshPhongMaterial';
    this._compile_material( this._material_type );
    this._mesh = new THREE.Mesh(this._geometry, this._materials[this._material_type]);
    this._mesh.name = 'mesh_free_' + g.name;

    this._mesh.position.fromArray(g.position);

    // register userData to comply with main framework
    this._mesh.userData.construct_params = g;

    // animation data (compatibility issue)
    this._mesh.userData.ani_name = 'default';
    this._mesh.userData.ani_all_names = Object.keys( g.keyframes );
    this._mesh.userData.ani_exists = this._mesh.userData.ani_all_names.length > 0;

    // register object
    this.object = this._mesh;

    this._link_userData();
  }

  finish_init(){

    super.finish_init();

    // Need to registr surface
    // instead of using surface name, use
    this.register_object( ['surfaces'] );

    this.set_primary_color(this._vertex_cname, true);

    // calculates global position to align with volume data
    // this._mesh.getWorldPosition( this._shader_uniforms_shift.value );
    // this._shader_uniforms_shift.value.copy( this._mesh.parent.position );

  }

  _link_userData(){
    // register for compatibility
    this._mesh.userData.get_track_data = ( track_name, reset_material ) => {
      return( this.get_track_data( track_name, reset_material ) );
    };
    this._mesh.userData.generate_animation = ( track_data, cmap, animation_clips, mixer ) => {
      return( this.generate_animation( track_data, cmap, animation_clips, mixer ) );
    };
    this._mesh.userData.pre_render = ( results ) => { return( this.pre_render( results ) ); };
    this._mesh.userData.dispose = () => { this.dispose(); };
  }

  // internally used
  // primary colors are gray-based (like sulc, curv...)
  _set_track( cname, color_data, update_color = false, make_primary = false ){

    if( !(color_data && Array.isArray(color_data.value)) ){
      if( update_color ){
        this._mesh.material.needsUpdate = true;
      }
      return;
    }

    const g = this._params;
    const nvertices = this._mesh.geometry.attributes.position.count;
    let scale = 1;

    let colattr = make_primary? this._vertex_color : this._track_color;

    if( !Array.isArray(color_data.range) || color_data.range.length < 2 ){
      color_data.range = [-1, 1];
    }

    scale = Math.max(color_data.range[1], -color_data.range[0]);

    // generate color for each vertices
    const _transform = (v, b = 10 / scale) => {
      // let _s = 1.0 / ( 1.0 + Math.exp(b * 1)) - 0.5 * 2.0001;
      let s = Math.floor( 153.9 / ( 1.0 + Math.exp(b * v)) ) + 100;
      return( s );
    };

    color_data.value.forEach((v, ii) => {
      if( ii >= nvertices ){ return; }
      let col;
      // Make it lighter using sigmoid function
      col = _transform(v);
      colattr.setXYZ(ii, col, col, col);
    });


    this._vertex_cname = cname;
    if( update_color ){
      // update color to geometry
      this._mesh.material.needsUpdate = true;
    }

  }

  // Primary color (Curv, sulc...)
  set_primary_color( color_name, update_color = false ){

    let cname = color_name || this._vertex_cname;

    // color data is lazy-loaded
    const color_data = this._canvas.get_data(cname, this.misc_name, this.misc_group_name);

    if( !(color_data && Array.isArray(color_data.value)) ){
      if( update_color ){
        this._mesh.material.needsUpdate = true;
      }
      return;
    }

    const g = this._params;
    const nvertices = this._mesh.geometry.attributes.position.count;
    if( !Array.isArray(color_data.range) || color_data.range.length < 2 ){
      color_data.range = [-1, 1];
    }

    let scale = Math.max(color_data.range[1], -color_data.range[0]);

    // generate color for each vertices
    const _transform = (v, b = 10 / scale) => {
      // let _s = 1.0 / ( 1.0 + Math.exp(b * 1)) - 0.5 * 2.0001;
      let s = Math.floor( 153.9 / ( 1.0 + Math.exp(b * v)) ) + 100;
      return( s );
    };

    color_data.value.forEach((v, ii) => {
      if( ii >= nvertices ){ return; }
      // Make it lighter using sigmoid function
      let col = _transform(v);
      this._vertex_color[ ii * 3 ] = col;
      this._vertex_color[ ii * 3 + 1 ] = col;
      this._vertex_color[ ii * 3 + 2 ] = col;
    });

    if( update_color ){
      // update color to geometry
      this._mesh.material.needsUpdate = true;
    }

  }

  dispose(){
    this._mesh.material.dispose();
    this._mesh.geometry.dispose();
    this._volume_texture.dispose();
  }


  get_track_data( track_name, reset_material ){
    const g = this._params;
    let re, tname = track_name;
    // this._material_type

    if( this._mesh.userData.ani_exists ){
      if( tname === undefined ){ tname = this._mesh.userData.ani_name; }
      re = g.keyframes[ tname ];
    }else{
      re = g.keyframes[ tname ];
    }
    // remember last choice
    this._mesh.userData.ani_name = tname;

    if( reset_material !== false ){
      if( !re ){
        // track data not found, reset track color
        this._track_color.fill( 0 );
      }
    }

    if( !re ){
      return;
    }
    console.log('Using track name ' + tname);

    if( re.cached ){
      let value = this._canvas.get_data('free_vertex_colors_' + re.name + '_'+g.name, g.name, g.group.group_name);
      if( !value || typeof value !== 'object' || !Array.isArray(value.value) || value.value.length === 0 ){
        // value should be cached but not found or invalid
        return;
      }
      re.value = value.value;
      re.cached = false;
    }
    return(re);

  }


  generate_animation( track_data, cmap, animation_clips, mixer ){
    console.log('Using customized animation mixer');
    // Generate keyframes
    const _time_min = cmap.time_range[0],
          _time_max = cmap.time_range[1];
    // Prepare color map
    const color_trans = {};
    cmap.value_names.map((nm, ii) => {
      color_trans[ nm ] = cmap.lut.getColor(ii);
    });

    // 1. timeStamps, TODO: get from settings the time range
    const values = [], time_stamp = [], cvalues = [];
    to_array( track_data.time ).forEach((v, ii) => {
      time_stamp.push( v - _time_min );
      values.push( ii );
    });

    const _size = track_data.value.length / time_stamp.length;
    let _value = [];

    track_data.value.forEach((v, ii) => {
      let _c = color_trans[ v ] || cmap.lut.getColor(v) || {r:0,g:0,b:0};
      _value.push( _c.r, _c.g, _c.b );
      if( (ii+1) % _size === 0 && _value.length > 0 ){
        cvalues.push( _value );
        _value = [];
      }
    });

    if( _value.length > 0 ){
      cvalues.push( _value );
      _value = [];
    }
    track_data.cvalues = cvalues;

    // We cannot morph vertex colors, but can still use the animation
    // The key is to set mesh.userData.animationIndex to be value index, and
    this._mesh.userData.animation_target = track_data.target;

    const keyframe = new THREE.NumberKeyframeTrack(
      '.userData["animationIndex"]',
      time_stamp, values, THREE.InterpolateDiscrete
    );

    return( keyframe );
  }


  _check_material( update_canvas = false ){
    const _mty = this._canvas.state_data.get('surface_material_type') || this._material_type;
    if( !this._mesh.material['is' + _mty] ){
      this.switch_material( _mty, update_canvas );
    }
  }

  pre_render( results ){
    // check material
    this._check_material( false );

    // console.log( mesh.userData.animationIndex );
    // get current index
    let vidx = this._mesh.userData.animationIndex;
    if( typeof vidx !== 'number' ){ return; }

    // get current track_data
    const track_data = this._mesh.userData.get_track_data( this._mesh.userData.ani_name, false );
    if( !track_data ){ return; }

    vidx = Math.floor( vidx );
    if( vidx < 0 ){ vidx = 0; }
    if( vidx >= track_data.cvalues.length ){ vidx = track_data.cvalues.length-1; }

    const cvalue = track_data.cvalues[ vidx ];

    // check? TODO
    for( let ii=0; ii<cvalue.length; ii++ ){
      this._mesh.geometry.attributes.color.array[ ii ] = cvalue[ ii ];
    }
    this._mesh.geometry.attributes.color.needsUpdate=true;
    //this._mesh.getWorldPosition( this._shader_uniforms_shift.value );
    // this._shader_uniforms_shift.value.copy( this._mesh.parent.position );

  }

  _compile_material( material_type ){
    if( material_type in this._materials ){
      const material = this._materials[ material_type ];
      if( !material.userData.compiled ){
        // compile
        material.onBeforeCompile = ( shader , renderer ) => {
          if( renderer === this._canvas.main_renderer ){
            shader.uniforms.which_map = this._shader_uniforms_which_map;
            shader.uniforms.volume_map = this._shader_uniforms_volume_map;
            shader.uniforms.scale_inv = this._shader_uniforms_scale_inv;
            shader.uniforms.shift = this._shader_uniforms_shift;
            shader.uniforms.sampler_bias = this._shader_uniforms_sampler_bias;
            shader.uniforms.sampler_step = this._shader_uniforms_sampler_step;

            shader.vertexShader =
            `
precision mediump sampler3D;
uniform int which_map;
uniform sampler3D volume_map;
uniform vec3 scale_inv;
uniform vec3 shift;
uniform float sampler_bias;
uniform float sampler_step;
vec3 zeros = vec3( 0.0 );
vec4 sample1(vec3 p) {
  vec4 re = vec4( 0.0, 0.0, 0.0, 0.0 );
  vec3 threshold = vec3( 0.007843137, 0.007843137, 0.007843137 );
  if( sampler_bias > 0.0 ){
    vec3 dta = vec3( 0.0 );
    vec4 tmp = vec4( 0.0 );
    float count = 0.0;
    for(dta.x = -sampler_bias; dta.x <= sampler_bias; dta.x+=sampler_step){
      for(dta.y = -sampler_bias; dta.y <= sampler_bias; dta.y+=sampler_step){
        for(dta.z = -sampler_bias; dta.z <= sampler_bias; dta.z+=sampler_step){
          tmp = texture( volume_map, p + dta * scale_inv );
          if(
            tmp.a > 0.0 &&
            (tmp.r > threshold.r ||
            tmp.g > threshold.g ||
            tmp.b > threshold.b)
          ){
            if( count == 0.0 ){
              re = tmp;
            } else {
              re = mix( re, tmp, 1.0 / count );
            }
            count += 1.0;
          }
        }
      }
    }
  } else {
    re = texture( volume_map, p );
  }
  if( re.a == 0.0 ){
    re.r = 0.5;
    re.g = 0.5;
    re.b = 0.5;
  }
  return( re );
}
` + shader.vertexShader;
  					shader.vertexShader = shader.vertexShader.replace(
  						'#include <fog_vertex>',`
#include <fog_vertex>
if( which_map == 2 ){
  // default vertex attributes provided by Geometry and BufferGeometry
  // attribute vec3 position;
  vec3 data_position = (position + shift) * scale_inv + 0.5;
  vec4 data_color0 = sample1( data_position - scale_inv * vec3(0.5,-0.5,0.5) );
#if defined( USE_COLOR_ALPHA )
	vColor = mix( max(vec3( 1.0 ) - vColor / 2.0, vColor), data_color0, 0.4 );
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
	vColor.rgb = mix( max(vec3( 1.0 ) - vColor / 2.0, vColor), data_color0.rgb, 0.4 );
#endif
}
  						`.split("\n").map((e) => {
                return(
                  e.replaceAll(/\/\/.*/g, "")
                );
              }).join("\n")
  					);

  					material.userData.shader = shader;

          }
        }
        material.userData.compiled = true;
      }
    }
  }

  _set_color_from_datacube2( m, bias = 3.0 ){
    if( !m || !m.isDataCube2 ){
      this._shader_uniforms_which_map.value = CONSTANTS.DEFAULT_COLOR;
      return;
    }


    this._volume_texture.image = m._color_texture.image;

    this._shader_uniforms_scale_inv.value.set(
      1 / m._cube_dim[0],
      1 / m._cube_dim[1],
      1 / m._cube_dim[2]
    )
    this._shader_uniforms_shift.value.copy( this._mesh.parent.position );
    this._volume_texture.needsUpdate = true;
    this._shader_uniforms_which_map.value = CONSTANTS.VOXEL_COLOR;
    this._shader_uniforms_sampler_bias.value = bias;
    this._shader_uniforms_sampler_step.value = bias / 2;

    /*
    // this._shader_uniforms_which_map = { value : false };
    // this._shader_uniforms_volume_map = { value : null };
    // this._shader_uniforms_scale_inv = { value : new THREE.Vector3() };
    // this._shader_uniforms_shift = { value : new THREE.Vector3() };
    // color_texture.format = THREE.RGBAFormat;
    // this._volume_array
    // this._volume_dim

    let x, y, z, ii, pad = 2;

    const src = m._color_texture.image.data;
    const dst = this._volume_array;
    const shift = this.object.parent.position;
    // new THREE.Quaternion
    const torig = new THREE.Matrix4().set(
      1,0,0,0,0,0,1,0,0,1,0,0,0,0,0,1
    )
    const torig_inv = new THREE.Matrix4().set(
      1,0,0,128,0,1,0,128,0,0,1,128,0,0,0,1
    )
    const vertex_pos = this._mesh.geometry.attributes.position,
          p = new THREE.Vector3(),
          cx = m._cube_dim[0],
          cy = m._cube_dim[1],
          cz = m._cube_dim[2];
    const fct = new THREE.Vector3(
      cx / this._volume_dim[0],
      cy / this._volume_dim[1],
      cz / this._volume_dim[2]
    );
    let idx, alpha, skp, skp_max, a,b,c,s, d,e,f;
    const js_texture = (ii) => {

      skp_max = Math.min(p.x,p.y,p.z,cx-p.x,cy-p.y,cz-p.z, 5);

      for(skp = 0; skp < skp_max; skp++){
        for(a = -skp; a <= skp; a++){
          for(b = -skp; b <= skp; b++){
            if(Math.max(a,b,-a,-b) === skp){
              s = 1;
            } else {
              s = 2 * skp;
            }
            for(c = -skp; c <= skp; c+=s){
              idx = (p.x + a) + cx * ((p.y + b) + cy * (p.z + c));
              alpha = src[ idx * 4 + 3 ];
              d = src[ idx * 4 ];
              e = src[ idx * 4 + 1 ];
              f = src[ idx * 4 + 2 ];
              if( alpha > 0 && (d+e+f) > 0 ){
                // valid voxel
                idx = (p.x) + this._volume_dim[0] * ((p.y) + this._volume_dim[1] * (p.z));
                dst[ idx * 4 ] = d;
                dst[ idx * 4 + 1 ] = e;
                dst[ idx * 4 + 2 ] = f;
                dst[ idx * 4 + 3 ] = alpha;
                return(1);
              }
            }
          }
        }
      }
      return(0);
    };

    let count = 0;
    for( ii = 0; ii < vertex_pos.count; ii++ ){
      p.set(
          vertex_pos.getX(ii),
          vertex_pos.getY(ii),
          vertex_pos.getZ(ii)
        ).sub( shift ).applyMatrix4(torig_inv).multiply( fct );
      p.x = Math.round(p.x);
      p.y = Math.round(p.y);
      p.z = Math.round(p.z);
      if( p.x < 0 || p.x >= cx){ continue; }
      if( p.y < 0 || p.y >= cy){ continue; }
      if( p.z < 0 || p.z >= cz){ continue; }
      // src[ p.x + cx * (p.y + cy * p.z)]
      count += js_texture( ii );
    }
    console.log(count);
    */

  }

  switch_material( material_type, update_canvas = false ){
    if( material_type in this._materials ){
      const _m = this._materials[ material_type ];
      const _o = this._canvas.state_data.get("surface_opacity_left") || 0;

      this._compile_material( material_type );

      this._material_type = material_type;
      this._mesh.material = _m;
      this._mesh.material.vertexColors = THREE.VertexColors;
      this._mesh.material.opacity = _o;
      this._mesh.material.needsUpdate = true;
      if( update_canvas ){
        this._canvas.start_animation( 0 );
      }
    }
  }

}


function gen_free(g, canvas){
  return( new FreeMesh(g, canvas) );
}

export { gen_free };
