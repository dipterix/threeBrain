import { Vector2, Vector3, Color, UniformsLib, UniformsUtils } from 'three';
import { remove_comments } from '../utils.js';

const VolumeRenderShader1 = {
    uniforms: {
      cmap: { value: null },
      alpha : { value: -1.0 },
      colorChannels : { value: 4 },
      // steps: { value: 300 },
      scale_inv: { value: new Vector3() },
      bounding: { value : 0.5 },

      stepSize: { value : 1.0 },

      // lightDirection : { value : new Vector3() },

      // only works when number of color channels is 1
      color1WhenSingleChannel: { value: new Color().setHex(0x006400) },
      color2WhenSingleChannel: { value: new Color().setHex(0x999999) },
      // camera_center: { value: new Vector2() },
    },
    vertexShader: remove_comments(`#version 300 es
precision highp float;
in vec3 position;
uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform vec3 cameraPosition;
uniform vec3 scale_inv;
// uniform float steps;
uniform float bounding;
// uniform vec2 camera_center;

out mat4 pmv;
out vec3 vOrigin;
// out vec3 vDirection;
out vec3 vPosition;
// out vec3 vSamplerBias;


void main() {
  pmv = projectionMatrix * modelViewMatrix;

  vPosition = position;

  gl_Position = pmv * vec4( position, 1.0 );
  // vSamplerBias = vec3(0.5, -0.5, -0.5) * scale_inv + 0.5;

  // For perspective camera, vorigin is camera
  // vec4 vorig = inverse( modelMatrix ) * vec4( cameraPosition, 1.0 );
  // vOrigin = - vorig.xyz * scale_inv;
  // vDirection = position * scale_inv - vOrigin;

  // Orthopgraphic camera, camera position in theory is at infinite,

  // Ideally the following calculation should generate correct results
  // vOrigin will be interpolated in fragmentShader, hence project and unproject
  vec4 vOriginProjected = gl_Position;
  vOriginProjected.z = -vOriginProjected.w;
  vOrigin = (inverse(pmv) * vOriginProjected).xyz;
  // vOrigin = gl_Position.xyw;
  // vDirection = normalize(position - vOrigin);

}
`),
    fragmentShader: remove_comments(`#version 300 es
precision highp float;
precision mediump sampler3D;
in vec3 vOrigin;
in vec3 vPosition;
// in vec3 vDirection;
// in vec3 vSamplerBias;
in mat4 pmv;
out vec4 color;
uniform sampler3D cmap;
uniform int colorChannels;
uniform vec3 color1WhenSingleChannel;
uniform vec3 color2WhenSingleChannel;
uniform float alpha;
uniform float stepSize;
uniform vec3 scale_inv;
// uniform vec3 lightDirection;
uniform float bounding;
vec4 fcolor;
vec3 fOrigin;

vec2 hitBox( vec3 orig, vec3 dir ) {
  vec3 box_min = vec3( - bounding ) / scale_inv;
  vec3 box_max = vec3( bounding ) / scale_inv;
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
  vec4 frag2 = pmv * vec4( p, 1.0 );

  return(
    (frag2.z / frag2.w * (gl_DepthRange.far - gl_DepthRange.near) +
      gl_DepthRange.near + gl_DepthRange.far) * 0.5
  );


  // ndc.z = (2.0 * gl_FragCoord.z - gl_DepthRange.near - gl_DepthRange.far) /
  //      (gl_DepthRange.far - gl_DepthRange.near);
  // return (frag2.z / frag2.w / 2.0 + 0.5);
}
vec4 sample2( vec3 p ) {
  vec4 re = texture( cmap, p * scale_inv + 0.5 );
  if( colorChannels == 1 ) {
    // using red channel as the color intensity
    re.a = re.r;
    re.rgb = color1WhenSingleChannel * re.r + color2WhenSingleChannel * (1.0 - re.r);
  }
  return re;
}

// Only used when channel number is >= 3
vec3 getNormal( vec3 p ) {
  vec4 ne;
  vec3 zero3 = vec3(0.0, 0.0, 0.0);
  vec3 normal = zero3;
  vec3 pos0 = p * scale_inv + 0.5;
  vec3 pos = pos0;
  vec4 re = texture( cmap, pos0 );

  if( re.a == 0.0 || re.rgb == zero3 ) {
    return normal;
  }

  float stp = max(max(abs(scale_inv.x), abs(scale_inv.y)), abs(scale_inv.z)) * 1.74;
  vec2 dt = vec2(stp, stp);


  // normal along xy
  pos.xy = pos0.xy + dt;
  ne = texture( cmap, pos );

  if( ne.a != 0.0 && (ne.rgb != re.rgb || ne.rgb != zero3) ) {
    normal.xy += dt;
  }

  pos.xy = pos0.xy - dt;
  ne = texture( cmap, pos );

  if( ne.a != 0.0 && (ne.rgb != re.rgb || ne.rgb != zero3) ) {
    normal.xy -= dt;
  }

  // normal along xz
  pos.y = pos0.y;
  pos.xz = pos0.xz + dt;
  ne = texture( cmap, pos );

  if( ne.a != 0.0 && (ne.rgb != re.rgb || ne.rgb != zero3) ) {
    normal.xz += dt;
  }

  pos.xz = pos0.xz - dt;
  ne = texture( cmap, pos );

  if( ne.a != 0.0 && (ne.rgb != re.rgb || ne.rgb != zero3) ) {
    normal.xz -= dt;
  }

  // normal along yz
  pos.x = pos0.x;
  pos.yz = pos0.yz + dt;
  ne = texture( cmap, pos );

  if( ne.a != 0.0 && (ne.rgb != re.rgb || ne.rgb != zero3) ) {
    normal.yz += dt;
  }

  pos.yz = pos0.yz - dt;
  ne = texture( cmap, pos );

  if( ne.a != 0.0 && (ne.rgb != re.rgb || ne.rgb != zero3) ) {
    normal.yz -= dt;
  }


  return normalize( normal );
}

void main(){

  // vec4 vOriginProjected = pmv * vec4( vPosition, 1.0 );
  // vOriginProjected.z = -vOriginProjected.w;
  // fOrigin = (inverse(pmv) * vOriginProjected).xyz;
  fOrigin = vOrigin;

  // vec3 rayDir = normalize( vDirection );
  vec3 rayDir = normalize( vPosition - vOrigin );

  vec2 bounds = hitBox( fOrigin, rayDir );
  if ( bounds.x > bounds.y ) discard;
  bounds.x = max( bounds.x, 0.0 );
  // 0-255 need to be 0.5-255.5

  // bounds.x is the length of ray
  vec3 p = fOrigin + bounds.x * rayDir;
  vec3 inc = 1.0 / abs( rayDir );
  float delta = min( inc.x, min( inc.y, inc.z ) ) * max( abs( stepSize ), 0.1 );
  // float delta = 0.5 / max( abs(rayDir.x), max( abs(rayDir.y), abs(rayDir.z) ) );

  int nn = 0;
  int valid_voxel = 0;
  float mix_factor = 1.0;
  vec4 last_color = vec4( 0.0, 0.0, 0.0, 0.0 );
  vec3 zero_rgb = vec3( 0.0, 0.0, 0.0 );
  vec3 nmal;

  for ( float t = bounds.x; t < bounds.y; t += delta ) {
    fcolor = sample2( p );

    // Hit voxel
    if( fcolor.a > 0.0 && fcolor.rgb != zero_rgb ){

      if( alpha > 0.0 ){
        fcolor.a *= alpha;
      } else {
        fcolor.a = 1.0;
      }


      if( fcolor.rgb != last_color.rgb ){
        // We are right on the surface

        last_color = fcolor;

        if( nn == 0 ){
          gl_FragDepth = getDepth( p );
          color = fcolor;


          if( colorChannels > 1 ) {
            nmal = getNormal( p );
            if(nmal != vec3(0.0, 0.0, 0.0)) {

              // color.rgb *= pow(max( abs(dot(lightDirection, normalize(nmal))) , 1.0), 0.3);
              color.rgb *= pow(max( abs(dot(rayDir, normalize(nmal - rayDir) )) , 0.25), 0.3);
            }
          }

          color.a = max( color.a, 0.2 );
        } else {
          // blend
          color.rgb = vec3( color.a ) * color.rgb + vec3( 1.0 - color.a ) * fcolor.rgb;
          color.a = color.a + ( 1.0 - color.a ) * fcolor.a;
          color = vec4( color.a ) * color + vec4( 1.0 - color.a ) * fcolor;
        }

        nn++;

      } else {

        color.a = min(color.a + 0.005, 1.0);

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
