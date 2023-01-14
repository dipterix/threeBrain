/**
 * @author Almar Klein / http://almarklein.org
 *
 * Shaders to render 3D volumes using raycasting.
 * The applied techniques are based on similar implementations in the Visvis and Vispy projects.
 * This is not the only approach, therefore it's marked 1.
 */


const register_volumeShader1 = function(THREE){

  THREE.VolumeRenderShader1 = {
  	uniforms: {
  				"u_size": { value: new THREE.Vector3( 1, 1, 1 ) },
  				"u_renderstyle": { value: 0 },
  				"u_renderthreshold": { value: 0.5 },
  				"u_clim": { value: new THREE.Vector2( 1, 1 ) },
  				"u_data": { value: null },
  				"u_cmdata": { value: null }
  		},
  		vertexShader: [
  				'varying vec4 v_nearpos;',
  				'varying vec4 v_farpos;',
  				'varying vec3 v_position;',
  				'varying mat4 m_proj_mat;',

  				'mat4 inversemat(mat4 m) {',
  						// Taken from https://github.com/stackgl/glsl-inverse/blob/master/index.glsl
  						// This function is licenced by the MIT license to Mikola Lysenko
  						'float',
  						'a00 = m[0][0], a01 = m[0][1], a02 = m[0][2], a03 = m[0][3],',
  						'a10 = m[1][0], a11 = m[1][1], a12 = m[1][2], a13 = m[1][3],',
  						'a20 = m[2][0], a21 = m[2][1], a22 = m[2][2], a23 = m[2][3],',
  						'a30 = m[3][0], a31 = m[3][1], a32 = m[3][2], a33 = m[3][3],',

  						'b00 = a00 * a11 - a01 * a10,',
  						'b01 = a00 * a12 - a02 * a10,',
  						'b02 = a00 * a13 - a03 * a10,',
  						'b03 = a01 * a12 - a02 * a11,',
  						'b04 = a01 * a13 - a03 * a11,',
  						'b05 = a02 * a13 - a03 * a12,',
  						'b06 = a20 * a31 - a21 * a30,',
  						'b07 = a20 * a32 - a22 * a30,',
  						'b08 = a20 * a33 - a23 * a30,',
  						'b09 = a21 * a32 - a22 * a31,',
  						'b10 = a21 * a33 - a23 * a31,',
  						'b11 = a22 * a33 - a23 * a32,',

  						'det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;',

  				'return mat4(',
  						'a11 * b11 - a12 * b10 + a13 * b09,',
  						'a02 * b10 - a01 * b11 - a03 * b09,',
  						'a31 * b05 - a32 * b04 + a33 * b03,',
  						'a22 * b04 - a21 * b05 - a23 * b03,',
  						'a12 * b08 - a10 * b11 - a13 * b07,',
  						'a00 * b11 - a02 * b08 + a03 * b07,',
  						'a32 * b02 - a30 * b05 - a33 * b01,',
  						'a20 * b05 - a22 * b02 + a23 * b01,',
  						'a10 * b10 - a11 * b08 + a13 * b06,',
  						'a01 * b08 - a00 * b10 - a03 * b06,',
  						'a30 * b04 - a31 * b02 + a33 * b00,',
  						'a21 * b02 - a20 * b04 - a23 * b00,',
  						'a11 * b07 - a10 * b09 - a12 * b06,',
  						'a00 * b09 - a01 * b07 + a02 * b06,',
  						'a31 * b01 - a30 * b03 - a32 * b00,',
  						'a20 * b03 - a21 * b01 + a22 * b00) / det;',
  				'}',


  				'void main() {',
  						// Prepare transforms to map to "camera view". See also:
  						// https://threejs.org/docs/#api/renderers/webgl/WebGLProgram
  						'mat4 viewtransformf = viewMatrix;',
  						'mat4 viewtransformi = inversemat(viewMatrix);',

  						'v_position = position;',

  						// Project local vertex coordinate to camera position. Then do a step
  						// backward (in cam coords) to the near clipping plane, and project back. Do
  						// the same for the far clipping plane. This gives us all the information we
  						// need to calculate the ray and truncate it to the viewing cone.
  						'vec4 position4 = vec4(v_position, 1.0);',
  						'vec4 pos_in_cam = viewtransformf * position4;',

  						// Intersection of ray and near clipping plane (z = -1 in clip coords)
  						'pos_in_cam.z = -pos_in_cam.w;',
  						'v_nearpos = viewtransformi * pos_in_cam / pos_in_cam.w;',

  						// Intersection of ray and far clipping plane (z = +1 in clip coords)
  						'pos_in_cam.z = pos_in_cam.w;',
  						'v_farpos = viewtransformi * pos_in_cam / pos_in_cam.w;',

  						// Set varyings and output pos
  						'm_proj_mat = projectionMatrix* viewMatrix * modelMatrix;',

  						'gl_Position = projectionMatrix * viewMatrix * modelMatrix * position4;',
  				'}',
  		].join( '\n' ),
  	  fragmentShader: [
  				'precision highp float;',
  				'precision mediump sampler3D;',

  				'uniform vec3 u_size;',
  				'uniform int u_renderstyle;',
  				'uniform float u_renderthreshold;',
  				'uniform vec2 u_clim;',

  				'uniform sampler3D u_data;',
  				'uniform sampler2D u_cmdata;',

  				'varying vec3 v_position;',
  				'varying vec4 v_nearpos;',
  				'varying vec4 v_farpos;',
  				'varying mat4 m_proj_mat;',

  				// The maximum distance through our rendering volume is sqrt(3).
  				'const int MAX_STEPS = 887;	// 887 for 512^3, 1774 for 1024^3',
  				'const int REFINEMENT_STEPS = 4;',
  				'const float relative_step_size = 1.0;',
  				'const vec4 ambient_color = vec4(0.2, 0.4, 0.2, 1.0);',
  				'const vec4 diffuse_color = vec4(0.8, 0.2, 0.2, 1.0);',
  				'const vec4 specular_color = vec4(1.0, 1.0, 1.0, 1.0);',
  				'const float shininess = 40.0;',

  				'void cast_mip(vec3 start_loc, vec3 step, int nsteps, vec3 view_ray);',
  				'void cast_iso(vec3 start_loc, vec3 step, int nsteps, vec3 view_ray);',

  				'float sample1(vec3 texcoords);',
  				'vec4 apply_colormap(float val);',
  				'vec4 add_lighting(float val, vec3 loc, vec3 step, vec3 view_ray);',


  				'void main() {',
  						// Normalize clipping plane info
  						'vec3 farpos = v_farpos.xyz / v_farpos.w;',
  						'vec3 nearpos = v_nearpos.xyz / v_nearpos.w;',

  						// Calculate unit vector pointing in the view direction through this fragment.
  						'vec3 view_ray = normalize(nearpos.xyz - farpos.xyz);',

  						// Compute the (negative) distance to the front surface or near clipping plane.
  						// v_position is the back face of the cuboid, so the initial distance calculated in the dot
  						// product below is the distance from near clip plane to the back of the cuboid
  						'float distance = dot(nearpos - v_position, view_ray);',
  						'vec3 dist1 = (-0.5 - v_position) / view_ray;',
  						'vec3 dist2 = (u_size -0.5 - v_position) / view_ray;',

  						'distance = max(distance, min(dist1.x, dist2.x));',
  						'distance = max(distance, min(dist1.y, dist2.y));',
  						'distance = max(distance, min(dist1.z, dist2.z));',

              // Now we have the starting position on the front surface
  						'vec3 front = v_position + view_ray * distance;',

  						// Decide how many steps to take
  						'int nsteps = int(-distance / relative_step_size + 0.5);',
  						'if ( nsteps < 1 ){',
  								// 'discard;',
  								'gl_FragColor = vec4(0.0);',
  								'gl_FragDepth = 1.0;',
  								'return;',
  						'}else {',

      						// Get starting location and step vector in texture coordinates
      						'vec3 step = ((v_position - front) / u_size) / float(nsteps);',
      						'vec3 start_loc = front / u_size;',

      						// For testing: show the number of steps. This helps to establish
      						// whether the rays are correctly oriented
      						// 'gl_FragColor = vec4(0.0, float(nsteps) / 1.0 / u_size.x, 1.0, 1.0);',
      						// 'return;',

      						// 'if (u_renderstyle == 0)',
      						// 		'cast_mip(start_loc, step, nsteps, view_ray);',
      						// 'else if (u_renderstyle == 1)',
      						'gl_FragColor = vec4(0.0);	// init transparent',
  						    'gl_FragDepth = 1.0;',
      						'cast_iso(start_loc, step, nsteps, view_ray);',

                  'if (gl_FragColor.a < 0.05){',
                      'gl_FragDepth = 1.0;',
                      'gl_FragColor.a = 0.0;',
                  '}',
      						// 'gl_FragColor = vec4(0.0, gl_FragDepth, 1.0, 1.0);',
      				'}',

  						// 'if (gl_FragColor.a < 0.05)',
  								// 'discard;',
  				'}',


  				'float sample1(vec3 texcoords) {',
  						'/* Sample float value from a 3D texture. Assumes intensity data. */',
  						'return texture(u_data, texcoords.xyz).r;',
  				'}',


  				'vec4 apply_colormap(float val) {',
  						'val = (val - u_clim[0]) / (u_clim[1] - u_clim[0]);',
  						'return texture2D(u_cmdata, vec2(val, 0.5));',
  				'}',


  				'void cast_mip(vec3 start_loc, vec3 step, int nsteps, vec3 view_ray) {',

  						'float max_val = -1e6;',
  						'int max_i = 100;',
  						'vec3 loc = start_loc;',

  						// Enter the raycasting loop. In WebGL 1 the loop index cannot be compared with
  						// non-constant expression. So we use a hard-coded max, and an additional condition
  						// inside the loop.
  						'for (int iter=0; iter<MAX_STEPS; iter++) {',
  								'if (iter >= nsteps)',
  										'break;',
  								// Sample from the 3D texture
  								'float val = sample1(loc);',
  								// Apply MIP operation
  								'if (val > max_val) {',
  										'max_val = val;',
  										'max_i = iter;',
  								'}',
  								// Advance location deeper into the volume
  								'loc += step;',
  						'}',

  						// Refine location, gives crispier images
  						'vec3 iloc = start_loc + step * (float(max_i) - 0.5);',
  						'vec3 istep = step / float(REFINEMENT_STEPS);',
  						'for (int i=0; i<REFINEMENT_STEPS; i++) {',
  								'max_val = max(max_val, sample1(iloc));',
  								'iloc += istep;',
  						'}',

  						// Resolve final color
  						'gl_FragColor = apply_colormap(max_val);',
  				'}',


  				'void cast_iso(vec3 start_loc, vec3 step, int nsteps, vec3 view_ray) {',

  						'vec4 color3 = vec4(0.0);	// final color',
  						'vec3 dstep = 1.5 / u_size;	// step to sample derivative',
  						'vec3 loc = start_loc;',

  						'float low_threshold = u_renderthreshold - 0.02 * (u_clim[1] - u_clim[0]);',

  						// Enter the raycasting loop. In WebGL 1 the loop index cannot be compared with
  						// non-constant expression. So we use a hard-coded max, and an additional condition
  						// inside the loop.
  						'for (int iter=0; iter<MAX_STEPS; iter++) {',
  								'if (iter >= nsteps)',
  										'break;',

  										// Sample from the 3D texture
  								'float val = sample1(loc);',

  								'vec4 proj_p = vec4(1.0);',

  								'if (val > low_threshold) {',
  								// Take the last interval in smaller steps
  										'vec4 iloc = vec4(loc - 0.5 * step, 1.0);',
  										'vec3 istep = step / float(REFINEMENT_STEPS);',
  										'for (int i=0; i<REFINEMENT_STEPS; i++) {',
  												'val = sample1(iloc.xyz);',
  												'if (val > u_renderthreshold) {',
  														'gl_FragColor = add_lighting(val, iloc.xyz, dstep, view_ray);',
  														'proj_p = m_proj_mat * (iloc * vec4(u_size, 1.0));',
  														'gl_FragDepth = proj_p.z / proj_p.w / 2.0 + 0.5;',//gl_FragCoord.z;',
  														'return;',
  												'}',
  												'iloc.xyz += istep;',
  										'}',
  								'}',

  								// Advance location deeper into the volume
  								'loc += step;',
  						'}',
  				'}',


  				'vec4 add_lighting(float val, vec3 loc, vec3 step, vec3 view_ray)',
  				'{',
  						// Calculate color by incorporating lighting

  						// View direction
  						'vec3 V = normalize(view_ray);',

  						// calculate normal vector from gradient
  						'vec3 N;',
  						'float val1, val2;',
  						'val1 = sample1(loc + vec3(-step[0], 0.0, 0.0));',
  						'val2 = sample1(loc + vec3(+step[0], 0.0, 0.0));',
  						'N[0] = val1 - val2;',
  						'val = max(max(val1, val2), val);',
  						'val1 = sample1(loc + vec3(0.0, -step[1], 0.0));',
  						'val2 = sample1(loc + vec3(0.0, +step[1], 0.0));',
  						'N[1] = val1 - val2;',
  						'val = max(max(val1, val2), val);',
  						'val1 = sample1(loc + vec3(0.0, 0.0, -step[2]));',
  						'val2 = sample1(loc + vec3(0.0, 0.0, +step[2]));',
  						'N[2] = val1 - val2;',
  						'val = max(max(val1, val2), val);',

  						'float gm = length(N); // gradient magnitude',
  						'N = normalize(N);',

  						// Flip normal so it points towards viewer
  						'float Nselect = float(dot(N, V) > 0.0);',
  						'N = (2.0 * Nselect - 1.0) * N;	// ==	Nselect * N - (1.0-Nselect)*N;',

  						// Init colors
  						'vec4 ambient_color = vec4(0.0, 0.0, 0.0, 0.0);',
  						'vec4 diffuse_color = vec4(0.0, 0.0, 0.0, 0.0);',
  						'vec4 specular_color = vec4(0.0, 0.0, 0.0, 0.0);',

  						// note: could allow multiple lights
  						'for (int i=0; i<1; i++)',
  						'{',
  								 // Get light direction (make sure to prevent zero devision)
  								'vec3 L = normalize(view_ray);	//lightDirs[i];',
  								'float lightEnabled = float( length(L) > 0.0 );',
  								'L = normalize(L + (1.0 - lightEnabled));',

  								// Calculate lighting properties
  								'float lambertTerm = clamp(dot(N, L), 0.0, 1.0);',
  								'vec3 H = normalize(L+V); // Halfway vector',
  								'float specularTerm = pow(max(dot(H, N), 0.0), shininess);',

  								// Calculate mask
  								'float mask1 = lightEnabled;',

  								// Calculate colors
  								'ambient_color +=	mask1 * ambient_color;	// * gl_LightSource[i].ambient;',
  								'diffuse_color +=	mask1 * lambertTerm;',
  								'specular_color += mask1 * specularTerm * specular_color;',
  						'}',

  						// Calculate final color by componing different components
  						'vec4 final_color;',
  						'vec4 color = apply_colormap(val);',
  						'final_color = color * (ambient_color + diffuse_color) + specular_color;',
  						'final_color.a = color.a;',
  						'return final_color;',
  				'}',
  	].join( '\n' )
  };

  return(THREE);

};




