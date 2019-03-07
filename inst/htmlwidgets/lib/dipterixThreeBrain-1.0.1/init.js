window.THREEJSRCANVAS = (function(){

  var __canvas = {};

  var __closest = function(e, ar){
    var l = Infinity, pl = -1, g = Infinity, pg = -1, tmp;
    for(var ii = 0; ii < ar.length; ii++){
      if(ar[ii] < e){
        if(l > e - ar[ii]){
          l = e - ar[ii];
          pl = ii;
        }
      }else{
        if(g > ar[ii] - e){
          g = ar[ii] - e;
          pg = ii;
        }
      }
    }


    return({
      'which_less' : pl,
      'which_greater' : pg,
    });
  };

  function __decode_datauri(data){
    window.dd = data;
  }



  function register(id, container, width, height){
    var innerCanvas, camera, controls, scene, scene2, renderer, side_renderer, renderer_colors, stats, axes_helper, geoms, show_visible, mouse, ani_active, max_keyframe, ani_delta, current_keyframe, ani_callback_f,
        ani_start, fps, event_stack, animation_stack, sidebar_stack;

    function set_side_renderer(el){
      el.appendChild( side_renderer.domElement );
    }
    function side_camera(mesh_name, args){
      // add meshes / geoms to sidebar-cameras
      // this function should always call after post_init i.e. all other objects are rendered and main canvas is rendered.
      var view = args || {};
      var mesh = geoms.filter(g => g.name == mesh_name);
      if(mesh.length === 0){
        console.warn('Object not found: ' + mesh_name);
        return(null);
      }else{
        mesh = mesh[0];
      }

      var width = 250;
      var sub_camera = new THREE.OrthographicCamera( width / - 2, width / 2, width / 2, width / - 2, 1, 10000 );
			// var sub_camera = new THREE.PerspectiveCamera( 45, 1 / 1, 1, 10000 );
			sub_camera.position.fromArray( args.position || [0, 0, 100] );
			sub_camera.lookAt( new THREE.Vector3(0,0,0) ); // Force camera looking at object
			sub_camera.aspect = 1;
			sub_camera.updateProjectionMatrix();
  		sub_camera.layers.enable(3);
  		sub_camera.layers.enable(4);
  		sub_camera.layers.enable(5);
  		sub_camera.layers.enable(6);
  		sub_camera.layers.enable(30);
			mesh.add( sub_camera );
			/*
			var helper = new THREE.CameraHelper( sub_camera );
			helper.layers.set(4);
      scene.add( helper );
      */

			view.mesh = mesh;
			view.camera = sub_camera;
			sidebar_stack[mesh_name] = view;
    }

    function ani_maxkeyframe(max_key){
      if(typeof(max_key) !== 'number'){
        max_key = Infinity;
      }
      if(max_key <= 0 ){
        max_key = Infinity;
      }
      max_keyframe = max_key;
    }

    function ani_callback(f, append = false){
      if(!append){
        ani_callback_f.length = 0;
      }
      ani_callback_f.push(f);
    }

    function ani_toggle(force){
      ani_active = !ani_active;
      if(typeof(force) === 'boolean'){
        ani_active = force;
      }

      if(ani_active){
        ani_start = (new Date()) - ani_delta;
      }else{
        ani_delta = (new Date()) - ani_start;
      }
    }

    function ani_reset(keyframe = 0){
      ani_delta = keyframe * 1000 / fps;
      ani_start = (new Date()) - ani_delta;
      current_keyframe = keyframe;
    }

    function animate(){
			requestAnimationFrame( animate );
			controls.update();
			mouse.update();



			if(ani_active){
			  // FPS = 1 first, but can be adjusted later
        var __time_elapsed = (new Date()) - ani_start,
            __frame = (__time_elapsed / 1000 * fps) % max_keyframe;
            current_keyframe = __frame;
			}

			for(var ii in animation_stack){
			  if(typeof(animation_stack[ii]) === 'function'){
			    animation_stack[ii](current_keyframe);
			  }
			}
			for(var jj in ani_callback_f){
			  if(typeof(ani_callback_f[jj]) === 'function'){
			    ani_callback_f[jj](current_keyframe);
			  }
			}
			render();
		}
    function resize(width, height){
      // Resize innerCanvas as well
      innerCanvas.style.width = width + 'px';

      if(camera.isOrthographicCamera || false){
        camera.left = -150;
    	  camera.right = 150;
    	  camera.top = height / width * 150;
    	  camera.bottom = -height / width * 150;
      }else{
  	    camera.aspect = width / height;
      }

      // sub cameras
      var names = Object.keys(sidebar_stack);
      if(names.length > 0){
        var side_width = height / Math.max(names.length, 2);
        // side_renderer.setSize(side_width, names.length * side_width);
        for(var ii in names){
          sidebar_stack[names[ii]].camera.left = side_width / -2;
          sidebar_stack[names[ii]].camera.right = side_width / 2;
          sidebar_stack[names[ii]].camera.top = side_width / 2;
          sidebar_stack[names[ii]].camera.bottom = side_width / -2;
        }
      }

  		camera.updateProjectionMatrix();
  		renderer.setSize( width, height );
  		controls.handleResize();
  		render();
  	}

  	function reset_controls(){
  	  // reset will erase target, manually reset target
  	  var target = controls.orthographic.target.toArray();
  	  controls.trackball.reset();
  		controls.orbit.reset();
  		controls.orthographic.reset();
  		set_controls_target(target[0], target[1], target[2]);
  	}
  	function switch_controls(on = ['trackball']){
  		controls._active = on;
  		controls.trackball.enabled = false;
  		controls.orbit.enabled = false;
  		controls.orthographic.enabled = false;
  		controls[on[0]].enabled = true;
  	}

  	function set_controls_target( x, y, z ){
  	  controls.trackball.target.set( x , y , z );
  		controls.orbit.target.set( x , y , z );
  		controls.orthographic.target.set( x , y , z );
  	}

  	function render(){

  	  renderer.setClearColor( renderer_colors[0] );
  	  renderer.clear();
  		renderer.render( scene, camera );
  		renderer.clearDepth();
  		renderer.render( scene2, camera );

      var names = Object.keys(sidebar_stack);
      if(names.length > 0){
        var width = height / Math.max(names.length, 2);
        side_renderer.setSize(width, names.length * width);
        side_renderer.setClearColor( renderer_colors[1] );
        for(var ii in names){
          var view = sidebar_stack[names[ii]];
          side_renderer.setViewport( 0, ii * width, width, width );
          side_renderer.setScissor( 0, ii * width, width, width );
          side_renderer.setScissorTest( true );
  				side_renderer.clear();
  				side_renderer.render( scene, view.camera );
          side_renderer.clearDepth();
          side_renderer.render( scene2, view.camera );
        }
      }


  		if(typeof(stats) === 'object' && typeof(stats.update) === 'function'){
  		  stats.update();
  		}
  	}
  	function set_stats(show = false){
  	  if(show){
  	    stats.domElement.style.display = 'block';
  	  }else{
  	    stats.domElement.style.display = 'none';
  	  }
  	}
    function init(width, height){
      if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

      // Trackball, Orbit, Mouse controls
      controls = {};
      geoms = [];
      ani_start = new Date();
      fps = 1;
      animation_stack = [];
      ani_active = true;
      max_keyframe = Infinity;
      ani_delta = 0;
      current_keyframe = 0;
      ani_callback_f = [];

      // stores subset of geoms
      event_stack = {};
      // Default: clip, hover
      event_stack.clippers = {};
      event_stack.hover = [];

      sidebar_stack = {};
      window.sidebar_stack = sidebar_stack;

      // renderer colors
      renderer_colors = [0xefefef,0xfefefe];


      // Main canvas for 3D objects
      innerCanvas = document.createElement('div');
      innerCanvas.style.width = width + 'px';


      // Camera
      // camera = new THREE.PerspectiveCamera( 45, width / height, 1, 10000 );
      camera = new THREE.OrthographicCamera( -150, 150, height / width * 150, -height / width * 150, 1, 1000 );
  		camera.position.z = 500;
  		camera.layers.enable(0);
  		camera.layers.enable(1);
  		camera.layers.enable(2);
  		camera.layers.enable(3);
  		camera.layers.enable(4);

  		// World
  		scene = new THREE.Scene();
  		scene2 = new THREE.Scene();
  		// scene.background = new THREE.Color( 0xefefef );

  		/* Add the camera and a light to the scene, linked into one object. */
      var light = new THREE.DirectionalLight( 0xefefef, 0.5 );
      light.position.set(0,0,-1);
      camera.add(light);  // Add light to the camera, so it will move with the camera.
                          // (Trackball rotation is implemented by rotating the camera object.)

      scene.add( camera );

  		scene.add( new THREE.AmbientLight( 0x808080 ) ); // soft white light

  		// renderer
  		renderer = new THREE.WebGLRenderer( { antialias: false, alpha: true } );
  		renderer.setPixelRatio( window.devicePixelRatio );
  		renderer.setSize( width, height );
  		renderer.autoClear = false; // Manual update so that it can render two scenes

  		// Enable clipping
  		renderer.localClippingEnabled=true;
  		innerCanvas.appendChild( renderer.domElement );

      // sidebar renderer (multiple renderers)
  		side_renderer = new THREE.WebGLRenderer( { antialias: false, alpha: true } );
  		side_renderer.setPixelRatio( window.devicePixelRatio );
  		side_renderer.autoClear = false; // Manual update so that it can render two scenes
  		// side_renderer.setSize( width, height ); This step is set dynamically when sidebar cameras are inserted

  		axes_helper = new THREE.AxesHelper( 5 );
  		axes_helper.visible = true;
      scene.add( axes_helper );

      container.appendChild( innerCanvas );

      // Stats
      show_visible = false;
      stats = new Stats();
      stats.domElement.style.display = 'none';
      stats.domElement.style.position = 'relative';
      stats.domElement.style.float = 'right';
      stats.domElement.style.marginBottom = '-100%';
      container.parentNode.insertBefore( stats.domElement, container );


      // Controls
      // Trackball controls
      var trackball = new THREE.TrackballControls( camera, innerCanvas );
      trackball.rotateSpeed = 3.0;
  		trackball.zoomSpeed = 1.2;
  		trackball.panSpeed = 0.8;
  		trackball.noZoom = false;
  		trackball.noPan = false;
  		trackball.staticMoving = true;
  		trackball.dynamicDampingFactor = 0.3;
  		trackball.enableKeys = false;
  		// trackball.addEventListener( 'change', render );
  		trackball.enabled = true;
  		controls.trackball = trackball;

  		var orbit = new THREE.OrbitControls( camera, innerCanvas );
  		orbit.rotateSpeed = 0.3;
  		orbit.zoomSpeed = 1.2;
  		orbit.panSpeed = 0.8;
  		orbit.enableZoom = true;
  		orbit.enablePan = true;
  		orbit.screenSpacePanning = true;
  		orbit.enableDamping = true;
  		orbit.dampingFactor = 0.3;
  		orbit.enableKeys = false;
  		orbit.maxPolarAngle = Infinity;
  		orbit.minPolarAngle = -Infinity;
  		// orbit.addEventListener( 'change', render );
  		orbit.enabled = false;
  		controls.orbit = orbit;

  		var orthographic = new THREE.OrthographicTrackballControls( camera, innerCanvas );
  		orthographic.zoomSpeed = 0.02;
  		// You cannot use pan in perspective camera. So if you are using PerspectiveCamera, this needs to be true
  		orthographic.noPan = false;
  		// Initial radius is 500
  		// orthographic.radius = 400;
  		orthographic.dynamicDampingFactor=0.5;
  		controls.orthographic = orthographic;

  		controls.handleResize = function(){
  		  controls.trackball.handleResize();
  		  controls.orthographic.handleResize();
  		  // controls.orbit.handleResize();
  		};

  		controls._active = ['trackball'];

  		controls.update = function(){
  		  controls._active.forEach(function(element){
  		    controls[element].update();
  		  });
  		};

  		// Mouse events
  		mouse = {};
  		mouse.__pointer = new THREE.Vector2();
      mouse.__raycaster = new THREE.Raycaster();
      mouse.__intersects = [];
      var v = new THREE.Vector3( 0, 0, 0 );
      var __dir = new THREE.Vector3( 0, 0, 1 );
      mouse.__arrow_helper = new THREE.ArrowHelper(__dir, v, 50, 0xff0000, 2 );
      var __arrow_helper_root = new THREE.Mesh(
        new THREE.BoxBufferGeometry( 6,6,6 ),
        new THREE.MeshBasicMaterial({ color : 0x00ff00 })
      );
      __arrow_helper_root.layers.set(30);
      mouse.__arrow_helper.add( __arrow_helper_root );


      mouse.__stats = {
        'isDown' : false
      };
      mouse.events = {
        'show_helper' : function(items, status){
          if(items.length > 0){
            var from = items[0].point,
                direction = items[0].face.normal.normalize(),
                back = mouse.__raycaster.ray.direction.dot(direction) > 0;
            if(back){
              direction.x = -direction.x;
              direction.y = -direction.y;
              direction.z = -direction.z;
            }
            mouse.__arrow_helper.position.set(from.x, from.y, from.z);
            mouse.__arrow_helper.setDirection(direction);
            mouse.__arrow_helper.visible = true;
          }else{
            mouse.__arrow_helper.visible = false;
          }
        },
        'show_info' : function(items, status){
          if(status.isClicked && items.length > 0){
            var obj = items[0].object,
                is_mesh = obj.isMesh || false;
            if(is_mesh){
              if(typeof(obj.userData.mesh_info) === 'function'){
                obj.userData.mesh_info();
              }
              if(typeof(obj.userData.mouse_callback) === 'function'){
                obj.userData.mouse_callback();
              }
            }

          }
          mouse.__stats.isClicked = false;
        }
      };

      mouse.get_mouse = function(event){
        mouse.__pointer.x = ( event.offsetX / innerCanvas.clientWidth ) * 2 - 1;
        mouse.__pointer.y = - ( event.offsetY / innerCanvas.clientHeight ) * 2 + 1;
      };
  		mouse.update = function(all = false){
  		  mouse.__raycaster.setFromCamera( mouse.__pointer, camera );
  		  mouse.__intersects = mouse.__raycaster.intersectObjects( event_stack.hover );
  		  /*if(all){
  		    mouse.__intersects = mouse.__raycaster.intersectObjects( geoms );
  		  }else{

  		  }*/

  		  for(var key in mouse.events){
  		    if(typeof(mouse.events[key]) === 'function'){
  		      mouse.events[key](mouse.__intersects, mouse.__stats);
  		    }
  		  }
  		};

      scene2.add( mouse.__arrow_helper );
  		innerCanvas.addEventListener( 'mousemove', function(event){
         mouse.get_mouse(event);
      }, false );
      innerCanvas.addEventListener( 'mousedown', function(event){
         mouse.__stats.isDown = true;
         mouse.update(all = true);
      }, false );
      innerCanvas.addEventListener( 'mouseup', function(event){
         mouse.__stats.isDown = false;
         mouse.update();
      }, false );
      innerCanvas.addEventListener( 'click', function(event){
        mouse.__stats.isClicked = true;
         mouse.get_mouse(event);
      }, false );
      innerCanvas.addEventListener( 'dblclick', function(event){
        mouse.__stats.isDblClicked = true;
         mouse.get_mouse(event);
      }, false );


      // All finished, render
      render();
    }

    function set_fps(new_fps){
      fps = new_fps;
    }

    function get_canvas(){
      return({
        'camera' : camera,
        'controls' : controls,
        'scene' : scene,
        'renderer' : renderer,
        'axes_helper' : axes_helper,
        'geoms' : geoms,
        'init' : init,
        'resize' : resize,
        'switch_controls' : switch_controls,
        'reset_controls' : reset_controls,
        'set_controls_target' : set_controls_target,
        'add_mesh' : add_mesh,
        'set_stats' : set_stats,
        'mouse_event' : mouse_event,
        'mouse' : mouse,
        'mesh_event' : mesh_event,
        'ani_toggle' : ani_toggle,
        'ani_reset' : ani_reset,
        'ani_maxkeyframe' : ani_maxkeyframe,
        'set_fps' : set_fps,
        'clear_all' : clear_all,
        'post_init' : post_init,
        'side_camera' : side_camera,
        'side_renderer' : side_renderer,
        'set_side_renderer' : set_side_renderer,
        'set_renderer_colors' : set_renderer_colors,
        'sidebar_stack' : sidebar_stack,
        'current_keyframe' : current_keyframe,
        'ani_callback' : ani_callback,
        'ani_callback_f' : ani_callback_f
      });
    }

    function set_renderer_colors(main_color, side_color){
      if(main_color !== undefined){
        renderer_colors[0] = main_color;
      }
      if(side_color !== undefined){
        renderer_colors[1] = side_color;
      }
    }

    function clear_all(){
      for(var i in geoms){
        scene.remove(geoms[i]);
      }

      /* TODO: remove cameras in sidebar_stack
      for(var mn in sidebar_stack){
        sidebar_stack[mn].camera
      }
      */

      geoms.length = 0;  // remove all elements from the array
      event_stack.hover.length = 0;
      event_stack.clippers.length = 0;
      animation_stack.length = 0;
      sidebar_stack = {};

    }

    function add_mesh(mesh_type, mesh_name, geom_args,
                      position = [0,0,0], transform = undefined,
                      layer = 1, mesh_info = '',
                      clippers = null,
                      clip_intersect = false,
                      is_clipper = false,
                      hover_enabled = true,
                      threejs_method = 'Mesh'){
      var geom_func = THREEJSRGEOMS[mesh_type],
          mesh_obj,
          geom_obj;

      if(typeof(geom_func) === 'function'){
        geom_obj = geom_func(geom_args);

        if(transform !== undefined){
          var mat = new THREE.Matrix4(),
              m = transform;

          mat.set(
            m[0][0], m[0][1], m[0][2], m[0][3],
            m[1][0], m[1][1], m[1][2], m[1][3],
            m[2][0], m[2][1], m[2][2], m[2][3],
            m[3][0], m[3][1], m[3][2], m[3][3]
          );

          geom_obj.geom.applyMatrix(mat);
        }

        mesh_obj = new THREE[threejs_method](
          geom_obj.geom ,
          new THREE.MeshLambertMaterial({ 'transparent' : true })
        );
        window.mm = mesh_obj;
        mesh_obj.userData.__params = {};
        mesh_obj.userData.__funs = {};

        mesh_obj.layers.set(layer);
        mesh_obj.position.set(position[0], position[1], position[2]);
        mesh_obj.name = mesh_name;
        mesh_obj.userData.set_data_texture = geom_obj.set_data_texture;
        mesh_obj.userData.update_data_texture = geom_obj.update_data_texture;
        mesh_obj.userData.mesh_info = mesh_info;
        mesh_obj.userData.clip_intersect = clip_intersect;
        geoms.push(mesh_obj);
        if(hover_enabled){
          event_stack.hover.push(mesh_obj);
        }
        if(is_clipper){

          // Need this in order to get plane mesh normals
          mesh_obj.geometry.computeVertexNormals();

          // get normal
          var normal = mesh_obj.geometry.getAttribute('normal').array,
              plane = new THREE.Plane( new THREE.Vector3( normal[0], normal[1], normal[2] ), 0 );

          mesh_obj.userData.clipping_plane = plane;
          event_stack.clippers[mesh_name] = plane;

          mesh_obj.geometry.computeBoundingBox();

          var bounding_box = new THREE.BoxHelper( mesh_obj, 0xffffff );
          bounding_box.layers.set( 30 );
          mesh_obj.add( bounding_box );

        }
        if(typeof(clippers) !== 'object' || clippers === null || Object.keys(clippers).length === 0){
          if(typeof(clippers) === 'string'){
            mesh_obj.userData.clippers = [clippers];
          }else{
            mesh_obj.userData.clippers = [];
          }
        }else{
          mesh_obj.userData.clippers = clippers;
        }
        /*
        clippingPlanes: clipPlanes,
						clipIntersection: params.clipIntersection
        */
        mesh_obj.userData.set_clippers = function(){
          if(mesh_obj.userData.clippers.length > 0){
            mesh_obj.material.clippingPlanes = mesh_obj.userData.clippers.map((k) => (event_stack.clippers[k])).filter((v) => (v !== undefined));
            mesh_obj.material.clipIntersection = clip_intersect || false;
          }
        };
        scene.add(mesh_obj);
        return(mesh_obj);
      }else{
        console.log('Cannot find type '+ geom_func);
      }
    }

    function post_init(){
      geoms.forEach(function(g){
        if(typeof(g.userData.set_clippers) === 'function'){
          g.userData.set_clippers();
        }
      });
    }

    // event_type can be one of the following
    // 1. animation
    // 2. position
    function mesh_event(mesh_name, event_type, args){
      // (e.mesh_name, event_type,
      //          args = e.events[event_type]);

      var mesh = geoms.filter(g => g.name == mesh_name),
          data = args.data,
          pixel_size = args.pixel_size || 3, // RGB three colors, alpha will be ignored
          keys = args.key_frames || Object.keys(data),
          find_keys; // MUST be str and can be parseFloat

      if(typeof(keys) !== 'object'){
        keys = [keys];
        find_keys = function(val){
          return([0, 0, 1, 0]);
        };
      }else{
        find_keys = function(val){
        var ind = __closest(val, num),
            prev, nxt, a = 1, b = 1;

        if(ind.which_less > -1 && ind.which_greater > -1){
          // prev <= val <= nxt
          prev = ind.which_less;
          nxt = ind.which_greater;
          a = (num[ind.which_greater] - val) / (num[ind.which_greater] - num[ind.which_less]);
          b = 1 - a; // linear transition
        }else if(ind.which_less > -1){
          // val >= max(num)
          prev = ind.which_less;
          nxt = prev;
          a = b = 0.5;
        }else if(ind.which_greater > -1){
          // val <= min(num)
          prev = ind.which_greater;
          nxt = prev;
          a = b = 0.5;
        }

        return([prev, nxt, a, b]);
      };
      }
      var max_len = keys.length,
          num = keys.map(Number);

      if(mesh.length > 0){

        window.mm = data;

        mesh.forEach(function(e){

          var param = {...args, ...e.userData.__params[args.name]};

          e.userData.texture_alpha = args.alpha || param.alpha || false;
          e.userData.texture_threshold = args.threshold || param.threshold || 0;

          e.userData.set_data_texture( mesh = e, data = data, pixel_size = pixel_size,
                        max_anisotropy = renderer.capabilities.getMaxAnisotropy() );

          switch (event_type) {
            case 'position':
              var axis = param.axis || 'z';
              e.userData.__funs[args.name] = function(value, mesh){    // mesh is used since e = mesh
                if(mesh === undefined){
                  mesh = e;
                }
                var pos = mesh.position,
                    loc = find_keys(value);

                pos[axis] = value;

                // mesh_obj.position.set(pos.x, pos.y, pos.z);
                mesh.userData.update_data_texture(loc[0], loc[1], loc[2], loc[3]);



                if(mesh.userData.clipping_plane !== undefined){
                  mesh.userData.clipping_plane.constant = - pos.dot(mesh.userData.clipping_plane.normal.normalize());
                }

              };
              // Sadly, we need to set positions here again
              e.userData.__funs[args.name](e.position[axis], e);
              break;

            case 'animation':
              var loop = args.loop || false;
              e.userData.__funs[args.name] = function(frame, mesh){
                if(loop || frame < max_len){
                  if(loop){
                    frame = frame % max_len;
                  }
                  // Then loop = false and animation ends, no need to update
                  var loc = find_keys(frame);
                  try {
                    e.userData.update_data_texture(loc[0], loc[1], loc[2], loc[3]);
                  } catch (e) {
                    console.log(e);
                  }
                }
              };
              e.userData.__funs[args.name](0, e);
              animation_stack.push(e.userData.__funs[args.name]);
              break;


            default:
              // code
          }

        });
      }
    }

    function mouse_event(et, fn){
      if(typeof(fn) === 'function'){
        mouse.events[et] = fn;
      }else{
        mouse.events[et] = undefined;
      }
    }





    init(width, height);
    animate();
    __canvas[id] = get_canvas;
    return(__canvas[id]());
  }


  return({
    'register' : register,
    'canvas_list' : __canvas,
    'uri_decode' : __decode_datauri
  });
})();




// register shiny messages
/* Start Comment
Shiny.addCustomMessageHandler("threejsrmessage",
  function(message) {
    var id = message.outputId,
        canvas = THREEJSRCANVAS.canvas_list[id];
    if(canvas === 'function'){
      canvas().receive_message(message);
    }
  }
);
/* End Comment */
