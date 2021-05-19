
const register_volumeShader1 = function(THREE){

  THREE.VolumeRenderShader1 = {
  	uniforms: {
  	  map: { value: null },
  	  cmap: { value: null },
  	  mask: { value: null },
  	  cameraPos: { value: new THREE.Vector3() },
  	  threshold_lb: { value: 0 },
  	  value_scale: { value: 1 },
  	  alpha : { value: 1.0 },
  	  steps: { value: 300 },
  	  scale: { value: new THREE.Vector3() },
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
			'uniform vec3 scale;',

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
				'vDirection = inverse( pmv )[3].xyz / scale;',

				// Previous test code, seems to be poor because camera position is not well-calculated?
				// 'vDirection = - normalize( vec3( inverse( modelMatrix ) * vec4( cameraPos , 1.0 ) ).xyz ) * 1000.0;',
				'vOrigin = position / scale - vDirection; ',
				'gl_Position = pmv * vec4( position, 1.0 );',
			'}'
		].join( '\n' ),
  	fragmentShader: [
  	  '#version 300 es',
			'precision highp float;',
			'precision highp sampler3D;',

			'in vec3 vOrigin;',
			'in vec3 vDirection;',
			'in mat4 pmv;',
			'out vec4 color;',


			'uniform sampler3D map;',
			'uniform sampler3D cmap;',
			'uniform float threshold_lb;',
			'uniform float value_scale;',
			'uniform float alpha;',
			'uniform float steps;',
			'uniform vec3 scale;',
			'uniform float bounding;',

			'vec3 fcolor;',

			'vec2 hitBox( vec3 orig, vec3 dir ) {',
				'vec3 box_min = vec3( - bounding );',
				'vec3 box_max = vec3( bounding );',
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
			  'vec4 frag2 = pmv * vec4( p, 1.0 / scale );',
			  'return (frag2.z / frag2.w / 2.0 + 0.5);',
			'}',

			'float sample1( vec3 p ) {',
				'return texture( map, p + 0.5 ).r;',
			'}',
			'vec3 sample2( vec3 p ) {',
				'return normalize( texture( cmap, p + 0.5 ) ).rgb;',
			'}',

			// Make color, to be changed
			'vec3 getNormal( vec3 p ) {',
				'vec3 inv = 1.0 / scale;',
				'float d = sample1( p );',
				'vec3 re = vec3( 0.0 );',
				'for( float xidx = -1.0; xidx <= 1.0; xidx += 1.0 ){',
				  'for( float yidx = -1.0; yidx <= 1.0; yidx += 1.0 ){',
				    'for( float zidx = -1.0; zidx <= 1.0; zidx += 1.0 ){',
				      'if( sample1( p + inv * vec3( xidx, yidx, zidx) ) == d ){',
				        're -= inv * vec3( xidx, yidx, zidx);',
				      '}',
				    '}',
				  '}',
				'}',
				'return normalize( re );',
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

				// Calculate depth (linear)
				// 'float depth_start = getDepth( p );',
				// 'float depth_inc = getDepth( p + rayDir * delta ) - depth_start;',
				// 'float depth_p = depth_start;',

				// ray marching
				'float nn = 0.0;',
				'float mix_factor = 1.0;',
				'vec3 last_color = vec3( 0.0, 0.0, 0.0 );',
				'for ( float t = bounds.x; t < bounds.y; t += delta ) {',
					'float d = sample1( p ) * value_scale;',
					'if ( abs(d - threshold_lb) < 0.5 ) {',
						'fcolor = sample2( p );',
						'if( !(fcolor.r == 0.0 && fcolor.g == 0.0 && fcolor.b == 0.0) && fcolor != last_color ){',
              'if( nn == 0.0 ){',
                'color.a = alpha;',
  						  'gl_FragDepth = getDepth( p );',
  						  'color.rgb = fcolor * max( dot(-rayDir, getNormal( p )) , 0.0 );',
              '}',
              'if( nn > 0.0 && alpha < 1.0 ){',
                'color.rgb = mix(color.rgb, fcolor, mix_factor);',
              '}',
              'nn += 1.0;',
              'mix_factor *= 1.0 - alpha;',
              'last_color = fcolor;',

              //  optimize, do not march to the hell
              'if( nn >= 4.0 || alpha >= 0.99999 ){',
  						  'break;',
              '}',
						'}',
					'}',
					'p += rayDir * delta;',
				'}',
				'if ( nn == 0.0 || color.a == 0.0 ) discard;',
				'color.rgb /= (nn - 1.0) / 2.0 + 1.0;',
			'}'
  	].join( '\n' )
  };

  return(THREE);

};


export { register_volumeShader1 };
