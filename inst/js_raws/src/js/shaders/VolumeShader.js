
const register_volumeShader1 = function(THREE){

  THREE.VolumeRenderShader1 = {
    uniforms: {
      cmap: { value: null },
      nmap: { value: null },
      mask: { value: null },
      cameraPos: { value: new THREE.Vector3() },
      alpha : { value: -1.0 },
      steps: { value: 300 },
      scale_inv: { value: new THREE.Vector3() },
      bounding: { value : 0.5 }
    },
    vertexShader: [
      '#version 300 es',
      'precision highp float;',
      'in vec3 position;',
      // 'uniform mat4 modelMatrix;',
      'uniform mat4 modelViewMatrix;',
      'uniform mat4 projectionMatrix;',
      'uniform vec3 cameraPos;',
      'uniform vec3 scale_inv;',

      'out mat4 pmv;',
      'out vec3 vOrigin;',
      'out vec3 vDirection;',
      'void main() {',
        'pmv = projectionMatrix * modelViewMatrix;',
        // For perspective camera, vorigin is camera
        // 'vOrigin = vec3( inverse( modelMatrix ) * vec4( cameraPos, 1.0 ) ).xyz / scale;',
        // 'vDirection = position / scale - vOrigin;',

        // Orthopgraphic camera, camera position in theory is at infinite
        // instead of using camera's position, we can directly inverse (projectionMatrix * modelViewMatrix)
        // Because projectionMatrix * modelViewMatrix * anything is centered at 0,0,0,1, hence inverse this procedure
        // obtains Orthopgraphic direction, which can be directly used as ray direction

        // 'vDirection = vec3( inverse( pmv ) * vec4( 0.0,0.0,0.0,1.0 ) ) / scale;',
        'vDirection = inverse( pmv )[3].xyz * scale_inv;',

        // Previous test code, seems to be poor because camera position is not well-calculated?
        // 'vDirection = - normalize( vec3( inverse( modelMatrix ) * vec4( cameraPos , 1.0 ) ).xyz ) * 1000.0;',
        'vOrigin = position * scale_inv - vDirection; ',
        'gl_Position = pmv * vec4( position, 1.0 );',
      '}'
    ].join( '\n' ),
    fragmentShader: `#version 300 es
precision highp float;
precision highp sampler3D;
in vec3 vOrigin;
in vec3 vDirection;
in mat4 pmv;
out vec4 color;
uniform sampler3D cmap;
uniform sampler3D nmap;
uniform float alpha;
uniform float steps;
uniform vec3 scale_inv;
uniform float bounding;
vec4 fcolor;
vec2 hitBox( vec3 orig, vec3 dir ) {
  vec3 box_min = vec3( - bounding );
  vec3 box_max = vec3( bounding );
  vec3 inv_dir = 1.0 / dir;
  vec3 tmin_tmp = ( box_min - orig ) * inv_dir;
  vec3 tmax_tmp = ( box_max - orig ) * inv_dir;
  vec3 tmin = min( tmin_tmp, tmax_tmp );
  vec3 tmax = max( tmin_tmp, tmax_tmp );
  float t0 = max( tmin.x, max( tmin.y, tmin.z ) );
  float t1 = min( tmax.x, min( tmax.y, tmax.z ) );
  return vec2( t0, t1 );
}
float getDepth( vec3 p ){
  vec4 frag2 = pmv * vec4( p, scale_inv );
  return (frag2.z / frag2.w / 2.0 + 0.5);
}
vec4 sample2( vec3 p ) {
  return texture( cmap, p + 0.5 );
}
vec3 getNormal( vec3 p ) {
  vec3 re = vec3( texture( nmap, p + 0.5 ).rgb *  255.0 - 127.0 );
  return normalize( re );
}

void main(){
  vec3 rayDir = normalize( vDirection );
  vec2 bounds = hitBox( vOrigin, rayDir );
  if ( bounds.x > bounds.y ) discard;
  bounds.x = max( bounds.x, 0.0 );
  vec3 p = vOrigin + bounds.x * rayDir;
  vec3 inc = 1.0 / abs( rayDir );
  float delta = min( inc.x, min( inc.y, inc.z ) );
  delta /= steps;

  int nn = 0;
  int valid_voxel = 0;
  float mix_factor = 1.0;
  vec4 last_color = vec4( 0.0, 0.0, 0.0, 0.0 );
  vec3 zero_rgb = vec3( 0.0, 0.0, 0.0 );

  for ( float t = bounds.x; t < bounds.y; t += delta ) {
    fcolor = sample2( p );

    // Hit voxel
    if( fcolor.a > 0.0 && fcolor.rgb != zero_rgb ){

      if( alpha >= 0.0 ){
        fcolor.a = alpha;
      }


      if( fcolor.rgb != last_color.rgb ){
        // We are right on the surface

        last_color = fcolor;

        // reflect light
        fcolor.rgb *= max( dot(-rayDir, getNormal( p )) , 0.5 );

        if( nn == 0 ){
          gl_FragDepth = getDepth( p );
          color = fcolor;
          color.a = max( color.a, 0.2 );
        } else {
          // blend
          color.rgb = vec3( color.a ) * color.rgb + vec3( 1.0 - color.a ) * fcolor.rgb;
          color.a = color.a + ( 1.0 - color.a ) * fcolor.a;
          // color = vec4( color.a ) * color + vec4( 1.0 - color.a ) * fcolor;
        }

        nn++;

      }

      valid_voxel = 1;

      if( nn >= 10 || color.a > 0.95 ){
        break;
      }

    } else if ( valid_voxel > 0 ) {

      // Leaving the structure reset states
      last_color.rgb = zero_rgb;
      valid_voxel = 0;
    }
    p += rayDir * delta;
  }
  if ( nn == 0 || color.a == 0.0 ) discard;

  // calculate alpha at depth
}
    `.split("\n").map((e) => {
      return(
        e.replaceAll(/\/\/.*/g, "")
      );
    }).join("\n")
  };

  return(THREE);

};


export { register_volumeShader1 };
