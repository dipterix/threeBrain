
const compile_free_material = ( material, options, target_renderer ) => {

  if( material.userData.compiled ){ return; }

  material.userData.compiled = false;
  material.userData.options = options;

  material.onBeforeCompile = ( shader , renderer ) => {


    shader.uniforms.which_map = options.which_map;
    shader.uniforms.volume_map = options.volume_map;
    shader.uniforms.scale_inv = options.scale_inv;
    shader.uniforms.shift = options.shift;
    shader.uniforms.sampler_bias = options.sampler_bias;
    shader.uniforms.sampler_step = options.sampler_step;

    material.userData.shader = shader;

    if( target_renderer !== undefined ){
      if( target_renderer !== renderer ){
        return;
      }
    }
    material.userData.compiled = true;

    shader.vertexShader = `
precision mediump sampler3D;
uniform int which_map;
uniform sampler3D volume_map;
uniform vec3 scale_inv;
uniform vec3 shift;
uniform float sampler_bias;
uniform float sampler_step;

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
    ` + shader.vertexShader;

    shader.vertexShader = shader.vertexShader.replace(
      "#include <fog_vertex>",
      `#include <fog_vertex>

if( which_map == 1 ){
    // is track_color is missing, or all zeros, it's invalid
    if( track_color.rgb != zeros ){
      vColor.rgb = mix( vColor.rgb, track_color, 0.4 );
    }
} else if( which_map == 2 ){
  vec3 data_position = (position + shift) * scale_inv + 0.5;
  vec4 data_color0 = sample1( data_position - scale_inv * vec3(0.5,-0.5,0.5) );
#if defined( USE_COLOR_ALPHA )
	vColor = mix( max(vec3( 1.0 ) - vColor / 2.0, vColor), data_color0, 0.4 );
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
	vColor.rgb = mix( max(vec3( 1.0 ) - vColor.rgb / 2.0, vColor.rgb), data_color0.rgb, 0.4 );
#endif
}
      `.split("\n").map((e) => {
          return(
            e.replaceAll(/\/\/.*/g, "")
          );
        }).join("\n")
    );

  };


  return( material );
}

export { compile_free_material };
