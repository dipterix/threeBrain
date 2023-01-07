import { Vector2, Vector3 } from 'three';
import { remove_comments } from '../utils.js';

const VolumeRenderShader1 = {
    uniforms: {
      cmap: { value: null },
      nmap: { value: null },
      mask: { value: null },
      alpha : { value: -1.0 },
      // steps: { value: 300 },
      scale_inv: { value: new Vector3() },
      bounding: { value : 0.5 },
      depthMix: { value: 1 }
      // camera_center: { value: new Vector2() },
    },
    vertexShader: remove_comments(`#version 300 es
precision highp float;
precision mediump sampler3D;
in vec3 position;
in vec3 normal;
uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform vec3 cameraPosition;
uniform vec3 scale_inv;
// uniform float steps;
uniform float bounding;
// uniform vec2 camera_center;

out mat4 pmv;
out vec3 vOrigin;
out vec3 vDirection;
out vec3 vSamplerBias;


void main() {
  pmv = projectionMatrix * modelViewMatrix;

  gl_Position = pmv * vec4( position, 1.0 );
  // gl_Position.xy += camera_center;

  // For perspective camera, vorigin is camera
  // vec4 vorig = inverse( modelMatrix ) * vec4( cameraPosition, 1.0 );
  // vOrigin = - vorig.xyz * scale_inv;
  // vDirection = position * scale_inv - vOrigin;

  // Orthopgraphic camera, camera position in theory is at infinite
  // instead of using camera's position, we can directly inverse (projectionMatrix * modelViewMatrix)
  // Because projectionMatrix * modelViewMatrix * anything is centered at 0,0,0,1, hence inverse this procedure
  // obtains Orthopgraphic direction, which can be directly used as ray direction

  // 'vDirection = vec3( inverse( pmv ) * vec4( 0.0,0.0,0.0,1.0 ) ) / scale;',
  // vDirection = inverse( pmv )[3].xyz * scale_inv;
  vec4 vdir = inverse( pmv ) * vec4( 0.0, 0.0, 1.0, 0.0 );
  vDirection = vdir.xyz * scale_inv; //  / vdir.w;
  vSamplerBias = vec3(0.5, -0.5, -0.5) * scale_inv + 0.5;

  // Previous test code, seems to be poor because camera position is not well-calculated?
  // 'vDirection = - normalize( vec3( inverse( modelMatrix ) * vec4( cameraPos , 1.0 ) ).xyz ) * 1000.0;',
  // vOrigin = (position - vec3(0.6,-0.6,0.6)) * scale_inv - vDirection;
  // vOrigin = (inverse( pmv ) * vec4( camera_center, gl_Position.z - 1.0, gl_Position.w )).xyz * scale_inv;
  vOrigin = (position) * scale_inv - vDirection;


}
`),
    fragmentShader: remove_comments(`#version 300 es
precision highp float;
precision mediump sampler3D;
in vec3 vOrigin;
in vec3 vDirection;
in vec3 vSamplerBias;
in mat4 pmv;
out vec4 color;
uniform sampler3D cmap;
uniform sampler3D nmap;
uniform float alpha;
// uniform float steps;
uniform vec3 scale_inv;
uniform float bounding;
uniform float depthMix;
vec4 fcolor;
vec3 fOrigin;
vec3 fDirection;
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

  return(
    (frag2.z / frag2.w * (gl_DepthRange.far - gl_DepthRange.near) +
      gl_DepthRange.near + gl_DepthRange.far) * 0.5
  );


  // ndc.z = (2.0 * gl_FragCoord.z - gl_DepthRange.near - gl_DepthRange.far) /
  //      (gl_DepthRange.far - gl_DepthRange.near);
  // return (frag2.z / frag2.w / 2.0 + 0.5);
}
vec4 sample2( vec3 p ) {
  return texture( cmap, p + vSamplerBias );
}
vec3 getNormal( vec3 p ) {
  vec3 re = texture( nmap, p + vSamplerBias ).rgb  *  255.0 - 127.0 ;
  return normalize( re );
}

void main(){
  fDirection = vDirection;
  fOrigin = vOrigin;

  vec3 rayDir = normalize( fDirection );
  vec2 bounds = hitBox( fOrigin, rayDir );
  if ( bounds.x > bounds.y ) discard;
  bounds.x = max( bounds.x, 0.0 );
  // 0-255 need to be 0.5-255.5

  // bounds.x is the length of ray
  vec3 p = fOrigin + bounds.x * rayDir;
  vec3 inc = scale_inv / abs( rayDir );
  float delta = min( inc.x, min( inc.y, inc.z ) );

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

        fcolor.rgb *= pow(
          max(abs(dot(rayDir, getNormal( p ))), 0.25),
          0.45
        );

        if( nn == 0 ){
          gl_FragDepth = getDepth( p ) * depthMix + gl_FragDepth * (1.0 - depthMix);
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
`)};


export { VolumeRenderShader1 };
