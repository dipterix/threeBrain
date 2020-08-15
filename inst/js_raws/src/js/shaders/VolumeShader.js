
const register_volumeShader1 = function(THREE){

  THREE.VolumeRenderShader1 = {
  	uniforms: {
  	  map: { value: null },
  	  cmap: { value: null },
  	  cameraPos: { value: new THREE.Vector3() },
  	  threshold_lb: { value: 0 },
  	  threshold_ub: { value: 1 },
  	  alpha : { value: 1.0 },
  	  steps: { value: 300 },
  	  scale: { value: new THREE.Vector3() }
  	},
		vertexShader: [
		  '#version 300 es',
		  'precision highp float;',
		  'in vec3 position;',
			'uniform mat4 modelMatrix;',
			'uniform mat4 modelViewMatrix;',
			'uniform mat4 projectionMatrix;',
			'uniform vec3 cameraPos;',
			'uniform vec3 scale;',
			'out vec3 vOrigin;',
			'out vec3 vDirection;',
			'void main() {',
				'vec4 worldPosition = modelViewMatrix * vec4( position, 1.0 );',
				// For perspective camera, vorigin is camera
				// 'vOrigin = vec3( inverse( modelMatrix ) * vec4( cameraPos, 1.0 ) ).xyz / scale;',

				// IMPORTANT: this takes me literally 24 hr to figure out, learnt how to write shaders and  properties of different camera
				// Orthopgraphic camera, vDirection must be parallel to camera (ortho-projection, camera position in theory is at infinite)
				'vOrigin = vec3( inverse( modelMatrix ) * vec4( cameraPos + position, 1.0 ) ).xyz / scale;',
				'vDirection = position / scale - vOrigin;',
				'gl_Position = projectionMatrix * worldPosition;',
			'}'
		].join( '\n' ),
  	fragmentShader: [
  	  '#version 300 es',
			'precision highp float;',
			'precision highp sampler3D;',

			'uniform mat4 modelViewMatrix;',
			'uniform mat4 projectionMatrix;',

			'in vec3 vOrigin;',
			'in vec3 vDirection;',
			'out vec4 color;',

			'uniform sampler3D map;',
			'uniform sampler3D cmap;',
			'uniform float threshold_lb;',
			'uniform float threshold_ub;',
			'uniform float alpha;',
			'uniform float steps;',
			'uniform vec3 scale;',

			'vec2 hitBox( vec3 orig, vec3 dir ) {',
				'const vec3 box_min = vec3( - 0.5 );',
				'const vec3 box_max = vec3( 0.5 );',
				'vec3 inv_dir = 1.0 / dir;',
				'vec3 tmin_tmp = ( box_min - orig ) * inv_dir;',
				'vec3 tmax_tmp = ( box_max - orig ) * inv_dir;',
				'vec3 tmin = min( tmin_tmp, tmax_tmp );',
				'vec3 tmax = max( tmin_tmp, tmax_tmp );',
				'float t0 = max( tmin.x, max( tmin.y, tmin.z ) );',
				'float t1 = min( tmax.x, min( tmax.y, tmax.z ) );',
				'return vec2( t0, t1 );',
			'}',

			'float getDepth( vec3 p ){',
			  'vec4 frag2 = projectionMatrix * modelViewMatrix * vec4( p * scale, 1.0 );',
			  'return (frag2.z / frag2.w / 2.0 + 0.5);',
			'}',

			'float sample1( vec3 p ) {',
				'return texture( map, p ).r;',
			'}',
			'vec3 sample2( vec3 p ) {',
				'return normalize( texture( cmap, p.xyz ).rgb );',
			'}',

			'#define epsilon .0001',

			// Make color, to be changed
			'vec3 normal( vec3 coord ) {',
				'if ( coord.x < epsilon ) return vec3( 1.0, 0.0, 0.0 );',
				'if ( coord.y < epsilon ) return vec3( 0.0, 1.0, 0.0 );',
				'if ( coord.z < epsilon ) return vec3( 0.0, 0.0, 1.0 );',
				'if ( coord.x > 1.0 - epsilon ) return vec3( - 1.0, 0.0, 0.0 );',
				'if ( coord.y > 1.0 - epsilon ) return vec3( 0.0, - 1.0, 0.0 );',
				'if ( coord.z > 1.0 - epsilon ) return vec3( 0.0, 0.0, - 1.0 );',
				'float step = 0.01;',
				'float x = sample1( coord + vec3( - step, 0.0, 0.0 ) ) - sample1( coord + vec3( step, 0.0, 0.0 ) );',
				'float y = sample1( coord + vec3( 0.0, - step, 0.0 ) ) - sample1( coord + vec3( 0.0, step, 0.0 ) );',
				'float z = sample1( coord + vec3( 0.0, 0.0, - step ) ) - sample1( coord + vec3( 0.0, 0.0, step ) );',
				'return normalize( vec3( x, y, z ) );',
			'}',

			'void main(){',
				'vec3 rayDir = normalize( vDirection );',
				'vec2 bounds = hitBox( vOrigin, rayDir );',
				'if ( bounds.x > bounds.y ) discard;',

				'bounds.x = max( bounds.x, 0.0 );',
				'vec3 p = vOrigin + bounds.x * rayDir;',
				'vec3 inc = 1.0 / abs( rayDir );',

				'float delta = min( inc.x, min( inc.y, inc.z ) );',
				'delta /= steps;',

				// ray marching
				'for ( float t = bounds.x; t < bounds.y; t += delta ) {',
					'float d = sample1( p + 0.5 );',
					'if ( d > threshold_lb && d <= threshold_ub ) {',
						'color.rgb = sample2( p + 0.5 );',
						'if( !(color.r == 0.0 && color.g == 0.0 && color.b == 0.0) ){',
						  'color.a = alpha;',

  						'gl_FragDepth = getDepth( p );',
  						'break;',
						'}',
					'}',
					'p += rayDir * delta;',
				'}',
				'if ( color.a == 0.0 ) discard;',
			'}'
  	].join( '\n' )
  };

  return(THREE);

};


export { register_volumeShader1 };
