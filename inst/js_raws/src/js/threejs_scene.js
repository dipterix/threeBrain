import { to_dict, to_array } from './utils.js';
import { Stats } from './libs/stats.min.js';
import { THREE } from './threeplugins.js';
import { THREEBRAIN_STORAGE } from './threebrain_cache.js';
import { make_draggable } from './libs/draggable.js';
import { make_resizable } from './libs/resizable.js';
import { get_element_size } from './libs/get.element.size.js';
import { CONSTANTS } from './constants.js';
import { gen_sphere } from './geometry/sphere.js';
import { gen_datacube } from './geometry/datacube.js';
import { gen_free } from './geometry/free.js';
import { Compass } from './geometry/compass.js';

/* Geometry generator */
const GEOMETRY_FACTORY = {
  'sphere' : gen_sphere,
  'free'   : gen_free,
  'datacube' : gen_datacube,
  'blank'  : (g, canvas) => { return(null) }
};

/* ------------------------------------ Layer setups ------------------------------------
  Defines for each camera which layers are visible.
  Protocols are
    Layers:
      - 0, 2, 3: Especially reserved for main camera
      - 1, Shared by all cameras
      - 4, 5, 6: Reserved for side-cameras
      - 7: reserved for all, system reserved
      - 8: main camera only, system reserved
      - 9 side-cameras 1 only, system reserved
      - 10 side-cameras 2 only, system reserved
      - 11 side-cameras 3 only, system reserved
      - 12 side-cameras 4 only, system reserved
      - 13 all side cameras, system reserved
      - 14~31 invisible

*/

// A storage to cache large objects such as mesh data
const cached_storage = new THREEBRAIN_STORAGE();

// Make sure window.requestAnimationFrame exists
// Override methods so that we have multiple support across platforms
window.requestAnimationFrame =
    window.requestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.msRequestAnimationFrame ||
    window.oRequestAnimationFrame ||
    function (callback) {
        setTimeout(function() { callback(Date.now()); },  1000/60);
    };




