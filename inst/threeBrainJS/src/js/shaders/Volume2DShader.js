import { Vector3 } from 'three';

const Volume2dArrayShader_xy = {
  uniforms: {
    diffuse: { value: null },
		depth: { value: 0 },
		size: { value: new Vector3( 256, 256, 256 ) },
		threshold: { value : 0.0 },
		renderDepth: { value : 1.0 }
	},
	vertexShader: [
    // '#version 300 es',
    'uniform vec3 size;',
    'out vec2 vUv;',
    'void main() {',
    'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',

    // Convert position.xy to 1.0-0.0
    'vUv.xy = position.xy / size.xy + 0.5;',
    // 'vUv.y = 1.0 - vUv.y;', // original data is upside down // No, it's not, it's the orientation thing, do not do it here
    '}'
	].join( '\n' ),
  fragmentShader: [
    // '#version 300 es',

    'precision highp float;',
    'precision highp int;',
    'precision highp sampler2DArray;',

    'uniform sampler2DArray diffuse;',
    'in vec2 vUv;',
    'uniform int depth;',
    'uniform float threshold;',
    'uniform float renderDepth;',
    // 'out vec4 out_FragColor;',

    'void main() {',

    'vec4 color = texture( diffuse, vec3( vUv, depth ) );',

    'float is_opaque = float( color.r > threshold );',

    // calculating z-depth, if transparent, make depth 1 (far)
    'gl_FragDepth = (1.0 - is_opaque * renderDepth) * (1.0 - gl_FragCoord.z) + gl_FragCoord.z;',

    // lighten a bit
    'gl_FragColor = vec4( color.rrr, is_opaque );',

    '}'
  ].join( '\n' )
};




const Volume2dArrayShader_xz = {
  uniforms: {
    diffuse: { value: null },
		depth: { value: 0 },
		size: { value: new Vector3( 256, 256, 256 ) },
		threshold: { value : 0.0 },
		renderDepth: { value : 1.0 }
	},
	vertexShader: [
    // '#version 300 es',
    'uniform vec3 size;',
    'out vec2 vUv;',
    'void main() {',

    'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',

    // Convert position.xz to 1.0-0.0
    'vUv.xy = position.xy / size.xz + 0.5;',
    // 'vUv.y = 1.0 - vUv.y;', // original data is upside down // No, it's not, it's the orientation thing, do not do it here
    '}'
	].join( '\n' ),
  fragmentShader: [
    // '#version 300 es',

    'precision highp float;',
    'precision highp int;',
    'precision highp sampler2DArray;',

    'uniform sampler2DArray diffuse;',
    'uniform vec3 size;',
    'in vec2 vUv;',
    'uniform float depth;',
    'uniform float threshold;',
    'uniform float renderDepth;',
    // 'out vec4 out_FragColor;',

    'void main() {',

    'vec4 color = texture( diffuse, vec3( vUv.x, depth / size.y, floor( vUv.y * size.z ) ) );',

    'float is_opaque = float( color.r > threshold );',

    'gl_FragDepth = (1.0 - is_opaque * renderDepth) * (1.0 - gl_FragCoord.z) + gl_FragCoord.z;',

    // lighten a bit
    'gl_FragColor = vec4( color.rrr, is_opaque );',

    '}'
  ].join( '\n' )
};

const Volume2dArrayShader_yz = {
  uniforms: {
    diffuse: { value: null },
		depth: { value: 0 },
		size: { value: new Vector3( 256, 256, 256 ) },
		threshold: { value : 0.0 },
		renderDepth: { value : 1.0 }
	},
	vertexShader: [
    // '#version 300 es',
    'uniform vec3 size;',
    'out vec2 vUv;',
    'void main() {',

    'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',

    // Convert position.xz to 1.0-0.0
    'vUv.xy = position.xy / size.yz + 0.5;',
    // 'vUv.y = 1.0 - vUv.y;', // original data is upside down // No, it's not, it's the orientation thing, do not do it here
    '}'
	].join( '\n' ),
  fragmentShader: [
    // '#version 300 es',

    'precision highp float;',
    'precision highp int;',
    'precision highp sampler2DArray;',

    'uniform sampler2DArray diffuse;',
    'uniform vec3 size;',
    'in vec2 vUv;',
    'uniform float depth;',
    'uniform float threshold;',
    'uniform float renderDepth;',
    // 'out vec4 out_FragColor;',

    'void main() {',

    'vec4 color = texture( diffuse, vec3( depth / size.x, vUv.x, floor( vUv.y * size.z ) ) );',

    'float is_opaque = float( color.r > threshold );',

    'gl_FragDepth = (1.0 - is_opaque * renderDepth) * (1.0 - gl_FragCoord.z) + gl_FragCoord.z;',

    // lighten a bit
    'gl_FragColor = vec4( color.rrr, is_opaque );',

    '}'
  ].join( '\n' )
};

export {
  Volume2dArrayShader_xy,
  Volume2dArrayShader_xz,
  Volume2dArrayShader_yz
};
