import { Vector3, Matrix4 } from 'three';
import { remove_comments } from '../utils.js';

const SliceShader = {
  uniforms : {

    // volume data
    map : { value : null },

    // volume dimension
    mapShape : { value : new Vector3().set( 256, 256, 256 ) },

    // transform matrix from world to volume IJK
    world2IJK : { value : new Matrix4().set(1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1) },

    // values below this threshold should be discarded
    threshold : { value : 0.0 }

  },

  vertexShader: remove_comments(`#version 300 es
precision highp float;
in vec3 position;
uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
out vec4 worldPosition;

void main() {
  // obtain the world position for vertex
  worldPosition = modelMatrix * vec4( position, 1.0 );

  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}`),
  fragmentShader: remove_comments(`#version 300 es
precision highp float;
precision mediump sampler3D;
in vec4 worldPosition;
uniform float threshold;
uniform sampler3D map;
uniform vec3 mapShape;
uniform mat4 world2IJK;
out vec4 color;
void main() {
// calculate IJK, then sampler position

  vec3 samplerPosition = ((world2IJK * worldPosition).xyz) / (mapShape - 1.0);
  if( any(greaterThan( samplerPosition, vec3(1.0) )) || any( lessThan(samplerPosition, vec3(0.0)) ) ) {
    gl_FragDepth = gl_DepthRange.far;
    color.a = 0.0;
  } else {
    color.rgb = texture(map, samplerPosition).rrr;
    if( color.r <= threshold ) {
      gl_FragDepth = gl_DepthRange.far;
      color.a = 0.0;
    } else {
      gl_FragDepth = gl_FragCoord.z;
      color.a = 1.0;
    }
  }
}`)
}

export { SliceShader };