const register_volumeShader2 = function(THREE){

  THREE.VolumeRenderShader1 = {
  	uniforms: {
  				"u_size": { value: new THREE.Vector3( 1, 1, 1 ) },
  				"u_renderstyle": { value: 0 },
  				"u_renderthreshold": { value: 0.5 },
  				"u_clim": { value: new THREE.Vector2( 1, 1 ) },
  				"u_data": { value: null },
  				"u_cmdata": { value: null },
  				'volume_scale' : { value: new THREE.Vector3(1,1,1) }
  		},
  		vertexShader: [
          // 'uniform mat4 proj_view;'
          'uniform vec3 volume_scale;',
          'out vec3 vray_dir;',
          'flat out vec3 transformed_eye;',

          'void main(void) {',
          	// Translate the cube to center it at the origin.
          	// 'vec3 volume_translation = vec3(0.5) - volume_scale * 0.5;',
          	'vec3 volume_translation =  - 0.5 * volume_scale;',

          	'gl_Position = projectionMatrix * modelViewMatrix * vec4(position * volume_scale + volume_translation, 1);',

          	// Compute eye position and ray directions in the unit cube space
          	'transformed_eye = cameraPosition;',//(cameraPosition - volume_translation) / volume_scale;',

          	'vray_dir = position - transformed_eye;',
          '}'
  		].join( '\n' ),
  	fragmentShader: [
  	      'precision highp int;',
          'precision highp float;',

          // 'uniform highp sampler3D volume;',
          'uniform highp sampler3D u_data;',
          // WebGL doesn't support 1D textures, so we use a 2D texture for the transfer function
          // 'uniform highp sampler2D transfer_fcn;'
          'uniform highp sampler2D u_cmdata;',

          // 'uniform ivec3 volume_dims;',
          'uniform vec3 u_size;',

          // Read from vertexShader
          'in vec3 vray_dir;',
          'flat in vec3 transformed_eye;',

          // function to intersect raycaster with box
          'vec2 intersect_box(vec3 orig, vec3 dir) {',
          	'const vec3 box_min = vec3(0);',
          	'const vec3 box_max = vec3(1);',
          	'vec3 inv_dir = 1.0 / dir;',
          	'vec3 tmin_tmp = (box_min - orig) * inv_dir;',
          	'vec3 tmax_tmp = (box_max - orig) * inv_dir;',
          	'vec3 tmin = min(tmin_tmp, tmax_tmp);',
          	'vec3 tmax = max(tmin_tmp, tmax_tmp);',
          	'float t0 = max(tmin.x, max(tmin.y, tmin.z));',
          	'float t1 = min(tmax.x, min(tmax.y, tmax.z));',
          	'return vec2(t0, t1);',
          '}',

          'void main() {',
              'vec4 color;',
              // Step 1: Normalize the view ray (TODO: add function normalize?)
            	'vec3 ray_dir = normalize(vray_dir);',

            	// Step 2: Intersect the ray with the volume bounds to find the interval
            	// along the ray overlapped by the volume.
            	'vec2 t_hit = intersect_box(transformed_eye, ray_dir);',

            	// give default value
            	//'color.rgba = vec4(0.0);',

            	'if (t_hit.x > t_hit.y) {',
            		'discard;',
            	'}',
            	// We don't want to sample voxels behind the eye if it's
            	// inside the volume, so keep the starting point at or in front
            	// of the eye
            	't_hit.x = max(t_hit.x, 0.0);',

            	// Step 3: Compute the step size to march through the volume grid
            	'vec3 dt_vec = 1.0 / (u_size * abs(ray_dir));',
            	'float dt = min(dt_vec.x, min(dt_vec.y, dt_vec.z));',

            	// Step 4: Starting from the entry point, march the ray through the volume
            	// and sample it
            	'vec3 p = transformed_eye + t_hit.x * ray_dir;',
            	'for (float t = t_hit.x; t < t_hit.y; t += dt) {',
              		// Step 4.1: Sample the volume, and color it by the transfer function.
              		// Note that here we don't use the opacity from the transfer function,
              		// and just use the sample value as the opacity
              		'float val = texture(u_data, p).r;',
              		'vec4 val_color = vec4(texture(u_cmdata, vec2(val, 0.5)).rgb, val);',

              		// Step 4.2: Accumulate the color and opacity using the front-to-back
              		// compositing equation
              		'color.rgb += (1.0 - color.a) * val_color.a * val_color.rgb;',
              		'color.a += (1.0 - color.a) * val_color.a;',

              		// Optimization: break out of the loop when the color is near opaque
              		'if (color.a >= 0.95) {',
              			  'break;',
              		'}',
              		'p += ray_dir * dt;',
            	'}',

            	'gl_FragColor = color;',
          '}'
  	].join( '\n' )
  };

  return(THREE);

};

export { register_volumeShader1, register_volumeShader2 };