class THREEBRAIN_CANVAS {
  constructor(
    el, width, height, side_width = 250, shiny_mode=false, cache = false, DEBUG = false, has_webgl2 = true
  ) {

    if(DEBUG){
      console.debug('Debug Mode: ON.');
      this.DEBUG = true;
    }else{
      this.DEBUG = false;
    }
    if(cache === true){
      this.use_cache = true;
      this.cache = cached_storage;
    }else if ( cache === false ){
      this.use_cache = false;
    }else{
      this.use_cache = true;
      this.cache = cache;
    }

    // DOM container information
    this.el = el;
    this.container_id = el.id;

    // Is system supporting WebGL2? some customized shaders might need this feature
    // As of 08-2019, only chrome, firefox, and opera support full implementation of WebGL.
    this.has_webgl2 = has_webgl2;

    // Side panel initial size in pt
    this.side_width = side_width;

    // Indicator of whether we are in R-shiny environment, might change the name in the future if python, matlab are supported
    this.shiny_mode = shiny_mode;

    // Container that stores mesh objects from inputs (user defined) for each inquery
    this.mesh = {};

    // Stores all electrodes
    this.subject_codes = [];
    this.electrodes = {};
    this.volumes = {};
    this.surfaces = {};
    this.state_data = {};

    // Stores all groups
    this.group = {};

    // All mesh/geoms in this store will be calculated when raycasting
    this.clickable = {};

    // Dispatcher of handlers when mouse is clicked on the main canvas
    this._mouse_click_callbacks = {};
    this._keyboard_callbacks = {};

    /* A render flag that tells renderers whether the canvas needs update.
          Case -1, -2, ... ( < 0 ) : stop rendering
          Case 0: render once
          Case 1, 2: render until reset
    lower render_flag will be ignored if higher one is set. For example, if
    render_flag=2 and pause_animation only has input of 1, renderer will ignore
    the pause signal.
    */
    this.render_flag = 0;

    // Disable raycasting, soft deprecated
    this.disable_raycast = true;

    // A indicator of whether to render legends, will be true if input meshes have animations
    this.render_legend = false;
    // If legend is drawn, should be continuous or discrete.
    this.color_type = 'continuous';

    // If there exists animations, this will control the flow;
    this.animation_controls = {};
    this.animation_mixers = {};
    // Important, this keeps animation clock aligned with real-time PC clock.
    this.clock = new THREE.Clock();

    // Generate a canvas domElement using 2d context to put all elements together
    // Since it's 2d canvas, we might also add customized information onto it
    this.domElement = document.createElement('canvas');
    this.domContext = this.domElement.getContext('2d');
    this.background_color = '#ffffff'; // white background
    this.foreground_color = '#000000';
    this.domContext.fillStyle = this.background_color;


    // General scene.
    // Use solution from https://stackoverflow.com/questions/13309289/three-js-geometry-on-top-of-another to set render order
    this.scene = new THREE.Scene();
    this.origin = new THREE.Object3D();
    this.origin.position.copy( CONSTANTS.VEC_ORIGIN );
    this.scene.add( this.origin );

    /* Main camera
        Main camera is initialized at 0,0,500. The distance is stayed at 500 away from origin
        The view range is set from -150 to 150 (left - right) respect container ratio
        render distance is from 1 to 10000, sufficient for brain object.
        Parameters:
          position: 0,0,500
          left: -150, right: 150, near 1, far: 10000
          layers: 0, 1, 2, 3, 7, 8
          center/lookat: origin (0,0,0)
          up: 0,1,0 ( heads up )
    */
    this.main_camera = new THREE.OrthographicCamera( -150, 150, height / width * 150, -height / width * 150, 1, 10000 );
		this.main_camera.position.z = 500;
		this.main_camera.userData.pos = [0,0,500];
		this.main_camera.layers.set( CONSTANTS.LAYER_USER_MAIN_CAMERA_0 );
		this.main_camera.layers.enable( CONSTANTS.LAYER_USER_ALL_CAMERA_1 );
		this.main_camera.layers.enable( 2 );
		this.main_camera.layers.enable( 3 );
		this.main_camera.layers.enable( CONSTANTS.LAYER_SYS_ALL_CAMERAS_7 );
		this.main_camera.layers.enable( CONSTANTS.LAYER_SYS_MAIN_CAMERA_8 );
		this.main_camera.lookAt( CONSTANTS.VEC_ORIGIN ); // Force camera

		// Main camera light, casting from behind the main_camera, only light up objects in CONSTANTS.LAYER_SYS_MAIN_CAMERA_8
    const main_light = new THREE.DirectionalLight( CONSTANTS.COLOR_MAIN_LIGHT , 0.5 );
    main_light.position.copy( CONSTANTS.VEC_ANAT_I );
    main_light.layers.set( CONSTANTS.LAYER_SYS_MAIN_CAMERA_8 );
    this.main_camera.add( main_light );

    // Add main camera to scene
    this.add_to_scene( this.main_camera, true );

    // Add ambient light to make scene soft
    const ambient_light = new THREE.AmbientLight( CONSTANTS.COLOR_AMBIENT_LIGHT );
    ambient_light.layers.set( CONSTANTS.LAYER_SYS_ALL_CAMERAS_7 );
    this.add_to_scene( ambient_light, true ); // soft white light


    // Set pixel ratio, separate settings for main and side renderers
    this.pixel_ratio = [ window.devicePixelRatio, window.devicePixelRatio ];

    // Set Main renderer, strongly recommend WebGL2
    if( this.has_webgl2 ){
      // We need to use webgl2 for VolumeRenderShader1 to work
      let main_canvas_el = document.createElement('canvas'),
          main_context = main_canvas_el.getContext( 'webgl2' );
    	this.main_renderer = new THREE.WebGLRenderer({
    	  antialias: false, alpha: true, canvas: main_canvas_el, context: main_context
    	});
    }else{
    	this.main_renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    }
  	this.main_renderer.setPixelRatio( this.pixel_ratio[0] );
  	this.main_renderer.setSize( width, height );
  	this.main_renderer.autoClear = false; // Manual update so that it can render two scenes
  	this.main_renderer.localClippingEnabled=true; // Enable clipping
  	this.main_renderer.setClearColor( this.background_color );


  	// sidebar renderer (multiple cameras.)
  	if( this.has_webgl2 ){
      // We need to use webgl2 for VolumeRenderShader1 to work
      let side_canvas_el = document.createElement('canvas'),
          side_context = side_canvas_el.getContext( 'webgl2' );
    	this.side_renderer = new THREE.WebGLRenderer({
    	  antialias: false, alpha: true,
    	  canvas: side_canvas_el, context: side_context
    	});
    }else{
    	this.side_renderer = new THREE.WebGLRenderer( { antialias: false, alpha: true } );
    }

  	this.side_renderer.setPixelRatio( this.pixel_ratio[1] );
  	this.side_renderer.autoClear = false; // Manual update so that it can render two scenes
  	let _render_height = Math.floor( Math.max( width / 3, height ) / this.pixel_ratio[1] / 2 );
  	if( _render_height < 256 ){ _render_height = 256; }
  	if( _render_height > 512 ){ _render_height = 512; }
  	this.side_renderer._render_height = _render_height;
    this.side_renderer.setSize( _render_height * 3 , _render_height );
  	// this.side_renderer.setSize( width, height ); This step is set dynamically when sidebar cameras are inserted

    // Element container
    this.main_canvas = document.createElement('div');
    this.main_canvas.className = 'THREEBRAIN-MAIN-CANVAS';
    this.main_canvas.style.width = width + 'px';
    // register mouse events to save time from fetching from DOM elements
    this.register_main_canvas_events();

    // this.main_canvas.appendChild( this.main_renderer.domElement );
    this.main_canvas.appendChild( this.domElement );

    let wrapper_canvas = document.createElement('div');
    this.wrapper_canvas = wrapper_canvas;
    this.main_canvas.style.display = 'inline-flex';
    this.wrapper_canvas.style.display = 'flex';
    this.wrapper_canvas.style.flexWrap = 'wrap';
    this.wrapper_canvas.style.width = '100%';
    this.has_side_cameras = false;
    this.side_canvas = {};

    // Generate inner canvas DOM element
    // coronal (FB), axial (IS), sagittal (LR)
    // 3 planes are draggable, resizable with open-close toggles 250x250px initial

    ['coronal', 'axial', 'sagittal'].forEach((nm, idx) => {

      const div = document.createElement('div');
      div.id = this.container_id + '__' + nm;
      div.className = 'THREEBRAIN-SIDE resizable';
      div.style.zIndex = idx;
      div.style.top = ( idx * this.side_width ) + 'px';

      // Make header
      const div_header = document.createElement('div');
      div_header.innerText = nm.toUpperCase();
      div_header.className = 'THREEBRAIN-SIDE-HEADER';
      div_header.id = div.id + 'header';
      div.appendChild( div_header );

      // Add canvas
      const cvs = document.createElement('canvas');
      cvs.width = this.side_renderer._render_height * this.pixel_ratio[1];
      cvs.height = this.side_renderer._render_height * this.pixel_ratio[1];
      cvs.style.width = '100%';
			cvs.style.height = '100%';
			cvs.style.position = 'absolute';
			div.appendChild( cvs );

			// Add zoom tools
			let zoom_level = 1;
			const set_zoom_level = (level) => {
			  if( level ){
			    zoom_level = level;
			  }else{
			    level = zoom_level;
			  }
			  cvs.style.width = parseInt(level * 100) + '%';
			  cvs.style.height = parseInt(level * 100) + '%';
			  const cvs_size = get_element_size( cvs );
			  const div_size = get_element_size( div );
			  const depths = [this._sagittal_depth || 0, this._coronal_depth || 0, this._axial_depth || 0];

			  let _left = 0,
			      _top = 0;
			  if( nm === 'coronal' ){
			    _left = Math.max( Math.min( div_size[0] / 2 - (128 + depths[0]) / 256 * cvs_size[0], 0 ), div_size[0] - cvs_size[0]);
			    _top = Math.max( Math.min( div_size[1] / 2 - (128 - depths[2]) / 256 * cvs_size[1], 0 ), div_size[1] - cvs_size[1]);
			  }else if( nm === 'axial' ){
			    _left = Math.max( Math.min( div_size[0] / 2 - (128 + depths[0]) / 256 * cvs_size[0], 0 ), div_size[0] - cvs_size[0]);
			    _top = Math.max( Math.min( div_size[1] / 2 - (128 - depths[1]) / 256 * cvs_size[1], 0 ), div_size[1] - cvs_size[1]);
			  }else if( nm === 'sagittal' ){
			    _left = Math.max( Math.min( div_size[0] / 2 - (128 - depths[1]) / 256 * cvs_size[0], 0 ), div_size[0] - cvs_size[0]);
			    _top = Math.max( Math.min( div_size[1] / 2 - (128 - depths[2]) / 256 * cvs_size[1], 0 ), div_size[1] - cvs_size[1]);
			  }

			  cvs.style.left = _left + 'px';
			  cvs.style.top = _top + 'px';

			};
			const zoom_in = document.createElement('div');
			zoom_in.className = 'zoom-tool';
			zoom_in.style.top = '23px';
			zoom_in.innerText = '+';
			div.appendChild( zoom_in );
			zoom_in.addEventListener('click', (e) => {
			  zoom_level = zoom_level * 1.2;
			  zoom_level = zoom_level > 10 ? 10 : zoom_level;
			  set_zoom_level();
			});

			const zoom_out = document.createElement('div');
			zoom_out.className = 'zoom-tool';
			zoom_out.style.top = '50px';
			zoom_out.innerText = '-';
			div.appendChild( zoom_out );
			zoom_out.addEventListener('click', (e) => {
			  zoom_level = zoom_level / 1.2;
			  zoom_level = zoom_level < 1.1 ? 1 : zoom_level;
			  set_zoom_level();
			});

			const toggle_pan = document.createElement('div');
			toggle_pan.className = 'zoom-tool';
			toggle_pan.style.top = '77px';
			toggle_pan.innerText = 'P';
			div.appendChild( toggle_pan );
			toggle_pan.addEventListener('click', (e) => {
			  toggle_pan.classList.toggle('pan-active');
			  toggle_pan_canvas( toggle_pan.classList.contains('pan-active') ? 'pan' : 'select' );
			});

			const zoom_reset = document.createElement('div');
			zoom_reset.className = 'zoom-tool';
			zoom_reset.style.top = '104px';
			zoom_reset.innerText = '0';
			div.appendChild( zoom_reset );
			zoom_reset.addEventListener('click', (e) => {
			  cvs.style.top = '0';
        cvs.style.left = '0';
			  set_zoom_level( 1 );
			});


			// Add cameras
			const camera = new THREE.OrthographicCamera( 300 / - 2, 300 / 2, 300 / 2, 300 / - 2, 1, 10000 );
			// Side light is needed so that side views are visible.
			const side_light = new THREE.DirectionalLight( 0xefefef, 0.5 );

			if( idx === 0 ){
			  // coronal (FB)
			  camera.position.fromArray( [0, -500, 0] );
			  camera.up.set( 0, 0, 1 );
			  camera.layers.enable( CONSTANTS.LAYER_SYS_CORONAL_9 );
			  side_light.position.fromArray([0, 1, 0]);
			  side_light.layers.set( CONSTANTS.LAYER_SYS_CORONAL_9 );
			}else if( idx === 1 ){
			  // axial (IS)
			  camera.position.fromArray( [0, 0, 500] );
			  camera.up.set( 0, 1, 0 );
			  camera.layers.enable( CONSTANTS.LAYER_SYS_AXIAL_10 );
			  side_light.position.fromArray([0, 0, -1]);
			  side_light.layers.set( CONSTANTS.LAYER_SYS_AXIAL_10 );
			}else{
			  // sagittal (LR)
			  camera.position.fromArray( [-500, 0, 0] );
			  camera.up.set( 0, 0, 1 );
			  camera.layers.enable( CONSTANTS.LAYER_SYS_SAGITTAL_11 );
			  side_light.position.fromArray([1, 0, 0]);
			  side_light.layers.set( CONSTANTS.LAYER_SYS_SAGITTAL_11 );
			}

			camera.lookAt( new THREE.Vector3(0,0,0) );
			camera.aspect = 1;
			camera.updateProjectionMatrix();
			[1, 4, 5, 6, 7, 13].forEach((ly) => {
        camera.layers.enable(ly);
      });

      // light is always following cameras
      camera.add( side_light );
      this.add_to_scene( camera, true );

      // Add resizables
      let tmp = [
        document.createElement('div'),
        document.createElement('div')
      ];
      tmp[0].className = 'resizers';
      tmp[1].className = 'resizer bottom-right';
      tmp[0].appendChild( tmp[1] );
      div.appendChild( tmp[0] );
      // Add div to wrapper
      this.wrapper_canvas.appendChild( div );

      // Make it draggable
      const raise_top = (e, data) => {
        if( this.has_side_cameras ){
          // reset z-index
          let z_ind = [
            [parseInt(this.side_canvas.coronal.container.style.zIndex), 'coronal'],
            [parseInt(this.side_canvas.axial.container.style.zIndex), 'axial'],
            [parseInt(this.side_canvas.sagittal.container.style.zIndex), 'sagittal']
          ];
          z_ind.sort((v1,v2) => {return(v1[0] - v2[0])});
          z_ind.forEach((v, ii) => {
            this.side_canvas[ v[ 1 ] ].container.style.zIndex = ii;
          });
          this.side_canvas[ nm ].container.style.zIndex = 4;
        }
      };
      make_draggable( div, div_header, undefined, raise_top);


      const toggle_pan_canvas = make_draggable( cvs, undefined, div, (e, data) => {
        raise_top(e, data);

        if( data.state === 'select' || data.state === 'move' ){
          const _size = get_element_size( cvs ),
                _x = data.x / _size[0] * 256 - 128,
                _y = data.y / _size[1] * 256 - 128;

          console.log(`x: ${_x}, y: ${_x} of [${_size[0]}, ${_size[1]}]`);
          if( nm === 'coronal' ){
            this._sagittal_depth = _x;
            this._axial_depth = -_y;
          }else if( nm === 'axial' ){
            this._sagittal_depth = _x;
            this._coronal_depth = -_y;
          }else if( nm === 'sagittal' ){
            this._coronal_depth = -_x;
            this._axial_depth = -_y;
          }
          // Also set main_camera
          const _d = new THREE.Vector3(
            this._sagittal_depth || 0,
            this._coronal_depth || 0,
            this._axial_depth || 0
          ).normalize().multiplyScalar(500);
          if( _d.length() === 0 ){
            _d.z = 500;
          }

          if( e.shiftKey ){
            const heads_up = new THREE.Vector3(0, 0, 1);
            // calculate camera up
            let _cp = this.main_camera.position.clone().cross( heads_up ).cross( _d ).normalize();
            if( _cp.length() < 0.5 ){
              _cp.y = 1;
            }

            // Always try to heads up
            if( _cp.dot( heads_up ) < 0 ){
              _cp.multiplyScalar(-1);
            }

            this.main_camera.position.copy( _d );
            this.main_camera.up.copy( _cp );
          }

          this.set_side_depth( this._coronal_depth, this._axial_depth, this._sagittal_depth );

        }
      } );
      toggle_pan_canvas( 'select' );

      // Make cvs scrollable, but change slices
      cvs.addEventListener("mousewheel", (evt) => {
        evt.preventDefault();
        if( evt.altKey ){
          if( evt.deltaY > 0 ){
            this[ '_' + nm + '_depth' ] = (this[ '_' + nm + '_depth' ] || 0) + 1;
          }else if( evt.deltaY < 0 ){
            this[ '_' + nm + '_depth' ] = (this[ '_' + nm + '_depth' ] || 0) - 1;
          }
        }
        this.set_side_depth( this._coronal_depth, this._axial_depth, this._sagittal_depth );
      });

      // Make resizable, keep current width and height
      make_resizable( div, true );

      // add double click handler
      const reset = ( _zoom_level ) => {
        div.style.top = ( idx * this.side_width ) + 'px';
        div.style.left = '0';
        div.style.width = this.side_width + 'px';
        div.style.height = this.side_width + 'px';
        if( _zoom_level !== undefined ){
          set_zoom_level( _zoom_level || 1 );
        }

      };
      div_header.addEventListener("dblclick", (evt) => {
        reset();
        // Resize side canvas
        // this.handle_resize( undefined, undefined );
      });


      this.side_canvas[ nm ] = {
        'container' : div,
        'canvas'    : cvs,
        'context'   : cvs.getContext('2d'),
        'camera'    : camera,
        'reset'     : reset,
        'get_zoom_level' : () => { return( zoom_level ) },
        'set_zoom_level' : set_zoom_level
      };


    });


    // Add main canvas to wrapper element
    // this.wrapper_canvas.appendChild( this.side_canvas );
    this.wrapper_canvas.appendChild( this.main_canvas );
    this.el.appendChild( this.wrapper_canvas );


    this.has_stats = false;


    // Controls
    // First, it should be a OrthographicTrackballControls to ignore distance information
    // Second, it need main canvas, hence main canvas Must be added to dom element
    this.controls = new THREE.OrthographicTrackballControls( this.main_camera, this.main_canvas );
  	this.controls.zoomSpeed = 0.02;
  	// You cannot use pan in perspective camera. So if you are using PerspectiveCamera, this needs to be true
  	this.controls.noPan = false;
  	// Initial radius is 500
  	// orthographic.radius = 400;
  	this.controls.dynamicDampingFactor=0.5;
    this.control_center = [0, 0, 0];

    // set control listeners
    this.controls.addEventListener('start', (v) => {

      if(this.render_flag < 0 ){
        // adjust controls
        this.handle_resize(undefined, undefined, true);
      }

      // normal controls, can be interrupted
      this.start_animation(1);
    });

    this.controls.addEventListener('end', (v) => {
      // normal pause, can be overridden
      this.pause_animation(1);

    });

    // Follower that fixed at bottom-left
    this.compass = new Compass( this.main_camera, this.controls );
    this.add_to_scene(this.compass.container, true);



    // Mouse helpers
    let mouse_pointer = new THREE.Vector2(),
        mouse_raycaster = new THREE.Raycaster(),
        mouse_helper = new THREE.ArrowHelper(new THREE.Vector3( 0, 0, 1 ), new THREE.Vector3( 0, 0, 0 ), 50, 0xff0000, 2 ),
        mouse_helper_root = new THREE.Mesh(
          new THREE.BoxBufferGeometry( 4,4,4 ),
          new THREE.MeshBasicMaterial({ color : 0xff0000 })
        );

    // root is a green cube that's only visible in side cameras
    mouse_helper_root.layers.set( CONSTANTS.LAYER_SYS_ALL_SIDE_CAMERAS_13 );
    mouse_helper.layers.set( CONSTANTS.LAYER_SYS_MAIN_CAMERA_8 );

    // In side cameras, always render mouse_helper_root on top
    mouse_helper_root.renderOrder = CONSTANTS.MAX_RENDER_ORDER;
    mouse_helper_root.material.depthTest = false;
    // mouse_helper_root.onBeforeRender = function( renderer ) { renderer.clearDepth(); };

    mouse_helper.add( mouse_helper_root );
    this.mouse_helper = mouse_helper;
    this.mouse_raycaster = mouse_raycaster;
    this.mouse_pointer = mouse_pointer;

    this.add_to_scene(mouse_helper, true);




		// File loader
    this.loader_triggered = false;
    this.loader_manager = new THREE.LoadingManager();
    this.loader_manager.onStart = () => {
      this.loader_triggered = true;
      console.debug( 'Loading start!');
    };
    this.loader_manager.onLoad = () => {
      console.debug( 'Loading complete!');

      // immediately render once
      this.start_animation(0);
    };
    this.loader_manager.onProgress = ( url, itemsLoaded, itemsTotal ) => {
    	console.debug( 'Loading file: ' + url + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.' );
    };
    this.loader_manager.onError = function ( url ) { console.debug( 'There was an error loading ' + url ) };

    this.json_loader = new THREE.FileLoader( this.loader_manager );
    this.font_loader = new THREE.FontLoader( this.loader_manager );

  }

  add_to_scene( m, global = false ){
    if( global ){
      this.scene.add( m );
    }else{
      this.origin.add( m );
    }
  }

  get_main_camera_params(){
    return({
      'target' : this.main_camera.localToWorld(new THREE.Vector3(
        -this.main_camera.userData.pos[0],
        -this.main_camera.userData.pos[1],
        -this.main_camera.userData.pos[2]
      )), //[-1.9612333761590435, 0.7695650079159719, 26.928547456443564]
      'up' : this.main_camera.up, // [0.032858884967361716, 0.765725462595094, 0.6423276497335524],
      'position': this.main_camera.position //[-497.73726242493797, 53.59986825131752, -10.689109034020102]
    });
  }

  draw_axis( x , y , z ){
    if( !this._coordinates ){
      this._coordinates = {};
      const origin = new THREE.Vector3( 0, 0, 0 );
      // x
      this._coordinates.x = new THREE.ArrowHelper( new THREE.Vector3( 1, 0, 0 ),
              origin, x === 0 ? 1: x, 0xff0000 );

      this._coordinates.y = new THREE.ArrowHelper( new THREE.Vector3( 0, 1, 0 ),
              origin, y === 0 ? 1: y, 0x00ff00 );

      this._coordinates.z = new THREE.ArrowHelper( new THREE.Vector3( 0, 0, 1 ),
              origin, z === 0 ? 1: z, 0x0000ff );
      this._coordinates.x.layers.set( CONSTANTS.LAYER_SYS_ALL_CAMERAS_7 );
      this._coordinates.y.layers.set( CONSTANTS.LAYER_SYS_ALL_CAMERAS_7 );
      this._coordinates.z.layers.set( CONSTANTS.LAYER_SYS_ALL_CAMERAS_7 );
      this.add_to_scene( this._coordinates.x );
      this.add_to_scene( this._coordinates.y );
      this.add_to_scene( this._coordinates.z );
    }
    // If ? === 0, then hide this axis
    if( x === 0 ){
      this._coordinates.x.visible = false;
    }else{
      this._coordinates.x.visible = true;
    }

    if( y === 0 ){
      this._coordinates.y.visible = false;
    }else{
      this._coordinates.y.visible = true;
    }

    if( z === 0 ){
      this._coordinates.z.visible = false;
    }else{
      this._coordinates.z.visible = true;
    }


  }

  register_main_canvas_events(){
    this.main_canvas.addEventListener( 'dblclick', (event) => { // Use => to create flexible access to this
      if(this.mouse_event !== undefined && this.mouse_event.level > 2){
        return(null);
      }
      this.mouse_event = {
        'action' : 'dblclick',
        'event' : event,
        'dispose' : false,
        'level' : 2
      };

    }, false );

    this.main_canvas.addEventListener( 'click', (event) => { // Use => to create flexible access to this
      if(this.mouse_event !== undefined && this.mouse_event.level > 1){
        return(null);
      }
      this.mouse_event = {
        'action' : 'click',
        'button' : event.button,
        'event' : event,
        'dispose' : false,
        'level' : 1
      };

    }, false );

    this.main_canvas.addEventListener( 'contextmenu', (event) => { // Use => to create flexible access to this
      if(this.mouse_event !== undefined && this.mouse_event.level > 1){
        return(null);
      }
      this.mouse_event = {
        'action' : 'contextmenu',
        'button' : event.button,
        'event' : event,
        'dispose' : false,
        'level' : 1
      };

    }, false );

    this.main_canvas.addEventListener( 'mousemove', (event) => {
      if(this.mouse_event !== undefined && this.mouse_event.level > 0){
        return(null);
      }
      this.mouse_event = {
        'action' : 'mousemove',
        'event' : event,
        'dispose' : false,
        'level' : 0
      };

    }, false );

    this.main_canvas.addEventListener( 'mousedown', (event) => {

      this.mouse_event = {
        'action' : 'mousedown',
        'event' : event,
        'dispose' : false,
        'level' : 3
      };

    }, false );

    this.main_canvas.addEventListener( 'mouseup', (event) => {
      this.mouse_event = {
        'action' : 'mouseup',
        'event' : event,
        'dispose' : true,
        'level' : 0
      };

    }, false );

    window.addEventListener( 'keydown', (event) => {
      if( this.listen_keyboard ){
        event.preventDefault();
        this.keyboard_event = {
          'action' : 'keydown',
          'event' : event,
          'dispose' : false,
          'level' : 0
        };
      }

    });

    this.add_mouse_callback(
      (evt) => {
        return({
          pass  : ['click', 'dblclick'].includes( evt.action ) || ( evt.action === 'mousedown' && evt.event.button === 2 ),
          type  : 'clickable'
        });
      },
      (res, evt) => {
        this.focus_object( res.target_object );
        this.start_animation( 0 );
      },
      'set_obj_chosen'
    );

    this.add_mouse_callback(
      (evt) => {
        return({
          pass  : ['click', 'dblclick'].includes( evt.action ) ||
                  ( evt.action === 'mousedown' && evt.event.button === 2 ),
          type  : 'clickable'
        });
      },
      ( res, evt ) => {
        const first_item = res.first_item;
        if( first_item ){
          const target_object = res.target_object,
                from = first_item.point,
                direction = first_item.face.normal.normalize();

          // Some objects may be rotated, hence we need to update normal according to target object matrix world first to get action (world) normal direction
          direction.transformDirection( target_object.matrixWorld );
          let back = this.mouse_raycaster.ray.direction.dot(direction) > 0; // Check if the normal is hidden by object (from camera)
          if(back){
            direction.applyMatrix3(new THREE.Matrix3().set(-1,0,0,0,-1,0,0,0,-1));
          }

          this.mouse_helper.position.fromArray( to_array(from) );
          this.mouse_helper.setDirection(direction);
          this.mouse_helper.visible = true;

        }else{
          this.mouse_helper.visible = false;
        }

        this.start_animation(0);
      },
      'raycaster'
    );

    // zoom-in, zoom-out
    this.add_keyboard_callabck( CONSTANTS.KEY_ZOOM, (evt) => {
      if( evt.event.shiftKey ){
        this.main_camera.zoom = this.main_camera.zoom * 1.2; // zoom in
      }else{
        this.main_camera.zoom = this.main_camera.zoom / 1.2; // zoom out
      }
      this.main_camera.updateProjectionMatrix();
      this.start_animation( 0 );
    }, 'zoom');

    this.add_keyboard_callabck( CONSTANTS.KEY_CYCLE_ELECTRODES, (evt) => {
      let m = this.object_chosen,
          last_obj = false,
          this_obj = false,
          first_obj = false;

      for( let _nm in this.mesh ){
        this_obj = this.mesh[ _nm ];
        if( this_obj.isMesh && this_obj.userData.construct_params.is_electrode ){
          if( last_obj && last_obj.name === m.name ){
            this.focus_object( this_obj, true );
            return(null);
          }
          last_obj = this_obj;
          if( !first_obj ){
            first_obj = this_obj;
          }
        }
      }
      if( last_obj !== false ){
        // has electrode
        if( last_obj.name === m.name ){
        // focus on the first one
          last_obj = first_obj;
        }
        this.focus_object( this_obj, true );
        return(null);
      }

      this.start_animation( 0 );

    }, 'electrode_cycling');


    if( this.DEBUG ){
      this.add_mouse_callback(
        (evt) => {
          return({
            pass  : evt.action !== 'mousemove',
            type  : 'clickable'
          });
        },
        (res, evt) => {
          console.log( evt );
          console.debug( `${res.items.length} items found by raycaster.` );
        },
        'debug'
      );

    }


  }

  focus_object( m = undefined, helper = false ){
    if( this.object_chosen ){
      this.highlight( this.object_chosen, true );
    }
    if( m ){
      this.object_chosen = m;
      this.highlight( this.object_chosen, false );
      console.debug('object selected ' + m.name);

      if( helper ){
        m.getWorldPosition( this.mouse_helper.position );
      }


    }else{
      this.object_chosen = undefined;
    }
  }

  highlight( m, reset = false ){
    // _child.userData.is_highlight_helper = true;
    if( !m || !m.userData ){ return(null); }

    let _flag = false;

    // check if there is highlight helper
    if( m.children.length > 0 ){
      m.children.forEach((_c) => {
        if( _c.isMesh && _c.userData.is_highlight_helper ){
          _c.visible = !reset;
          _flag = true;
        }
      });
    }

    if( _flag ){ return(null); }

    if( m.isMesh && m.userData.construct_params ){
      const g = m.userData.construct_params;
      if( m.material.isMeshLambertMaterial ){
        m.material.emissive.r = 1 - reset;
      }
    }

  }

  get_mouse(){
    if(this.mouse_event !== undefined && !this.mouse_event.dispose){
      let event = this.mouse_event.event;
      this.mouse_pointer.x = ( event.offsetX / this.main_canvas.clientWidth ) * 2 - 1;
      this.mouse_pointer.y = - ( event.offsetY / this.main_canvas.clientHeight ) * 2 + 1;
    }
  }

  _add_stats(){
    // if DEBUG, add stats information
    // Stats
    if(!this.has_stats){
      this.has_stats = true;
      this.stats = new Stats();
      this.stats.domElement.style.display = 'block';
      this.stats.domElement.style.position = 'absolute';
      this.stats.domElement.style.top = '0';
      this.stats.domElement.style.left = '0';
      this.el.appendChild( this.stats.domElement );
    }
  }

  _fast_raycast(clickable_only, max_search = 1000){

    /* this.use_octree = true; */

    // Use octree to speed up
    var items = [];

    this.mouse_raycaster.setFromCamera( this.mouse_pointer, this.main_camera );

    if(clickable_only){
      let raycaster = this.mouse_raycaster;
      //let octreeObjects = this.octree.search( raycaster.ray.origin, raycaster.ray.far, true, raycaster.ray.direction );
      // items = raycaster.intersectOctreeObjects( octreeObjects );
      items = raycaster.intersectObjects( to_array( this.clickable ) );
    }else{
      if(this.DEBUG){
        console.debug('Searching for all intersections - Partial searching');
      }

      // We need to filter out meshes
      // 1. invisible
      // 2. layers > 20
      // 3. not intersect with ray on the boxes

      // First step, intersect with boxes
      let target_object,
          test_layer = new THREE.Layers(),
          p1 = new THREE.Vector3(),
          p2 = new THREE.Vector3();

      test_layer.mask = 16383;

      for( var mesh_name in this.mesh ){
        let m = this.mesh[mesh_name];
        if(m.isMesh && m.visible && m.layers.test(test_layer)){
          let geom = m.geometry;

          if(!geom.boundingBox){
            geom.computeBoundingBox();
          }

          let box_item = this.mouse_raycaster.ray.intersectBox(geom.boundingBox, p2);
          if(box_item !== null){
            if(target_object === undefined || (p1.distanceTo( this.main_camera.position ) > p2.distanceTo( this.main_camera.position ) )){
              target_object = m;
              p1.set( p2.x, p2.y, p2.z );
            }
          }
        }

      }

      console.log(target_object.name);

      if(target_object !== undefined){
        console.log(target_object.name);
        items = this.mouse_raycaster.intersectObject( target_object, false );
      }

    }

    if(this.DEBUG){
      this._items = items;
    }

		return(items);

  }

  add_mouse_callback(check, callback, name){
    this._mouse_click_callbacks[name] = [check, callback];
  }
  add_keyboard_callabck(keycode, callback, name){
    this._keyboard_callbacks[name] = [keycode, callback];
  }

  keyboard_update(){

    if( !this.keyboard_event || this.keyboard_event.dispose ){
      return( null );
    }
    this.keyboard_event.dispose = true;
    if(this.keyboard_event.level <= 2){
      this.keyboard_event.level = 0;
    }

    // handle
    for( let _cb_name in this._keyboard_callbacks ){

      if( this._keyboard_callbacks[ _cb_name ] &&
          this.keyboard_event.event.keyCode === this._keyboard_callbacks[ _cb_name ][0] ){
        this._keyboard_callbacks[ _cb_name ][1]( this.keyboard_event );
      }

    }
  }

  // method to target object with mouse pointed at
  mouse_update(){

    if( !this.mouse_event || this.mouse_event.dispose ){
      return(null);
    }

    // dispose first as the callbacks might have error
    this.mouse_event.dispose = true;
    if(this.mouse_event.level <= 2){
      this.mouse_event.level = 0;
    }


    // Call callbacks
    let raycast_result;

    for( let _cb_name in this._mouse_click_callbacks ){
      const callback = this._mouse_click_callbacks[ _cb_name ];
      if( callback === undefined ){
        continue;
      }
      const request = callback[0]( this.mouse_event );
      if( request.pass ){
        // raycast object
        if( raycast_result === undefined ){
          // Do simple, fast raycast
          raycast_result = {
            type  : request.type === 'full' ? 'full' : 'clickable',
            items : this._fast_raycast( request.type === 'clickable' )
          };
        }

        // If clickable was performed, but full is requested
        if( request.type === 'full' && raycast_result.type === 'clickable' ){
          raycast_result = {
            type  : 'full',
            items : this._fast_raycast( false )
          };
        }

        // Find object_chosen
        if( raycast_result.items.length > 0 ){
          // Has intersects!
          const first_item = raycast_result.items[0],
                target_object = first_item.object;

          raycast_result.first_item = first_item;
          raycast_result.target_object = target_object;
        }

        callback[1]( raycast_result, this.mouse_event );
      }
    }



  }

  render_legend_old(text_color = '#ffffff'){


    let text_color_fmt = text_color.replace(/^[^0-9a-f]*/, '0x');
    let lut = this.lut,
        labels = this.lut.legend.labels;

    // canvas.legend_labels[ 'title' ]
    let c = this.legend_labels.title.material.map.image.getContext( '2d' );
    // c.clearRect(0,0,0,0);
    c.fillStyle = text_color;
    c.fillText(
      labels.title.toString() + labels.um.toString(), 4, labels.fontsize + 4 // borderThickness = 4
    );

    this.legend_labels.title.material.map.needsUpdate=true;
    // this.legend_labels.title.material.color.setHex( text_color );

    for ( let i = 0; i < labels.ticks; i++ ){

      let t = this.legend_labels.ticks[ i ].material.map.image.getContext( '2d' );

      var value = ( lut.maxV - lut.minV ) / ( labels.ticks - 1 ) * i + lut.minV;

			if ( labels.notation == 'scientific' ) {
				value = value.toExponential( labels.decimal );
			} else {
				value = value.toFixed( labels.decimal );
			}

      t.fillStyle = text_color;
      t.fillText( value.toString(), 4, labels.fontsize + 4 );

      this.legend_labels.ticks[ i ].material.map.needsUpdate=true;

      this.legend_labels.lines[ i ].material.color.setHex( text_color_fmt );
      this.legend_labels.lines[ i ].material.needsUpdate = true;
    }


    this.legend_camera.updateProjectionMatrix();
    this.legend_renderer.render( this.scene_legend, this.legend_camera );
  }


  set_colormap(map, min, max, color_name = 'threebrain_default', label_args = {
    'title': 'Value', 'ticks': 5, 'fontsize': 36
  }){
    if(THREE.ColorMapKeywords[color_name] === undefined){
      THREE.ColorMapKeywords[color_name] = [];
    }else{
      THREE.ColorMapKeywords[color_name].length = 0;
    }

    let n_color = map.length;
    map.forEach((v) => {
      THREE.ColorMapKeywords[color_name].push([parseFloat(v[0]), v[1]]);
    });

    // Create lut object
    this.lut = new THREE.Lut(color_name, n_color);

    this.lut.setMin(min);
    this.lut.setMax(max);

  }

  get_color(v){
    if(this.lut === undefined){
      return('#e2e2e2');
    }else{
      return(this.lut.getColor(v));
    }
  }


  handle_resize(width, height, lazy = false, center_camera = false){


    if(width === undefined){
      width = this.client_width;
      height = this.client_height;

    }else{
      this.client_width = width;
      this.client_height = height;
    }

    // console.debug('width: ' + width + '; height: ' + height);

    if(lazy){
      this.controls.handleResize();

      this.start_animation(0);

      return(undefined);
    }

    var main_width = width,
        main_height = height;

    // Because when panning controls, we actually set views, hence need to calculate this smartly
    // Update: might not need change
	  if( center_camera ){
      this.main_camera.left = -150;
  	  this.main_camera.right = 150;
  	  this.main_camera.top = main_height / main_width * 150;
  	  this.main_camera.bottom = -main_height / main_width * 150;
	  }else{
  	  let _ratio = main_height / main_width * ( this.main_camera.right - this.main_camera.left ) / ( this.main_camera.top - this.main_camera.bottom );
  	  this.main_camera.top = (this.main_camera.top * _ratio) || (main_height / main_width * 150);
  	  this.main_camera.bottom = (this.main_camera.bottom * _ratio) || (-main_height / main_width * 150);
	  }
    this.main_camera.updateProjectionMatrix();


    // Check if side_camera exists
    if(!this.has_side_cameras){
      // this.side_canvas.style.display = 'none';
    }else{
      /*
      let side_width = Math.max( main_width / 3, main_height );
      side_width = Math.floor( side_width );
      this.side_renderer._render_height = side_width;
      this.side_renderer.setSize( side_width * 3 , side_width );
      */
    }

    this.main_canvas.style.width = main_width + 'px';
    this.main_canvas.style.height = main_height + 'px';

    this.main_renderer.setSize( main_width, main_height );

    const pixelRatio = this.pixel_ratio[0];

    if( this.domElement.width != main_width * pixelRatio ){
      this.domElement.width = main_width * pixelRatio;
      this.domElement.style.width = main_width + 'px';
    }

    if( this.domElement.height != main_height * pixelRatio ){
      this.domElement.height = main_height * pixelRatio;
      this.domElement.style.height = main_height + 'px';
    }

    this.controls.handleResize();

    this.start_animation(0);

  }

  update_control_center( v ){
    v = to_array(v);
    this.controls.target.fromArray( v );
    this.control_center = to_array( v );
  }
  reset_main_camera( pos, zoom = 1 ){
    if( Array.isArray(pos) && pos.length === 3 ){
      this.main_camera.userData.pos = pos;
      this.main_camera.position.set(pos[0] , pos[1] , pos[2]);
    }
    if( zoom !== undefined ){
      this.main_camera.zoom = zoom;
    }
    this.main_camera.updateProjectionMatrix();
  }
  reset_side_canvas( zoom_level ){
    this.side_canvas.coronal.reset( zoom_level );
    this.side_canvas.axial.reset( zoom_level );
    this.side_canvas.sagittal.reset( zoom_level );
    // Resize side canvas
    this.handle_resize( undefined, undefined );
  }

  reset_side_cameras( pos, scale = 300, distance = 500 ){

    if( pos ){
      this._side_canvas_position = pos;
    }else{
      pos = this._side_canvas_position || CONSTANTS.VEC_ORIGIN;
    }

    this.side_canvas.coronal.camera.position.x = pos.x;
    this.side_canvas.coronal.camera.position.z = pos.z;
    this.side_canvas.coronal.camera.position.y = -distance;
    this.side_canvas.coronal.camera.lookAt( pos.x, pos.y, pos.z );

    this.side_canvas.coronal.camera.top = scale / 2;
    this.side_canvas.coronal.camera.bottom = -scale / 2;
    this.side_canvas.coronal.camera.right = scale / 2;
    this.side_canvas.coronal.camera.left = -scale / 2;

    this.side_canvas.axial.camera.position.x = pos.x;
    this.side_canvas.axial.camera.position.y = pos.y;
    this.side_canvas.axial.camera.position.z = distance;
    this.side_canvas.axial.camera.lookAt( pos.x, pos.y, pos.z );
    this.side_canvas.axial.camera.top = scale / 2;
    this.side_canvas.axial.camera.bottom = -scale / 2;
    this.side_canvas.axial.camera.right = scale / 2;
    this.side_canvas.axial.camera.left = -scale / 2;

    this.side_canvas.sagittal.camera.position.y = pos.y;
    this.side_canvas.sagittal.camera.position.z = pos.z;
    this.side_canvas.sagittal.camera.position.x = -distance;
    this.side_canvas.sagittal.camera.lookAt( pos.x, pos.y, pos.z );
    this.side_canvas.sagittal.camera.top = scale / 2;
    this.side_canvas.sagittal.camera.bottom = -scale / 2;
    this.side_canvas.sagittal.camera.right = scale / 2;
    this.side_canvas.sagittal.camera.left = -scale / 2;


    this.side_canvas.coronal.camera.updateProjectionMatrix();
    this.side_canvas.axial.camera.updateProjectionMatrix();
    this.side_canvas.sagittal.camera.updateProjectionMatrix();

    this.start_animation( 0 );
  }

  reset_controls(){
	  // reset will erase target, manually reset target
	  // let target = this.controls.target.toArray();
		this.controls.reset();
		this.controls.target.fromArray( this.control_center );

		//this.main_camera.position.set(0 , 0 , 500);
		//this.main_camera.up.set(0 , 1 , 0);
		//this.main_camera.zoom = 1;
		//this.main_camera.updateProjectionMatrix();
    const pos = this.main_camera.userData.pos;
    this.main_camera.position.set(pos[0] , pos[1] , pos[2]);

    this.main_camera.up.set(0, 1, 0);

    this.main_camera.zoom = 1;
    this.main_camera.updateProjectionMatrix();


		// immediately render once
    this.start_animation(0);
	}
  update(){

    this.get_mouse();
    this.controls.update();
    this.compass.update();

    try {
      this.keyboard_update();
      this.mouse_update();
    } catch (e) {
      if(this.DEBUG){
        console.error(e);
      }
    }

  }

  mapToCanvas(){
    const _width = this.domElement.width,
          _height = this.domElement.height;

    // Clear the whole canvas
    this.domContext.fillStyle = this.background_color;
    this.domContext.fillRect(0, 0, _width, _height);

    // copy the main_renderer context
    this.domContext.drawImage( this.main_renderer.domElement, 0, 0, _width, _height);

    // side cameras
    if( this.has_side_cameras ){
      const _rh = this.side_renderer._render_height * this.pixel_ratio[1];

      /* Use integer pixels here to avoid sub-pixel antialiasing problem */
      this.side_canvas.coronal.context.fillStyle = this.background_color;
      this.side_canvas.coronal.context.fillRect(0, 0, _rh, _rh);
      this.side_canvas.coronal.context.drawImage( this.side_renderer.domElement, 0, 0, _rh, _rh, 0, 0, _rh, _rh);


      this.side_canvas.axial.context.fillStyle = this.background_color;
      this.side_canvas.axial.context.fillRect(0, 0, _rh, _rh);
      this.side_canvas.axial.context.drawImage( this.side_renderer.domElement, _rh, 0, _rh, _rh, 0, 0, _rh, _rh);


      this.side_canvas.sagittal.context.fillStyle = this.background_color;
      this.side_canvas.sagittal.context.fillRect(0, 0, _rh, _rh);
      this.side_canvas.sagittal.context.drawImage( this.side_renderer.domElement, _rh * 2, 0, _rh, _rh, 0, 0, _rh, _rh);
    }


  }

  render(){


    // double-buffer to make sure depth renderings
    //this.main_renderer.setClearColor( renderer_colors[0] );
    this.main_renderer.clear();
    this.main_renderer.render( this.scene, this.main_camera );

    if(this.has_side_cameras){
      const _rh = this.side_renderer._render_height;
      // Cut side views
      // Threejs's origin is at bottom-left, but html is at topleft
      // Need to adjust for each view
      // coronal
      this.side_renderer.setViewport( 0, 0, _rh, _rh );
      this.side_renderer.setScissor( 0, 0, _rh, _rh );
      this.side_renderer.setScissorTest( true );
      this.side_renderer.clear();
      this.side_renderer.render( this.scene, this.side_canvas.coronal.camera );

      // axial
      this.side_renderer.setViewport( _rh, 0, _rh, _rh );
      this.side_renderer.setScissor( _rh, 0, _rh, _rh );
      this.side_renderer.setScissorTest( true );
      this.side_renderer.clear();
      this.side_renderer.render( this.scene, this.side_canvas.axial.camera );

      // sagittal
      this.side_renderer.setViewport( _rh * 2, 0, _rh, _rh );
      this.side_renderer.setScissor( _rh * 2, 0, _rh, _rh );
      this.side_renderer.setScissorTest( true );
      this.side_renderer.clear();
      this.side_renderer.render( this.scene, this.side_canvas.sagittal.camera );


    }

  }

  text_ani(){
    // this.animation_controls = {};
    // this.clock = new THREE.Clock();
    let results = {};


    // show mesh value info
    if(this.object_chosen !== undefined &&
        this.object_chosen.userData ){

        results.selected_object = {
          name            : this.object_chosen.userData.construct_params.name,
          position        : this.object_chosen.getWorldPosition( new THREE.Vector3() ),
          custom_info     : this.object_chosen.userData.construct_params.custom_info,
          is_electrode    : this.object_chosen.userData.construct_params.is_electrode || false,
          template_mapping : {
            mapped        : this.object_chosen.userData._template_mapped || false,
            shift         : this.object_chosen.userData._template_shift || 0,
            space         : this.object_chosen.userData._template_space || 'original'
          }
        };

      }


    if( typeof( this.animation_controls.get_params ) === 'function' ){

      // animation is enabled

      let params = this.animation_controls.get_params(),
          is_playing = params.play,
          last_time = params.time,
          speed = params.speed,
          time_start = params.min,
          time_end = params.max,
          clock_time_delta = this.clock.getDelta();

      // next_time =
      //  1. if not is_playing, last_time
      //  2. if is_playing, last_time + time_delta * speed
      let current_time = is_playing ? (last_time + clock_time_delta * speed) : last_time;
      results.current_time = current_time;

      if( current_time > time_end ){
        current_time = time_start;
      }

      // Change animation
      // this.animation_mixer.update( mixerUpdateDelta );
      for( let g_name in this.animation_mixers ){
        this.animation_mixers[ g_name ].update(
          current_time - this.time_range_min - this.animation_mixers[ g_name ].time
        );
      }

      // set timer
      this.animation_controls.set_time( current_time );

      // show mesh value info
      if( results.selected_object &&
        this.object_chosen.userData.ani_value &&
        this.object_chosen.userData.ani_value.length > 0
      ){

        const time_stamp = to_array(this.object_chosen.userData.ani_time);
        const values = to_array(this.object_chosen.userData.ani_value);
        let _tmp = - Infinity;
        for( let ii in time_stamp ){
          if(time_stamp[ ii ] <= current_time && time_stamp[ ii ] > _tmp){
            results.current_value = values[ ii ];
            _tmp = time_stamp[ ii ];
          }
        }
      }

    }


    return(results);

  }

  start_animation(persist = 0){
    // persist 0, render once
    // persist > 0, loop
    if(persist >= this.render_flag){
      this.render_flag = persist;
    }

  }

  pause_animation(level = 1){
    if(this.render_flag <= level){
      this.render_flag = -1;
    }
  }

  // Do not call this function directly after the initial call
  // use "this.start_animation(0);" to render once
  // use "this.start_animation(1);" to keep rendering
  // this.pause_animation(1); to stop rendering
  // Only use 0 or 1
  animate(){

    requestAnimationFrame( this.animate.bind(this) );


    this.update();

    if(this.render_flag >= 0){

      if(this.has_stats){
        this.stats.update();
      }

  		const results = this.text_ani();


  		this.render();

  		// draw main and side rendered images to this.domElement (2d context)
  		this.mapToCanvas();

  		// Add additional information
      const _pixelRatio = this.pixel_ratio[0];
      const _fontType = 'Courier New, monospace';
      const _width = this.domElement.width;
      const _height = this.domElement.height;

      this.domContext.fillStyle = this.foreground_color;

      // Add title
      let line_y = 50, ii = 0, ss = [];
      if( this.title && this.title !== '' ){
        this.domContext.font = `${_pixelRatio * 20}px ${_fontType}`;
        ss = this.title.split('\\n');
        for( ii in ss ){
          this.domContext.fillText(ss[ii], 10, line_y);
          line_y = line_y + 28 * _pixelRatio;
        }
      }

      // Add animation message
      /*
      if( results.txt && results.txt !== '' ){
        this.domContext.font = `${_pixelRatio * 20}px ${_fontType}`;
        ss = results.txt.split('\n');
        for( ii in ss ){
          this.domContext.fillText(ss[ii], 10, line_y);
          line_y = line_y + 28 * _pixelRatio;
        }
      }
      */

      // Add current time to bottom right corner
      if( typeof(results.current_time) === 'number' ){
        this.domContext.font = `${_pixelRatio * 15}px ${_fontType}`;
        this.domContext.fillText(
          `${results.current_time.toFixed(3)} s`,
          _width - 200, _height - 50);

      }

      // Add legend
      let legend_height = 0.6,  // 60% heights
            legend_start = (1 - legend_height) / 2,
            has_color_map = this.render_legend && this.lut && (this.lut.n !== undefined),
            continuous_cmap = has_color_map && this.lut.color_type === 'continuous' && this.lut.n > 1,
            discrete_cmap = has_color_map && this.lut.color_type === 'discrete' && this.lut.n > 0 && Array.isArray(this.lut.color_names);
      if( continuous_cmap ){
        // Determine legend coordinates
        let grd = this.domContext.createLinearGradient(0,0,0,_height),
            legend_step = legend_height / ( this.lut.n - 1 );
        // Starts from 20% height
        grd.addColorStop( 0, this.background_color );
        grd.addColorStop( legend_start - 4 / _height, this.background_color );
        for( let ii in this.lut.lut ){
          grd.addColorStop(legend_start + legend_step * ii,
              '#' + this.lut.lut[this.lut.n - 1 - ii].getHexString());
        }
        grd.addColorStop( 1 - legend_start + 4 / _height, this.background_color );

        // Fill with gradient
        this.domContext.fillStyle = grd;
        this.domContext.fillRect( _width - 200 , legend_start * _height , 50 , legend_height * _height );

        // Add value labels
        let legent_ticks = [];
        let zero_height = ( legend_start + this.lut.maxV * legend_height /
                            (this.lut.maxV - this.lut.minV)) * _height,
            minV_height = (1 - legend_start) * _height,
            maxV_height = legend_start * _height;

        let draw_zero = this.lut.minV < 0 && this.lut.maxV > 0;

        if( typeof( results.current_value ) === 'number' ){
          // There is a colored object rendered, display it
          let value_height = ( legend_start + (this.lut.maxV - results.current_value) * legend_height / (this.lut.maxV - this.lut.minV)) * _height;
          legent_ticks.push([
            results.current_value.toPrecision(4), value_height, 1 ]);

          if( Math.abs( zero_height - value_height ) <= 10 ){
            draw_zero = false;
          }
          if(Math.abs( value_height - minV_height) > 10){
            legent_ticks.push([this.lut.minV.toPrecision(4), minV_height, 0]);
          }
          if(Math.abs( value_height - maxV_height) > 10){
            legent_ticks.push([this.lut.maxV.toPrecision(4), maxV_height, 0]);
          }
        }else{
          legent_ticks.push([this.lut.minV.toPrecision(4), minV_height, 0]);
          legent_ticks.push([this.lut.maxV.toPrecision(4), maxV_height, 0]);
        }

        if( draw_zero ){
          legent_ticks.push(['0', zero_height, 0]);
        }

        this.domContext.font = `${_pixelRatio * 10}px ${_fontType}`;
        this.domContext.fillStyle = this.foreground_color;

        // Fill text
        legent_ticks.forEach((tick) => {

          if( tick[2] === 1 ){
            this.domContext.font = `bold ${_pixelRatio * 10}px ${_fontType}`;
            this.domContext.fillText( tick[0], _width - 130, tick[1] + 5 );
            this.domContext.font = `${_pixelRatio * 10}px ${_fontType}`;
          }else{
            this.domContext.fillText( tick[0], _width - 130, tick[1] + 5 );
          }


        });

        // Fill ticks
        this.domContext.strokeStyle = this.foreground_color;
        this.domContext.beginPath();
        legent_ticks.forEach((tick) => {
          if( tick[2] === 0 ){
            this.domContext.moveTo( _width - 150 , tick[1] );
            this.domContext.lineTo( _width - 145 , tick[1] );
          }else if( tick[2] === 1 ){
            this.domContext.moveTo( _width - 150 , tick[1] );
            this.domContext.lineTo( _width - 145 , tick[1] - 2 );
            this.domContext.lineTo( _width - 145 , tick[1] + 2 );
            this.domContext.lineTo( _width - 150 , tick[1] );
          }
        });
        this.domContext.stroke();

      }else if( discrete_cmap ){
        // this.lut.color_names must exists and length must be
        let n_factors = this.lut.color_names.length;
        legend_height = ( ( n_factors - 1 ) * 60 ) / _height;
        legend_height = legend_height > 0.8 ? 0.8: legend_height;
        legend_start = (1 - legend_height) / 2;
        let legend_step = n_factors == 1 ? 52 : (legend_height / ( n_factors - 1 ));
        let square_height = legend_step * _height;
        square_height = square_height >= 52 ? 50 : Math.max(square_height - 2, 4);
        console.log(square_height);

        for(let ii = 0; ii < n_factors; ii++ ){
          let square_center = (legend_start + legend_step * ii) * _height;
          this.domContext.fillStyle = '#' + this.lut.getColor(ii + 1).getHexString();
          this.domContext.fillRect(
            _width - 200 , square_center - square_height / 2 ,
            50 , square_height
          );

          this.domContext.strokeStyle = this.foreground_color;
          this.domContext.beginPath();
          this.domContext.moveTo( _width - 150 , square_center );
          this.domContext.lineTo( _width - 145 , square_center );
          this.domContext.stroke();

          this.domContext.fillStyle = this.foreground_color;
          this.domContext.font = `${_pixelRatio * 10}px ${_fontType}`;
          this.domContext.fillText(this.lut.color_names[ii],
            _width - 140, square_center + 5, 139
          );
        }

      }

      // Add selected object information
      if( results.selected_object ){
        this.domContext.font = `${_pixelRatio * 15}px ${_fontType}`;
        this.domContext.fillStyle = this.foreground_color;

        let legend_title_width = results.selected_object.name.length * 18;
        if( legend_title_width < 330 ){
          legend_title_width = legend_title_width / 2 + 175;
        }
        this.domContext.fillText(
          results.selected_object.name,
          _width - Math.max( 10 + legend_title_width, 500 ), 50 //legend_start * _height - 63
        );

        // Smaller
        this.domContext.font = `${_pixelRatio * 10}px ${_fontType}`;
        if( results.selected_object.is_electrode ){
          let _m = results.selected_object.template_mapping;
          this.domContext.fillText(
            `mapping: ${ _m.space }, shift: ${ _m.shift.toFixed(2) }`,
            _width - 500, 108 //legend_start * _height - 34
          );
        }

        const pos = results.selected_object.position;
        this.domContext.fillText(
          `global position: (${pos.x.toFixed(2)},${pos.y.toFixed(2)},${pos.z.toFixed(2)})`,
          _width - 500, 135 //legend_start * _height - 34
        );

        if( typeof(results.selected_object.custom_info) === 'string' ){
          legend_title_width = results.selected_object.custom_info.length * 12;
          if( legend_title_width < 330 ){
            legend_title_width = legend_title_width / 2 + 175;
          }
          this.domContext.fillText(
            results.selected_object.custom_info,
            _width - Math.max( 10 + legend_title_width, 500 ), 79 //legend_start * _height - 34
          );
        }

      }


  		// check if capturer is working
      if( this.capturer_recording && this.capturer ){
        // Not really used but just keep it in case for future capturer
        this.capturer.add();
      }
    }

    if(this.render_flag === 0){
      this.render_flag = -1;
    }



	}


	enable_side_cameras(){
	  // Add side renderers to the element
	  this.has_side_cameras = true;
	  for( let k in this.side_canvas ){
	    this.side_canvas[ k ].container.style.display = 'block';
	  }
	  this.handle_resize();
	}
	disable_side_cameras(force = false){
	  //this.side_canvas.style.display = 'none';
	  for( let k in this.side_canvas ){
	    this.side_canvas[ k ].container.style.display = 'none';
	  }
	  this.has_side_cameras = false;
	  this.handle_resize();
	}



  // Function to clear all meshes
  clear_all(){
    for(var i in this.mesh){
      this.scene.remove(this.mesh[i]);
    }
    for(var ii in this.group){
      this.scene.remove(this.group[ii]);
    }
    this.mesh = {};
    this.group = {};
    this.clickable = {};
    this.subject_codes.length = 0;
    this.electrodes = {};
    this.volumes = {};
    this.surfaces = {};
    this.state_data = {};
    this._mouse_click_callbacks['side_viewer_depth'] = undefined;

    // Stop showing information of any selected objects
    this.object_chosen=undefined;
  }

  // To be implemented (abstract methods)
  set_coronal_depth( depth ){
    if( typeof this._set_coronal_depth === 'function' ){
      this._set_coronal_depth( depth );
    }else{
      console.log('Set coronal depth not implemented');
    }
  }
  set_axial_depth( depth ){
    if( typeof this._set_axial_depth === 'function' ){
      this._set_axial_depth( depth );
    }else{
      console.log('Set axial depth not implemented');
    }
  }
  set_sagittal_depth( depth ){
    if( typeof this._set_sagittal_depth === 'function' ){
      this._set_sagittal_depth( depth );
    }else{
      console.log('Set sagittal depth not implemented');
    }
  }
  set_side_depth( c_d, a_d, s_d ){
    console.log('Set side depth not implemented');
  }
  set_side_visibility( which, visible ){
    console.log('Set side visibility not implemented');
  }
  set_cube_anchor_visibility( visible ){
    if( this.compass ){
      this.compass.set_visibility( visible, () => {
        this.start_animation( 0 );
      });
    }
  }


  // Generic method to add objects
  add_object(g){
    //
    if(this.DEBUG){
      console.debug('Generating geometry '+g.type);
    }
    let gen_f = GEOMETRY_FACTORY[g.type],
        m = gen_f(g, this),
        layers = to_array(g.layer);

    if(typeof(m) !== 'object' || m === null){
      return(null);
    }

    let set_layer = (m) => {
      // Normal 3D object
      m.layers.set( 31 );
      if(layers.length > 1){
        layers.forEach((ii) => {
          m.layers.enable(ii);
          console.debug(g.name + ' is enabled layer ' + ii);
        });
      }else if(layers.length === 0 || layers[0] > 20){
        if(this.DEBUG){
          console.debug(g.name + ' is set invisible.');
        }
        m.layers.set( CONSTANTS.LAYER_USER_ALL_CAMERA_1 );
        m.visible = false;
      }else{
        m.layers.set( layers[0] );
      }
    };

    // make sure subject array exists
    const subject_code = g.subject_code || '';

    if( ! this.subject_codes.includes( subject_code ) ){
      this.subject_codes.push( subject_code );
      this.electrodes[ subject_code ] = {};
      this.volumes[ subject_code ] = {};
      this.surfaces[ subject_code ] = {};
    }


    if( g.type === 'datacube' ){
      // Special, as m is a array of three planes
      this.mesh['_coronal_' + g.name]   = m[0];
      this.mesh['_axial_' + g.name]     = m[1];
      this.mesh['_sagittal_' + g.name]  = m[2];

      if(g.clickable){
        this.clickable['_coronal_' + g.name]   = m[0];
        this.clickable['_axial_' + g.name]     = m[1];
        this.clickable['_sagittal_' + g.name]  = m[2];
      }


      // data cube must have groups
      let gp = this.group[g.group.group_name];
      // Move gp to global scene as its center is always 0,0,0
      this.origin.remove( gp );
      this.scene.add( gp );


      m.forEach((plane) => {

        gp.add( plane );

        set_layer( plane );
        plane.userData.construct_params = g;
        plane.updateMatrixWorld();
      });

      this.volumes[ subject_code ][ g.name ] = m;

      // flaw there, if volume has no subject, then subject_code is '',
      // if two volumes with '' exists, we lose track of the first volume
      // and switch_volume will fail in setting this cube invisible
      // TODO: force subject_code for all volumes or use random string as subject_code
      // or parse subject_code from volume name
      if( !this._has_datacube_registered ){
        this._register_datacube( m );
        this._has_datacube_registered = true;
      }


    }else if( g.type === 'sphere' && g.is_electrode ){
      set_layer( m );
      m.userData.construct_params = g;
      this.mesh[g.name] = m;
      this.electrodes[ subject_code ][g.name] = m;

      // electrodes must be clickable, ignore the default settings
      this.clickable[g.name] = m;
      if(g.group === null){
        this.add_to_scene(m);
      }else{
        let gp = this.group[g.group.group_name];
        gp.add(m);
      }
      m.updateMatrixWorld();

      // For electrode, there needs some calculation
      // g = m.userData.construct_params
      if( g.vertex_number < 0 && g.is_surface_electrode ){
        // surface electrode, need to calculate nearest node
        const snap_surface = g.surface_type,
              search_group = this.group[`Surface - ${snap_surface} (${subject_code})`];

        // Search 141 only
        if( search_group && search_group.userData ){
          const lh_vertices = search_group.userData.group_data[`free_vertices_Standard 141 Left Hemisphere - ${snap_surface} (${subject_code})`];
          const rh_vertices = search_group.userData.group_data[`free_vertices_Standard 141 Right Hemisphere - ${snap_surface} (${subject_code})`];
          const mesh_center = search_group.position;
          if( lh_vertices && rh_vertices ){
            // calculate
            let _tmp = new THREE.Vector3(),
                node_idx = -1,
                min_dist = Infinity,
                side = '',
                _dist = 0;

            lh_vertices.forEach((v, ii) => {
              _dist = _tmp.fromArray( v ).add( mesh_center ).distanceToSquared( m.position );
              if( _dist < min_dist ){
                min_dist = _dist;
                node_idx = ii;
                side = 'left';
              }
            });
            rh_vertices.forEach((v, ii) => {
              _dist = _tmp.fromArray( v ).add( mesh_center ).distanceToSquared( m.position );
              if( _dist < min_dist ){
                min_dist = _dist;
                node_idx = ii;
                side = 'right';
              }
            });

            if( node_idx >= 0 ){
              g.vertex_number = node_idx;
              g.hemisphere = side;
            }
          }
        }

      }



    }else if( g.type === 'free' ){
      set_layer( m );
      m.userData.construct_params = g;
      this.mesh[g.name] = m;
      if(g.clickable){ this.clickable[g.name] = m; }
      // freemesh must have group
      let gp = this.group[g.group.group_name]; gp.add(m);
      m.updateMatrixWorld();

      // Need to registr surface
      // instead of using surface name, use
      this.surfaces[ subject_code ][ g.name ] = m;

    }else{

      set_layer( m );
      m.userData.construct_params = g;
      this.mesh[g.name] = m;

      if(g.clickable){
        this.clickable[g.name] = m;
      }

      if(g.group === null){
        this.add_to_scene(m);
      }else{
        let gp = this.group[g.group.group_name];
        gp.add(m);
      }

      if(m.isMesh){
        m.updateMatrixWorld();
      }
    }
  }

  _register_datacube( m ){

    const g = m[0].userData.construct_params,
          gp = m[0].parent;

    // Register depth functions

    const cube_dimension = this.get_data('datacube_dim_'+g.name, g.name, g.group.group_name),
          // XYZ slice counts

          cube_half_size = this.get_data('datacube_half_size_'+g.name, g.name, g.group.group_name),
          // XYZ pixel heights (* 0.5)

          cube_center = g.position;

    // Add handlers to set plane location when an electrode is clicked
    this.add_mouse_callback(
      (evt) => {
        return({
          pass  : evt.action === 'mousedown' && evt.event.button === 2, // right-click, but only when mouse down (mouse drag won't affect)
          type  : 'clickable'
        });
      },
      ( res, evt ) => {
        const obj = res.target_object;
        if( obj && obj.isMesh && obj.userData.construct_params ){
          const pos = obj.getWorldPosition( gp.position.clone() );
          // calculate depth
          this.set_side_depth(
            (pos.y) * 128 / cube_half_size[1] - 0.5,
            (pos.z) * 128 / cube_half_size[2] - 0.5,
            (pos.x) * 128 / cube_half_size[0] - 0.5
          );

        }
      },
      'side_viewer_depth'
    );


    this._set_coronal_depth = ( depth ) => {
      let idx_mid = cube_dimension[1] / 2;
      if( depth > 128 ){ depth = 128; }else if( depth < -127 ){ depth = -127; }

      m[0].position.y = (depth + 0.5) / 128 * cube_half_size[1];
      // cube_anchor.position.y = m[0].position.y;
      m[0].material.uniforms.depth.value = idx_mid + depth / 128 * idx_mid;
      m[0].material.needsUpdate = true;
      this._coronal_depth = depth;
      // Animate on next refresh
      this.start_animation( 0 );
    };
    this._set_axial_depth = ( depth ) => {
      let idx_mid = cube_dimension[2] / 2;
      if( depth > 128 ){ depth = 128; }else if( depth < -127 ){ depth = -127; }
      m[1].position.z = (depth + 0.5) / 128 * cube_half_size[2];
      // cube_anchor.position.z = m[1].position.z;
      m[1].material.uniforms.depth.value = idx_mid + depth / 128 * idx_mid;
      m[1].material.needsUpdate = true;
      this._axial_depth = depth;
      // Animate on next refresh
      this.start_animation( 0 );
    };
    this._set_sagittal_depth = ( depth ) => {
      let idx_mid = cube_dimension[0] / 2;
      if( depth > 128 ){ depth = 128; }else if( depth < -127 ){ depth = -127; }
      m[2].position.x = (depth + 0.5) / 128 * cube_half_size[0];
      // cube_anchor.position.x = m[2].position.x;
      m[2].material.uniforms.depth.value = idx_mid + depth / 128 * idx_mid;
      m[2].material.needsUpdate = true;
      this._sagittal_depth = depth;
      // Animate on next refresh
      this.start_animation( 0 );
    };

    this.set_side_visibility = ( which, visible ) => {
      const fn = visible ? 'enable' : 'disable';
      if( which === 'coronal' ){
        m[0].layers[fn](8);
      }else if( which === 'axial' ){
        m[1].layers[fn](8);
      }else if( which === 'sagittal' ){
        m[2].layers[fn](8);
      }

      this.start_animation( 0 );
    };

    // reset side camera positions
    this.origin.position.set( -cube_center[0], -cube_center[1], -cube_center[2] );
    this.reset_side_cameras( CONSTANTS.VEC_ORIGIN, Math.max(...cube_half_size) * 2 );

  }

  _loader_finishied(){
    if(this.json_load_finished === undefined){
      this.json_load_finished = true;
      return(true);
    }
    if(this.json_load_queue.length > 0){
      this.json_load_finished = false;
    }
    return(this.json_load_finished);
  }

  load_file(path, onLoad, loader = 'json_loader'){

    loader = this[ loader ];
    if( !loader ){
      loader = this.json_loader;
    }


    if( this.use_cache ){

      // check cache first,
      if( this.cache.check_item( path ) ){
        onLoad( this.cache.get_item( path ) );
      }else{
        this.loader_triggered = true;
        loader.load( path, (v) => {
          if(typeof(v) === 'string'){
            v = JSON.parse(v);
          }
          this.cache.set_item( path, v );
          onLoad( v );
        });
      }
    }else{
      this.loader_triggered = true;
      loader.load( path , (v) => {
        if(typeof(v) === 'string'){
          v = JSON.parse(v);
        }
        onLoad( v );
      });
    }
  }

  // Add geom groups
  add_group(g, cache_folder = 'threebrain_data', onProgress = null){
    var gp = new THREE.Object3D();

    gp.name = 'group_' + g.name;
    to_array(g.layer).forEach( (ii) => { gp.layers.enable( ii ) } );
    gp.position.fromArray( g.position );

    if(g.trans_mat !== null){
      let trans = new THREE.Matrix4();
      trans.set(...g.trans_mat);
      let inverse_trans = new THREE.Matrix4().getInverse( trans );

      gp.userData.trans_mat = trans;
      gp.userData.inv_trans_mat = inverse_trans;

      if(!g.disable_trans_mat){
        gp.applyMatrix(trans);
      }
    }

    gp.userData.construct_params = g;

    // This is now a tricky part, we are going to load from dependencies!
    // This is experimental and might disable standalone widget!

    let cached_items = to_array( g.cached_items ),
        item_size = cached_items.length;
    if(item_size > 0){
      cached_items.forEach((nm) => {
        let cache_info = g.group_data[nm];

        if(cache_info === undefined || cache_info === null || Array.isArray(cache_info)){
          // Already cached
          item_size -= 1;
        }else{

          // Need to check shiny mode
          let path = cache_folder + g.cache_name + '/' + cache_info.file_name;
          /*
          if(!this.shiny_mode){
            path = 'lib/' + cache_folder + '-0/' + g.cache_name + '/' + cache_info.file_name;
          }
          */



          this.load_file(
            path, ( v ) => {

          	  const keys = Object.keys(v);

          	  keys.forEach((k) => {
                g.group_data[k] = v[k];
              });

              item_size -= 1;
          	},
          	onProgress
          );

        }

      });
    }

    gp.userData.group_data = g.group_data;
    this.group[g.name] = gp;

    this.add_to_scene(gp);

    const check = function(){
      return(item_size === 0);
    };

    return(check);

  }

  // Get data from some geometry. Try to get from geom first, then get from group
  get_data(data_name, from_geom, group_hint){
    if(this.mesh.hasOwnProperty(from_geom)){
      let m = this.mesh[from_geom];
      if(m.userData.hasOwnProperty(data_name)){
        return(m.userData[data_name]);
      }else{
        let g = m.userData.construct_params.group;
        if(g !== null){
          let group_name = g.group_name;
          let gp = this.group[group_name];
          if(gp.userData.group_data !== null && gp.userData.group_data.hasOwnProperty(data_name)){
            return(gp.userData.group_data[data_name]);
          }
        }
      }
    }else if(group_hint !== undefined){
      let group_name = group_hint;
      let gp = this.group[group_name];
      if(gp.userData.group_data !== null && gp.userData.group_data.hasOwnProperty(data_name)){
        return(gp.userData.group_data[data_name]);
      }

    }else if(this.DEBUG){
      console.error('Cannot find geom with name ' + from_geom);
    }
    return(undefined);
  }


  // Generate animation clips and mixes
  generate_animation_clips(){
    for(let k in this.mesh){
      let m = this.mesh[k];
      if(m.isMesh && typeof(m.userData.generate_keyframe_tracks) === 'function'){
        let g_name = m.userData.construct_params.name;

        if(m.userData.animation_objects === undefined){
          m.userData.animation_objects = {};
        }

        // Obtain keyframe tracks
        let keyframes = m.userData.generate_keyframe_tracks();

        // Generate animation clip
        // TODO: Edit so that we can find clips (array)
        let clip = m.userData.animation_objects.animation_clip;
        if( clip === undefined ){
          clip = new THREE.AnimationClip(
            'action_' + m.name ,
            this.time_range_max - this.time_range_min,
            keyframes
          );
          m.userData.animation_objects.animation_clip = clip;
        }else{
          clip.tracks = keyframes;
          clip.duration = this.time_range_max - this.time_range_min;
        }

        // setup the AnimationMixer
        let mixer = m.userData.animation_objects.animation_mixer;
				if( mixer === undefined ){
				  mixer = new THREE.AnimationMixer( m );
				  m.userData.animation_objects.animation_mixer = mixer;
				}
				mixer.stopAllAction();
				this.animation_mixers[ g_name ] = mixer;

        // setup animations
        let animation_actions = m.userData.animation_objects.clip_action;
        if(animation_actions === undefined){
  				// bind clip to mixer
  				animation_actions = mixer.clipAction( clip );
				  m.userData.animation_objects.clip_action = animation_actions;
        }
        // TODO: Do we need to check stop clip first?
				animation_actions.play();

      }
    }
  }

  set_time_range( min, max ){
    this.time_range_min = min;
    this.time_range_max = max;
  }





  // -------- Especially designed for brain viewer

  get_surface_types(){
    const group_names = Object.keys( this.group ),
          re = [];
    group_names.forEach((g) => {
      let res = new RegExp('^Surface - ([a-z]+) \\((.*)\\)$').exec(g);
      if( res && res.length === 3 ){
        re.push( res[1] );
      }
    });

    return( re );
  }

  get_volume_types(){
    const group_names = Object.keys( this.group ),
          re = [];

    this.subject_codes.forEach((s) => {
      let volume_names = Object.keys( this.volumes[ s ] ),
          //  brain.finalsurfs (YAB)
          res = new RegExp('^(.*) \\(' + s + '\\)$').exec(g);

      if( res && res.length === 2 ){
        re.push( res[1] );
      }
    });
    return( re );
  }

  switch_subject( target_subject = '/', args = {}){

    if( this.subject_codes.length === 0 ){
      return( null );
    }

    const state = this.state_data;

    if( !this.subject_codes.includes( target_subject ) ){
      target_subject = state.target_subject || this.subject_codes[0];
    }
    state.target_subject = target_subject;

    state.surface_type = args.surface_type || state.surface_type || 'pial';
    state.material_type_left = args.material_type_left || state.material_type_left || 'normal';
    state.material_type_right = args.material_type_right || state.material_type_right || 'normal';
    state.volume_type = args.volume_type || state.volume_type || 'brain.finalsurfs';

    if( args.map_template !== undefined ){
      state.map_template = args.map_template;
    }else{
      state.map_template = state.map_template || false;
    }
    state.map_type_surface = args.map_type_surface || state.map_type_surface || 'std.141';
    state.map_type_volume = args.map_type_volume || state.map_type_volume || 'mni305';

    this.switch_volume( target_subject, state.volume_type );
    this.switch_surface( target_subject, state.surface_type, [state.material_type_left, state.material_type_right] );

    if( state.map_template ){
      this.map_electrodes( target_subject, state.map_type_surface, state.map_type_volume );
    }else{
      this.map_electrodes( target_subject, 'reset', 'reset' );
    }

    this.start_animation( 0 );

  }

  switch_surface( target_subject, surface_type = 'pial', material_type = ['normal', 'normal'] ){
    // this.surfaces[ subject_code ][ g.name ] = m;
    // Naming - Surface         Standard 141 Right Hemisphere - pial (YAB)
    // or FreeSurfer Right Hemisphere - pial (YAB)
    for( let subject_code in this.surfaces ){
      for( let surface_name in this.surfaces[ subject_code ] ){
        const m = this.surfaces[ subject_code ][ surface_name ];
        m.visible = false;
        if( subject_code === target_subject ){

          if(
            surface_name === `Standard 141 Left Hemisphere - ${surface_type} (${target_subject})` ||
            surface_name === `FreeSurfer Left Hemisphere - ${surface_type} (${target_subject})`
          ){
            if( material_type[0] === 'hidden' ){
              m.visible = false;
            }else{
              m.material.wireframe = ( material_type[0] === 'wireframe' );
              m.visible = true;
            }
          }else if(
            surface_name === `Standard 141 Right Hemisphere - ${surface_type} (${target_subject})` ||
            surface_name === `FreeSurfer Right Hemisphere - ${surface_type} (${target_subject})`
          ){
            if( material_type[1] === 'hidden' ){
              m.visible = false;
            }else{
              m.material.wireframe = ( material_type[1] === 'wireframe' );
              m.visible = true;
            }
          }

        }
      }
    }
    this.start_animation( 0 );
  }

  switch_volume( target_subject, volume_type = 'brain.finalsurfs' ){
    for( let subject_code in this.volumes ){
      for( let volume_name in this.volumes[ subject_code ] ){
        const m = this.volumes[ subject_code ][ volume_name ];
        if( subject_code === target_subject && volume_name === `${volume_type} (${subject_code})`){
          m[0].parent.visible = true;
          this._register_datacube( m );
        }else{
          m[0].parent.visible = false;
        }
      }
    }
    this.start_animation( 0 );
  }
  // Map electrodes
  map_electrodes( target_subject, surface = 'std.141', volume = 'mni305' ){

    const pos_targ = new THREE.Vector3(),
          pos_orig = new THREE.Vector3(),
          mat1 = new THREE.Matrix4(),
          mat2 = new THREE.Matrix4();

    for( let origin_subject in this.electrodes ){
      for( let el_name in this.electrodes[ origin_subject ] ){
        const el = this.electrodes[ origin_subject][ el_name ],
              g = el.userData.construct_params,
              is_surf = g.is_surface_electrode,
              vert_num = g.vertex_number,
              surf_type = g.surface_type,
              mni305 = g.MNI305_position,
              origin_position = g.position,
              target_group = this.group[`Surface - ${surf_type} (${target_subject})`],
              origin_volume = this.group[`Volume (${origin_subject})`],
              target_volume = this.group[`Volume (${target_subject})`];

        pos_orig.fromArray( origin_position );

        let mapped = false,
            side = (typeof g.hemisphere === 'string' && g.hemisphere.length > 0) ? (g.hemisphere.charAt(0).toUpperCase() + g.hemisphere.slice(1)) : '';

        if( surface === 'std.141' && is_surf && vert_num >= 0 &&
            target_group && target_group.isObject3D && target_group.children.length === 2 ){
          // User choose std.141, electrode is surface electrode, and
          // vert_num >= 0, meaning original surface is loaded, and target_surface exists
          // meaning template surface is loaded
          //
          // check if target surface is std 141
          let target_surface = target_group.children.filter((_t) => {
            return( _t.name === `mesh_free_Standard 141 ${side} Hemisphere - ${surf_type} (${target_subject})`);
          });

          if( target_surface.length === 1 ){
            // Find vert_num at target_surface[0]
            const vertices = target_surface[0].geometry.getAttribute('position');
            const shift = target_surface[0].getWorldPosition( el.parent.position.clone() );
            pos_targ.set( vertices.getX( vert_num ), vertices.getY( vert_num ), vertices.getZ( vert_num ) ).add(shift);
            el.position.copy( pos_targ );
            el.userData._template_mapped = true;
            el.userData._template_space = 'std.141';
            el.userData._template_shift = pos_targ.distanceTo( pos_orig );
            mapped = true;
          }

        }

        if( !mapped && volume === 'mni305' && origin_volume && target_volume ){
          // apply MNI 305 transformation
          const v2v_orig = origin_volume.userData.group_data.vox2vox_MNI305;
          const v2v_targ = target_volume.userData.group_data.vox2vox_MNI305;

          mat1.set( v2v_orig[0][0], v2v_orig[0][1], v2v_orig[0][2], v2v_orig[0][3],
                    v2v_orig[1][0], v2v_orig[1][1], v2v_orig[1][2], v2v_orig[1][3],
                    v2v_orig[2][0], v2v_orig[2][1], v2v_orig[2][2], v2v_orig[2][3],
                    v2v_orig[3][0], v2v_orig[3][1], v2v_orig[3][2], v2v_orig[3][3] );

          mat2.set( v2v_targ[0][0], v2v_targ[0][1], v2v_targ[0][2], v2v_targ[0][3],
                    v2v_targ[1][0], v2v_targ[1][1], v2v_targ[1][2], v2v_targ[1][3],
                    v2v_targ[2][0], v2v_targ[2][1], v2v_targ[2][2], v2v_targ[2][3],
                    v2v_targ[3][0], v2v_targ[3][1], v2v_targ[3][2], v2v_targ[3][3] );

          // target position = inv(mat2) * mat1 * origin_position
          mat2.getInverse( mat2 );
          mat2.multiplyMatrices( mat2, mat1 );
          pos_targ.fromArray( origin_position ).applyMatrix4(mat2);

          el.position.copy( pos_targ );
          el.userData._template_mapped = true;
          el.userData._template_space = 'mni305';
          el.userData._template_shift = pos_targ.distanceTo( pos_orig );
          mapped = true;
        }


        // Reset electrode
        if( !mapped ){
          el.position.fromArray( origin_position );
          el.userData._template_mapped = false;
          el.userData._template_space = 'original';
          el.userData._template_shift = 0;
        }
      }
    }
    this.start_animation( 0 );
  }
}



export { THREEBRAIN_CANVAS };
// window.THREEBRAIN_CANVAS = THREEBRAIN_CANVAS;
