import { remove_comments } from '../utils.js';

const compile_free_material = ( material, options, target_renderer ) => {

  if( material.userData.compiled ){ return; }

  material.userData.compiled = false;
  material.userData.options = options;

  material.onBeforeCompile = ( shader , renderer ) => {

    shader.uniforms.mapping_type = options.mapping_type;
    shader.uniforms.volume_map = options.volume_map;
    shader.uniforms.scale_inv = options.scale_inv;
    shader.uniforms.shift = options.shift;
    shader.uniforms.sampler_bias = options.sampler_bias;
    shader.uniforms.sampler_step = options.sampler_step;

    shader.uniforms.elec_cols = options.elec_cols;
    shader.uniforms.elec_locs = options.elec_locs;
    shader.uniforms.elec_size = options.elec_size;
    shader.uniforms.elec_active_size = options.elec_active_size;
    shader.uniforms.elec_radius = options.elec_radius;
    shader.uniforms.elec_decay = options.elec_decay;

    shader.uniforms.blend_factor = options.blend_factor;

    material.userData.shader = shader;

    if( target_renderer !== undefined ){
      if( target_renderer !== renderer ){
        return;
      }
    }
    material.userData.compiled = true;

    shader.vertexShader = remove_comments(`
precision mediump sampler2D;
precision mediump sampler3D;
uniform int mapping_type;
uniform float elec_size;
uniform float elec_active_size;
uniform sampler3D volume_map;
uniform sampler2D elec_cols;
uniform sampler2D elec_locs;
uniform vec3 scale_inv;
uniform vec3 shift;
uniform float sampler_bias;
uniform float sampler_step;
uniform float blend_factor;
uniform float elec_radius;
uniform float elec_decay;

attribute vec3 track_color;
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
    re.r = 1.0;
    re.g = 1.0;
    re.b = 1.0;
  }
  return( re );
}


vec3 sample2( vec3 p ) {
  // p = (position + shift) * scale_inv
  vec3 eloc;
  vec3 ecol;
  vec2 p2 = vec2( 0.0, 0.5 );
  vec3 re = vec3( 0.0 );
  float count = 0.0;
  float len = 0.0;
  float start = 0.5 / elec_size;
  float end = elec_active_size / elec_size;
  float step = 1.0 / elec_size;

  for( p2.x = start; p2.x < end; p2.x += step ){
    eloc = texture( elec_locs, p2 ).rgb;
    len = max( length( ( eloc * 255.0 - 128.0 ) - p ) , 3.0 );
    if( len < elec_radius ){
      ecol = texture( elec_cols, p2 ).rgb;
      re += 1.0 + ( ecol - 1.0 ) * exp( - len * elec_decay / elec_radius );
      count += 1.0;
    }
  }
  if( count == 0.0 ){
    return ( vec3( 1.0 ) );
  }
  return (re / count);
}
`) + shader.vertexShader;

    shader.vertexShader = shader.vertexShader.replace(
      "#include <fog_vertex>",
      remove_comments(
`#include <fog_vertex>

vec4 data_color0 = vec4( 0.0 );

if( mapping_type == 1 ){
    // is track_color is missing, or all zeros, it's invalid
    if( track_color.rgb != zeros ){
      vColor.rgb = mix( vColor.rgb, track_color.rgb, blend_factor );
    }
} else if( mapping_type == 2 ){
  // vec3 data_position = (position + shift) * scale_inv + 0.5;
  // data_color0 = sample1(
  //   data_position -
  //   scale_inv * vec3(0.5,-0.5,0.5)
  // );
  vec3 data_position = position + shift - vec3(0.5,-0.5,0.5);
  data_color0 = sample1( data_position * scale_inv + 0.5 );

#if defined( USE_COLOR_ALPHA )
  vColor.rgb = mix( max(vec3( 1.0 ) - vColor.rgb / 2.0, vColor.rgb), data_color0.rgb, blend_factor );
  if( data_color0.a == 0.0 ){
    vColor.a = 0.0;
  }

#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
	vColor.rgb = mix( max(vec3( 1.0 ) - vColor.rgb / 2.0, vColor.rgb), data_color0.rgb, blend_factor );
#endif
} else if( mapping_type == 3 ){
  if( elec_active_size > 0.0 ){
    data_color0.rgb = sample2( position + shift );
    vColor.rgb = mix( vColor.rgb, data_color0.rgb, blend_factor );
  }
}
`)
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <clipping_planes_fragment>",
      remove_comments(
`
// Remove transparent fragments

#if defined( USE_COLOR_ALPHA )
  if( vColor.a == 0.0 ){
    // gl_FragColor.a = 0.0;
    // gl_FragColor.rgba = vec4(0.0);
    discard;
  }
#endif
#include <clipping_planes_fragment>
`)
    );
  };


  return( material );
};

export { compile_free_material };
