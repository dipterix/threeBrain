import { to_array, get_element_size, get_or_default } from './utils.js';
import { Stats } from './libs/stats.min.js';
import { THREE } from './threeplugins.js';
import { THREEBRAIN_STORAGE } from './threebrain_cache.js';
import { make_draggable } from './libs/draggable.js';
import { make_resizable } from './libs/resizable.js';
import { CONSTANTS } from './constants.js';
import { generate_animation_default } from './Math/animations.js';
import { gen_sphere } from './geometry/sphere.js';
import { gen_datacube } from './geometry/datacube.js';
import { gen_datacube2 } from './geometry/datacube2.js';
import { gen_free } from './geometry/free.js';
import { Compass } from './geometry/compass.js';
import { json2csv } from 'json-2-csv';
import * as download from 'downloadjs';


/* Geometry generator */
const GEOMETRY_FACTORY = {
  'sphere'    : gen_sphere,
  'free'      : gen_free,
  'datacube'  : gen_datacube,
  'datacube2' : gen_datacube2,
  'blank'     : (g, canvas) => { return(null) }
};

window.threeBrain_GEOMETRY_FACTORY = GEOMETRY_FACTORY;
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
    this.container_id = this.el.getAttribute( 'data-target' );

    // Is system supporting WebGL2? some customized shaders might need this feature
    // As of 08-2019, only chrome, firefox, and opera support full implementation of WebGL.
    this.has_webgl2 = has_webgl2;

    // Side panel initial size in pt
    this.side_width = side_width;
    this._side_width = side_width;

    // Indicator of whether we are in R-shiny environment, might change the name in the future if python, matlab are supported
    this.shiny_mode = shiny_mode;

    // Container that stores mesh objects from inputs (user defined) for each inquery
    this.mesh = new Map();
    this.threebrain_instances = new Map();

    // Stores all electrodes
    this.subject_codes = [];
    this.electrodes = new Map();
    this.volumes = new Map();
    this.ct_scan = new Map();
    this._show_ct = false;
    this.surfaces = new Map();
    this.state_data = new Map();

    // action event listener functions and dispose flags
    this._disposed = false;
    this._dispose_functions = new Map();
    // set default values
    this.state_data.set( 'coronal_depth', 0 );
    this.state_data.set( 'axial_depth', 0 );
    this.state_data.set( 'sagittal_depth', 0 );

    // for global usage
    this.shared_data = new Map();

    // Stores all groups
    this.group = new Map();

    // All mesh/geoms in this store will be calculated when raycasting
    this.clickable = new Map();

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
    this.animation_clips = new Map();
    this.color_maps = new Map();
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
        Main camera is initialized at 500,0,0. The distance is stayed at 500 away from
        origin (stay at right &look at left)
        The view range is set from -150 to 150 (left - right) respect container ratio
        render distance is from 1 to 10000, sufficient for brain object.
        Parameters:
          position: 500,0,0
          left: -150, right: 150, near 1, far: 10000
          layers: 0, 1, 2, 3, 7, 8
          center/lookat: origin (0,0,0)
          up: 0,1,0 ( heads up )
    */
    this.main_camera = new THREE.OrthographicCamera( -150, 150, height / width * 150, -height / width * 150, 1, 10000 );
		this.main_camera.position.x = 500;
		this.main_camera.userData.pos = [500,0,0];
		this.main_camera.up.set(0,0,1);
		this.main_camera.layers.set( CONSTANTS.LAYER_USER_MAIN_CAMERA_0 );
		this.main_camera.layers.enable( CONSTANTS.LAYER_USER_ALL_CAMERA_1 );
		this.main_camera.layers.enable( 2 );
		this.main_camera.layers.enable( 3 );
		this.main_camera.layers.enable( CONSTANTS.LAYER_SYS_ALL_CAMERAS_7 );
		this.main_camera.layers.enable( CONSTANTS.LAYER_SYS_MAIN_CAMERA_8 );
		this.main_camera.lookAt( CONSTANTS.VEC_ORIGIN ); // Force camera

		// Main camera light, casting from behind the main_camera, only light up objects in CONSTANTS.LAYER_SYS_MAIN_CAMERA_8
		// Maybe we should get rid of directional light as it will cause reflactions?
    const main_light = new THREE.DirectionalLight( CONSTANTS.COLOR_MAIN_LIGHT , 0.5 );
    main_light.position.copy( CONSTANTS.VEC_ANAT_I );
    main_light.layers.set( CONSTANTS.LAYER_SYS_MAIN_CAMERA_8 );
    main_light.name = 'main light - directional';
    this.main_camera.add( main_light );

    // Add main camera to scene
    this.add_to_scene( this.main_camera, true );

    // Add ambient light to make scene soft
    const ambient_light = new THREE.AmbientLight( CONSTANTS.COLOR_AMBIENT_LIGHT, 1.0 );
    ambient_light.layers.set( CONSTANTS.LAYER_SYS_ALL_CAMERAS_7 );
    ambient_light.name = 'main light - ambient';
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
    	  canvas: side_canvas_el, context: side_context,
    	  depths: false
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
      div.style.display = 'none';
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
			  const depths = [
          this.state_data.get( 'sagittal_depth' ),
          this.state_data.get( 'coronal_depth' ),
          this.state_data.get( 'axial_depth' )
        ];
			  //  this._sagittal_depth || 0, this._coronal_depth || 0, this._axial_depth || 0];

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

			this.bind( `${nm}_zoomin_click`, 'click', (e) => {
			  zoom_level = zoom_level * 1.2;
			  zoom_level = zoom_level > 10 ? 10 : zoom_level;
			  set_zoom_level();
			}, zoom_in);

			const zoom_out = document.createElement('div');
			zoom_out.className = 'zoom-tool';
			zoom_out.style.top = '50px';
			zoom_out.innerText = '-';
			div.appendChild( zoom_out );
			this.bind( `${nm}_zoomout_click`, 'click', (e) => {
			  zoom_level = zoom_level / 1.2;
			  zoom_level = zoom_level < 1.1 ? 1 : zoom_level;
			  set_zoom_level();
			}, zoom_out);

			const toggle_pan = document.createElement('div');
			toggle_pan.className = 'zoom-tool';
			toggle_pan.style.top = '77px';
			toggle_pan.innerText = 'P';
			div.appendChild( toggle_pan );
			this.bind( `${nm}_toggle_pan_click`, 'click', (e) => {
			  toggle_pan.classList.toggle('pan-active');
			  toggle_pan_canvas( toggle_pan.classList.contains('pan-active') ? 'pan' : 'select' );
			}, toggle_pan);

			const zoom_reset = document.createElement('div');
			zoom_reset.className = 'zoom-tool';
			zoom_reset.style.top = '104px';
			zoom_reset.innerText = '0';
			div.appendChild( zoom_reset );
			this.bind( `${nm}_zoom_reset_click`, 'click', (e) => {
			  cvs.style.top = '0';
        cvs.style.left = '0';
			  set_zoom_level( 1 );
			}, zoom_reset);


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
            this.state_data.set( 'sagittal_depth', _x );
            this.state_data.set( 'axial_depth', -_y );
            // this._sagittal_depth = _x;
            // this._axial_depth = -_y;
          }else if( nm === 'axial' ){
            this.state_data.set( 'sagittal_depth', _x );
            this.state_data.set( 'coronal_depth', -_y );
            // this._sagittal_depth = _x;
            // this._coronal_depth = -_y;
          }else if( nm === 'sagittal' ){
            this.state_data.set( 'coronal_depth', -_x );
            this.state_data.set( 'axial_depth', -_y );
            // this._coronal_depth = -_x;
            // this._axial_depth = -_y;
          }
          // Also set main_camera
          const _d = new THREE.Vector3(
            // this._sagittal_depth || 0,
            this.state_data.get( 'sagittal_depth' ),

            // this._coronal_depth || 0,
            this.state_data.get( 'coronal_depth' ),

            // this._axial_depth || 0
            this.state_data.get( 'axial_depth' )
          ).normalize().multiplyScalar(500);
          if( _d.length() === 0 ){
            _d.x = 500;
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

          this.set_side_depth(
            this.state_data.get( 'coronal_depth' ),
            this.state_data.get( 'axial_depth' ),
            this.state_data.get( 'sagittal_depth' )
          );

        }
      } );
      toggle_pan_canvas( 'select' );

      // Make cvs scrollable, but change slices
      this.bind( `${nm}_cvs_mousewheel`, 'mousewheel', (evt) => {
        evt.preventDefault();
        if( evt.altKey ){
          if( evt.deltaY > 0 ){
            this.state_data.set( nm + '_depth', 1 + this.state_data.get(nm + '_depth') );
            // this[ '_' + nm + '_depth' ] = (this[ '_' + nm + '_depth' ] || 0) + 1;
          }else if( evt.deltaY < 0 ){
            this.state_data.set( nm + '_depth', -1 + this.state_data.get(nm + '_depth') );
            // this[ '_' + nm + '_depth' ] = (this[ '_' + nm + '_depth' ] || 0) - 1;
          }
        }
        // this.set_side_depth( this._coronal_depth, this._axial_depth, this._sagittal_depth );
        this.set_side_depth(
          this.state_data.get( 'coronal_depth' ),
          this.state_data.get( 'axial_depth' ),
          this.state_data.get( 'sagittal_depth' )
        );
      }, cvs);

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
      this.bind( `${nm}_div_header_dblclick`, 'dblclick', (evt) => {
        reset();
        // Resize side canvas
        // this.handle_resize( undefined, undefined );
      }, div_header);


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
    this.bind( 'controls_start', 'start', (v) => {

      if(this.render_flag < 0 ){
        // adjust controls
        this.handle_resize(undefined, undefined, true);
      }

      // normal controls, can be interrupted
      this.start_animation(1);
    }, this.controls );

    this.bind( 'controls_end', 'end', (v) => {
      // normal pause, can be overridden
      this.pause_animation(1);
    }, this.controls );

    // Follower that fixed at bottom-left
    this.compass = new Compass( this.main_camera, this.controls );
    // Hide the anchor first
    this.compass.set_visibility( false );
    this.add_to_scene(this.compass.container, true);



    // Mouse helpers
    const mouse_pointer = new THREE.Vector2(),
        mouse_raycaster = new THREE.Raycaster(),
        mouse_helper = new THREE.ArrowHelper(new THREE.Vector3( 0, 0, 1 ), new THREE.Vector3( 0, 0, 0 ), 50, 0xff0000, 2 ),
        mouse_helper_root = new THREE.Mesh(
          new THREE.BoxBufferGeometry( 4,4,4 ),
          new THREE.MeshBasicMaterial({ color : 0xff0000 })
        );

    // root is a green cube that's only visible in side cameras
    mouse_helper_root.layers.set( CONSTANTS.LAYER_SYS_ALL_SIDE_CAMERAS_13 );
    mouse_helper.children.forEach( el => { el.layers.set( CONSTANTS.LAYER_SYS_ALL_SIDE_CAMERAS_13 ); } );

    // In side cameras, always render mouse_helper_root on top
    mouse_helper_root.renderOrder = CONSTANTS.MAX_RENDER_ORDER;
    mouse_helper_root.material.depthTest = false;
    // mouse_helper_root.onBeforeRender = function( renderer ) { renderer.clearDepth(); };

    mouse_helper.add( mouse_helper_root );
    this.mouse_helper = mouse_helper;
    this.mouse_raycaster = mouse_raycaster;
    this.mouse_pointer = mouse_pointer;

    this.add_to_scene(mouse_helper, true);

    this.focus_box = new THREE.BoxHelper();
    this.focus_box.material.color.setRGB( 1, 0, 0 );
    this.focus_box.userData.added = false;
    this.bounding_box = this.focus_box.clone();

    this.set_font_size();

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

  dispatch_event( type, data ){
    let event = new CustomEvent(type, {
      container_id: this.container_id,
      detail: data
    });
    // elem.addEventListener('build', function (e) { /* ... */ }, false);

    // Dispatch the event.
    this.el.dispatchEvent(event);
  }

  add_to_scene( m, global = false ){
    if( global ){
      this.scene.add( m );
    }else{
      this.origin.add( m );
    }
  }

  set_font_size( magnification = 1 ){
    // font size
    this._lineHeight_normal = Math.round( 24 * this.pixel_ratio[0] * magnification );
    this._lineHeight_small = Math.round( 20 * this.pixel_ratio[0] * magnification );
    this._fontSize_normal = Math.round( 20 * this.pixel_ratio[0] * magnification );
    this._fontSize_small = Math.round( 16 * this.pixel_ratio[0] * magnification );
    this._lineHeight_legend = Math.round( 20 * this.pixel_ratio[0] * magnification );
    this._fontSize_legend = Math.round( 16 * this.pixel_ratio[0] * magnification );
  }

  bind( name, evtstr, fun, target, options = false ){
    const _target = target || this.main_canvas;

    const _f = this._dispose_functions.get( name );
    if( typeof _f === 'function' ){
      _f();
    }
    this._dispose_functions.set( name, () => {
      console.debug('Calling dispose function ' + name);
      try {
        _target.removeEventListener( evtstr , fun );
      } catch (e) {
        console.warn('Unable to dispose ' + name);
      }
    });

    console.debug(`Registering event ${evtstr} (${name})`);
    _target.addEventListener( evtstr , fun, options );
  }

  dispose_eventlisters(){
    this._dispose_functions.forEach( (_f) => {
      _f();
    });
    this._dispose_functions.clear();
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

    // this.el.addEventListener( 'mouseenter', (e) => { this.listen_keyboard = true });
    // this.el.addEventListener( 'mouseleave', (e) => { this.listen_keyboard = false });
    this.bind( 'main_canvas_mouseenter', 'mouseenter', (e) => {
			  this.listen_keyboard = true;
			}, this.main_canvas);
		this.bind( 'main_canvas_mouseleave', 'mouseleave', (e) => {
			  this.listen_keyboard = false;
			}, this.main_canvas);

		this.bind( 'main_canvas_dblclick', 'dblclick', (event) => { // Use => to create flexible access to this
      if(this.mouse_event !== undefined && this.mouse_event.level > 2){
        return(null);
      }
      this.mouse_event = {
        'action' : 'dblclick',
        'event' : event,
        'dispose' : false,
        'level' : 2
      };

    }, this.main_canvas, false );

    this.bind( 'main_canvas_click', 'click', (event) => {
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

    }, this.main_canvas, false );

    this.bind( 'main_canvas_contextmenu', 'contextmenu', (event) => {
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

    }, this.main_canvas, false );

    this.bind( 'main_canvas_mousemove', 'mousemove', (event) => {
      if(this.mouse_event !== undefined && this.mouse_event.level > 0){
        return(null);
      }
      this.mouse_event = {
        'action' : 'mousemove',
        'event' : event,
        'dispose' : false,
        'level' : 0
      };

    }, this.main_canvas, false );

    this.bind( 'main_canvas_mousedown', 'mousedown', (event) => {
      this.mouse_event = {
        'action' : 'mousedown',
        'event' : event,
        'dispose' : false,
        'level' : 3
      };

    }, this.main_canvas, false );

    this.bind( 'main_canvas_mouseup', 'mouseup', (event) => {
      this.mouse_event = {
        'action' : 'mouseup',
        'event' : event,
        'dispose' : true,
        'level' : 0
      };

    }, this.main_canvas, false );

    this.bind( 'main_canvas_keydown', 'keydown', (event) => {
      if (event.isComposing || event.keyCode === 229) { return; }
      if( this.listen_keyboard ){
        // event.preventDefault();
        this.keyboard_event = {
          'action' : 'keydown',
          'event' : event,
          'dispose' : false,
          'level' : 0
        };
      }

    }, document );


    this.add_mouse_callback(
      (evt) => {

        // If editing mode enabled, disable this
        return({
          pass  : !this.edit_mode && (['click', 'dblclick'].includes( evt.action ) ||
                  ( evt.action === 'mousedown' && evt.event.button === 2 )),
          type  : 'clickable'
        });
      },
      (res, evt) => {
        this.focus_object( res.target_object );
        try {
          document.activeElement.blur();
        } catch (e) {}
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

    this.add_keyboard_callabck( CONSTANTS.KEY_CYCLE_ELECTRODES_NEXT, (evt) => {
      let m = this.object_chosen || this._last_object_chosen,
          last_obj = false,
          this_obj = false,
          first_obj = false;

      // place flag first as the function might ends early
      this.start_animation( 0 );

      for( let _nm of this.mesh.keys() ){
        this_obj = this.mesh.get( _nm );
        if( this_obj.isMesh && this_obj.userData.construct_params.is_electrode ){
          if( !m ){
            this.focus_object( this_obj, true );
            return(null);
          }
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
        this.focus_object( last_obj, true );
        return(null);
      }

    }, 'electrode_cycling_next');

    this.add_keyboard_callabck( CONSTANTS.KEY_CYCLE_ELECTRODES_PREV, (evt) => {
      let m = this.object_chosen || this._last_object_chosen,
          last_obj = false,
          this_obj = false,
          first_obj = false;

      // place flag first as the function might ends early
      this.start_animation( 0 );

      for( let _nm of this.mesh.keys() ){
        this_obj = this.mesh.get( _nm );
        if( this_obj.isMesh && this_obj.userData.construct_params.is_electrode ){
          if( m && last_obj && m.name == this_obj.name ){
            this.focus_object( last_obj, true );
            return(null);
          }
          last_obj = this_obj;
        }
      }
      if( last_obj ){
        this.focus_object( last_obj, true );
      }
    }, 'electrode_cycling_prev');


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

  focus_object( m = undefined, helper = false, auto_unfocus = false ){

    if( m ){
      if( this.object_chosen ){
        this.highlight( this.object_chosen, true );
      }
      this.object_chosen = m;
      this._last_object_chosen = m;
      this.highlight( this.object_chosen, false );
      console.debug('object selected ' + m.name);

      if( helper ){
        m.getWorldPosition( this.mouse_helper.position );
        this.mouse_helper.visible = true;
      }


    }else{
      if( auto_unfocus && this.object_chosen ){
        this.highlight( this.object_chosen, true );
        this.object_chosen = undefined;
      }
    }
  }

  highlight( m, reset = false ){

    const highlight_disabled = get_or_default( this.state_data, 'highlight_disabled', false );

    // use bounding box with this.focus_box
    if( !m || !m.isObject3D ){ return(null); }

    this.focus_box.setFromObject( m );
    if( !this.focus_box.userData.added ){
      this.focus_box.userData.added = true;
      this.add_to_scene( this.focus_box, true );
    }

    this.focus_box.visible = !reset && !highlight_disabled;

    // check if there is highlight helper
    if( m.children.length > 0 ){
      m.children.forEach((_c) => {
        if( _c.isMesh && _c.userData.is_highlight_helper ){
          _c.visible = !reset;
        }
      });
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

  _fast_raycast( request_type ){

    let items;

    this.mouse_raycaster.setFromCamera( this.mouse_pointer, this.main_camera );

    if( request_type === undefined || request_type === true || request_type === 'clickable' ){
      // intersect with all clickables
      items = this.mouse_raycaster.intersectObjects( to_array( this.clickable ) );
    }else if( request_type.isObject3D || Array.isArray( request_type ) ){
      items = this.mouse_raycaster.intersectObjects( to_array( request_type ), true );
    }

    /*

    if(clickable_only === true){
      let raycaster = this.mouse_raycaster;
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

      this.mesh.forEach( (m, mesh_name) => {
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
      });

      console.log(target_object.name);

      if(target_object !== undefined){
        console.log(target_object.name);
        items = this.mouse_raycaster.intersectObject( target_object, false );
      }


    }
    */

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
          this.keyboard_event.event.code === this._keyboard_callbacks[ _cb_name ][0] ){
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
    let raycast_result, request_type, callback, request;

    for( let _cb_name in this._mouse_click_callbacks ){
      callback = this._mouse_click_callbacks[ _cb_name ];
      if( callback === undefined ){
        continue;
      }
      request = callback[0]( this.mouse_event );
      if( request && request.pass ){
        // raycast object
        // check which object(s) to raycast on
        request_type = request.type || 'clickable';

        if( raycast_result === undefined ||
            (raycast_result !== raycast_result.type && request_type !== 'clickable') ){
          raycast_result = {
            type  : request_type,
            items : this._fast_raycast( request_type ),
            meta  : request.meta
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

  add_colormap( name, alias, value_type, value_names, value_range, time_range,
                color_keys, color_vals, n_levels, hard_range ){

    const color_name = name + '--'  + this.container_id;

    // Step 1: register to THREE.ColorMapKeywords
    if(THREE.ColorMapKeywords[color_name] === undefined){
      THREE.ColorMapKeywords[color_name] = [];
    }else{
      THREE.ColorMapKeywords[color_name].length = 0;
    }

    // n_color is number of colors in Lut, not the true levels of colors
    const n_color = Math.max( 2 , to_array( color_keys ).length );

    // Step 2:
    for( let ii=0; ii < n_color; ii++ ){
      THREE.ColorMapKeywords[color_name].push([ ii / (n_color-1) , color_vals[ii] ]);
    }
    const lut = new THREE.Lut( color_name , n_color );

    // min and max cannot be the same, otherwise colors will not be rendered
    if( value_type === 'continuous' ){
      lut.setMin( value_range[0] );
      if( value_range[1] === value_range[0] ){
        lut.setMax( value_range[0] + 1 );
      }else{
        lut.setMax( value_range[1] );
      }
    }else{
      lut.setMin( 0 );
      lut.setMax( Math.max( n_levels - 1, 1) );
    }

    // step 3: register hard range
    let theoretical_range;
    if( Array.isArray(hard_range) && hard_range.length == 2 ){
      theoretical_range = [hard_range[0], hard_range[1]];
    }

    // step 4: set alias
    let alt_name = alias;
    if( typeof alt_name !== 'string' || alt_name === '' ){
      alt_name = name;
    }

    this.color_maps.set( name, {
      lut               : lut,
      name              : name,
      alias             : alt_name,
      value_type        : value_type,
      value_names       : to_array( value_names ),
      time_range        : time_range,
      n_levels          : n_levels,
      // Used for back-up
      value_range       : [ lut.minV, lut.maxV ],
      theoretical_range : theoretical_range
    });

  }

  switch_colormap( name, value_range = [] ){
    let cmap;
    if( name ){
      this.state_data.set( 'color_map', name );

      cmap = this.color_maps.get( name );

      if( cmap ){
        this.state_data.set( 'time_range_min', cmap.time_range[0] );
        this.state_data.set( 'time_range_max', cmap.time_range[1] );
      }else{
        this.state_data.set( 'time_range_min', 0 );
        this.state_data.set( 'time_range_max', 1 );
      }
      // return(cmap);

    }else{
      name = get_or_default( this.state_data, 'color_map', '' );
      cmap = this.color_maps.get( name );
      // return( this.color_maps.get( name ) );
    }
    if( cmap && value_range.length === 2 && value_range[0] < value_range[1] &&
        // Must be continuous color map
        cmap.value_type === 'continuous' ){
      // Check hard ranges
      const hard_range = cmap.theoretical_range;
      let minv = value_range[0],
          maxv = value_range[1];
      if( Array.isArray(hard_range) && hard_range.length == 2 ){
        if( minv < hard_range[0] ){
          minv = hard_range[0];
          if( maxv < minv ){
            maxv = minv + 1e-100;
          }
        }
        if( maxv > hard_range[1] ){
          maxv = hard_range[1];
          if( maxv < minv ){
            minv = maxv - 1e-100;
          }
        }
      }

      // set cmap value_range
      cmap.lut.setMax( maxv );
      cmap.lut.setMin( minv );
      // Legend needs to be updated
      this.start_animation( 0 );
    }
    return( cmap );
  }

  get_color(v, name){
    let cmap;
    if( name ){
      cmap = this.color_maps.get( name );
    }else{
      cmap = this.color_maps.get( get_or_default( this.state_data, 'color_map', '' ) );
    }

    if(cmap === undefined){
      return('#e2e2e2');
    }else{
      return(cmap.lut.getColor(v));
    }
  }


  handle_resize(width, height, lazy = false, center_camera = false){

    if( this._disposed ) { return; }
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
  reset_side_canvas( zoom_level, side_width, side_position ){
    let _sw = side_width;
    if( !_sw ){
      _sw = this._side_width;
    }
    if( _sw * 3 > this.client_height ){
      _sw = Math.floor( this.client_height / 3 );
    }
    this.side_width = _sw;
    // Resize side canvas, make sure this.side_width is proper
    this.side_canvas.coronal.reset( zoom_level );
    this.side_canvas.axial.reset( zoom_level );
    this.side_canvas.sagittal.reset( zoom_level );

    side_position = to_array( side_position );
    if( side_position.length == 2 ){
      const el_pos = this.el.getBoundingClientRect();
      side_position[0] = Math.max( side_position[0], -el_pos.x );
      side_position[1] = Math.max( side_position[1], -el_pos.y );

      this.side_canvas.coronal.container.style.top = side_position[1] + 'px';
      this.side_canvas.axial.container.style.top = (side_position[1] + _sw) + 'px';
      this.side_canvas.sagittal.container.style.top = (side_position[1] + _sw * 2) + 'px';

      this.side_canvas.coronal.container.style.left = side_position[0] + 'px';
      this.side_canvas.axial.container.style.left = side_position[0] + 'px';
      this.side_canvas.sagittal.container.style.left = side_position[0] + 'px';
    }

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

    if( pos[2] === 0 ){
      this.main_camera.up.set(0, 0, 1);
    }else{
      this.main_camera.up.set(0, 1, 0);
    }


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

  render( results ){

    if( !results ){
      results = {
        current_time        : 0,
        current_time_delta  : 0
      };
    }


    // double-buffer to make sure depth renderings
    //this.main_renderer.setClearColor( renderer_colors[0] );
    this.main_renderer.clear();

    // Pre render all meshes
    this.mesh.forEach((m) => {
      if( typeof m.userData.pre_render === 'function' ){
        m.userData.pre_render( results );
        /*
        try {
          m.userData.pre_render();
        } catch (e) {}
        */
      }
    });

    this.main_renderer.render( this.scene, this.main_camera );

    if(this.has_side_cameras){

      // Disable side plane
      this.side_plane_sendback( true );

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

      this.side_plane_sendback( false );
    }

  }

  inc_time(){
    // this.animation_controls = {};
    // this.clock = new THREE.Clock();
    let results = {
      current_time_delta  : 0
    };

    const time_range_min = get_or_default( this.state_data, 'time_range_min', 0 );
    results.time_range_min = time_range_min;

    // show mesh value info
    if(this.object_chosen !== undefined &&
        this.object_chosen.userData ){

        results.selected_object = {
          name            : this.object_chosen.userData.construct_params.name,
          position        : this.object_chosen.getWorldPosition( new THREE.Vector3() ),
          custom_info     : this.object_chosen.userData.construct_params.custom_info,
          is_electrode    : this.object_chosen.userData.construct_params.is_electrode || false,
          MNI305_position : this.object_chosen.userData.MNI305_position,
          template_mapping : {
            mapped        : this.object_chosen.userData._template_mapped || false,
            shift         : this.object_chosen.userData._template_shift || 0,
            space         : this.object_chosen.userData._template_space || 'original',
            surface       : this.object_chosen.userData._template_surface || 'NA',
            hemisphere    : this.object_chosen.userData._template_hemisphere || 'NA',
            mni305        : this.object_chosen.userData._template_mni305
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
      results.current_time_delta = current_time - time_range_min;
      /*
      this.animation_mixers.forEach( (mixer) => {
        mixer.update( current_time - time_range_min - mixer.time );
      });
      */

      // set timer
      this.animation_controls.set_time( current_time );

    }


    return(results);

  }

  start_animation( persist = 0 ){
    // persist 0, render once
    // persist > 0, loop

    const _flag = this.render_flag;
    if(persist >= _flag){
      this.render_flag = persist;
    }
    if( persist >= 2 && _flag < 2 ){
      // _flag < 2 means prior state only renders the scene, but animation is paused
      // if _flag >= 2, then clock was running, then there is no need to start clock
      // persist >= 2 is a flag for animation to run
      // animation clips need a clock
      this.clock.start();
    }
  }

  pause_animation( level = 1 ){
    const _flag = this.render_flag;
    if(_flag <= level){
      this.render_flag = -1;

      // When animation is stopped, we need to check if clock is running, if so, stop it
      if( _flag >= 2 ){
        this.clock.stop();
      }
    }
  }



  _draw_title( results, x = 10, y = 10, w = 100, h = 100 ){

    this._fontType = 'Courier New, monospace';
    this._lineHeight_title = this._lineHeight_title || Math.round( 25 * this.pixel_ratio[0] );
    this._fontSize_title = this._fontSize_title || Math.round( 20 * this.pixel_ratio[0] );


    this.domContext.fillStyle = this.foreground_color;
    this.domContext.font = `${ this._fontSize_title }px ${ this._fontType }`;

    // Add title
    let ii = 0, ss = [];
    ( this.title || results.title || '' )
      .split('\\n')
      .forEach( (ss, ii) => {
        this.domContext.fillText( ss , x, y + this._lineHeight_title * (ii + 1) );
      });
  }

  _draw_ani( results, x = 10, y = 10, w = 100, h = 100  ){

    this._lineHeight_normal = this._lineHeight_normal || Math.round( 25 * this.pixel_ratio[0] );
    this._fontSize_normal = this._fontSize_normal || Math.round( 15 * this.pixel_ratio[0] );

    // Add current time to bottom right corner
    if( this.render_timestamp !== false && typeof(results.current_time) === 'number' ){
      this.domContext.font = `${ this._fontSize_normal }px ${ this._fontType }`;
      this.domContext.fillText(

        // Current clock time
        `${results.current_time.toFixed(3)} s`,

        // offset
        w - this._fontSize_normal * 8, h - this._lineHeight_normal * 2);
    }
  }

  _draw_legend( results, x = 10, y = 10, w = 100, h = 100 ){

    const cmap = this.switch_colormap();

    // Added: if info text is disabled, then legend should not display
    // correspoding value
    const info_disabled = this.state_data.get( 'info_text_disabled');

    // whether to draw legend
    const has_color_map = this.render_legend && cmap && (cmap.lut.n !== undefined);

    // If no legend is needed, discard
    if( !has_color_map ){
      return( null );
    }
    const lut = cmap.lut,
          color_type = cmap.value_type,
          color_names = cmap.value_names,
          legend_title = cmap.alias || '',
          actual_range = to_array( cmap.value_range );

    this._lineHeight_legend = this._lineHeight_legend || Math.round( 15 * this.pixel_ratio[0] );
    this._fontSize_legend = this._fontSize_legend || Math.round( 10 * this.pixel_ratio[0] );

    let legend_width = 25 * this.pixel_ratio[0],
        legend_offset = this._fontSize_legend * 7 + legend_width, // '__-1.231e+5__', more than 16 chars
        title_offset = Math.ceil(
          legend_title.length * this._fontSize_legend * 0.42 -
          legend_width / 2 + legend_offset
        );

    // Get color map from lut
    const continuous_cmap = has_color_map && color_type === 'continuous' && lut.n > 1;
    const discrete_cmap = has_color_map && color_type === 'discrete' && lut.n > 0 && Array.isArray(color_names);

    let legend_height = 0.50,                  // Legend takes 60% of the total heights
        legend_start = 0.30;                  // Legend starts at 20% of the height

    if( continuous_cmap ){
      // Create a linear gradient map
      const grd = this.domContext.createLinearGradient( 0 , 0 , 0 , h );

      // Determine legend coordinates and steps
      let legend_step = legend_height / ( lut.n - 1 );

      // Starts from legend_start of total height (h)
      grd.addColorStop( 0, this.background_color );
      grd.addColorStop( legend_start - 4 / h, this.background_color );
      for( let ii in lut.lut ){
        grd.addColorStop( legend_start + legend_step * ii,
            '#' + lut.lut[lut.n - 1 - ii].getHexString());
      }
      grd.addColorStop( legend_height + legend_start + 4 / h, this.background_color );

      // Fill with gradient
      this.domContext.fillStyle = grd;
      this.domContext.fillRect( w - legend_offset , legend_start * h , legend_width , legend_height * h );

      // Add value labels and title
      let legent_ticks = [];
      let zero_height = ( legend_start + lut.maxV * legend_height /
                          (lut.maxV - lut.minV)) * h,
          minV_height = (legend_height + legend_start) * h,
          maxV_height = legend_start * h;
      //  For ticks
      let text_offset = Math.round( legend_offset - legend_width ),
          text_start = Math.round( w - text_offset + this._fontSize_legend ),
          text_halfheight = Math.round( this._fontSize_legend * 0.21 );

      // title. It should be 2 lines above legend grid
      this.domContext.font = `${ this._fontSize_legend }px ${ this._fontType }`;
      this.domContext.fillStyle = this.foreground_color;

      // console.log(`${w - legend_offset}, ${maxV_height - this._lineHeight_legend * 3 + text_halfheight}, ${this.domContext.font}, ${legend_title}`);
      this.domContext.fillText( legend_title, w - title_offset,
          maxV_height - this._lineHeight_legend * 2 + text_halfheight );

      if( actual_range.length == 2 ){
        let vrange = `${actual_range[0].toPrecision(4)} ~ ${actual_range[1].toPrecision(4)}`;
        vrange = vrange.replace(/\.[0]+\ ~/, ' ~')
                       .replace(/\.[0]+$/, '').replace(/\.[0]+e/, 'e');
        this.domContext.fillText( `[${vrange}]`, w - Math.ceil( legend_offset * 1.2 ),
          minV_height + this._lineHeight_legend * 2 + text_halfheight );
      }


      // ticks
      let draw_zero = lut.minV < 0 && lut.maxV > 0;

      if( !info_disabled && typeof( results.current_value ) === 'number' ){
        // There is a colored object rendered, display it
        let value_height = ( legend_start + (lut.maxV - results.current_value) * legend_height / (lut.maxV - lut.minV)) * h;

        // Decide whether to draw 0 and current object value
        // When max and min is too close, hide 0, otherwise it'll be jittered
        if( Math.abs( zero_height - value_height ) <= this._fontSize_legend ){
          draw_zero = false;
        }
        if(Math.abs( value_height - minV_height) > this._fontSize_legend){
          legent_ticks.push([lut.minV.toPrecision(4), minV_height, 0]);
        }
        if( value_height - minV_height > this._lineHeight_legend ){
          value_height = minV_height + this._lineHeight_legend;
        }
        if(Math.abs( value_height - maxV_height) > this._fontSize_legend){
          legent_ticks.push([lut.maxV.toPrecision(4), maxV_height, 0]);
        }
        if( maxV_height - value_height > this._lineHeight_legend ){
          value_height = maxV_height - this._lineHeight_legend;
        }

        legent_ticks.push([
          results.current_value.toPrecision(4), value_height, 1 ]);
      } else {
        legent_ticks.push([lut.minV.toPrecision(4), minV_height, 0]);
        legent_ticks.push([lut.maxV.toPrecision(4), maxV_height, 0]);
      }

      if( draw_zero ){
        legent_ticks.push(['0', zero_height, 0]);
      }


      // Draw ticks
      this.domContext.font = `${ this._fontSize_legend }px ${ this._fontType }`;
      this.domContext.fillStyle = this.foreground_color;

      // Fill text
      legent_ticks.forEach((tick) => {
        if( tick[2] === 1 ){
          this.domContext.font = `bold ${ this._fontSize_legend }px ${ this._fontType }`;
          this.domContext.fillText( tick[0], text_start, tick[1] + text_halfheight );
          this.domContext.font = `${ this._fontSize_legend }px ${ this._fontType }`;
        }else{
          this.domContext.fillText( tick[0], text_start, tick[1] + text_halfheight );
        }

      });

      // Fill ticks
      // this.domContext.strokeStyle = this.foreground_color;  // do not set state of stroke if color not changed
      this.domContext.beginPath();
      legent_ticks.forEach((tick) => {
        if( tick[2] === 0 ){
          this.domContext.moveTo( w - text_offset , tick[1] );
          this.domContext.lineTo( w - text_offset + text_halfheight , tick[1] );
        }else if( tick[2] === 1 ){
          this.domContext.moveTo( w - text_offset , tick[1] );
          this.domContext.lineTo( w - text_offset + text_halfheight , tick[1] - 2 );
          this.domContext.lineTo( w - text_offset + text_halfheight , tick[1] + 2 );
          this.domContext.lineTo( w - text_offset , tick[1] );
        }
      });
      this.domContext.stroke();

    }else if( discrete_cmap ){
      // color_names must exists and length must be
      const n_factors = cmap.n_levels; // Not color_names.length;
      let _text_length = 1;

      color_names.forEach((_n)=>{
        if( _text_length < _n.length ){
          _text_length = _n.length;
        }
      });

      legend_offset = Math.ceil( this._fontSize_legend * 0.42 * ( _text_length + 7 ) + legend_width );

      // this._lineHeight_legend * 2 = 60 px, this is the default block size
      legend_height = ( ( n_factors - 1 ) * this._lineHeight_legend * 2 ) / h;
      legend_height = legend_height > 0.60 ? 0.60: legend_height;

      let legend_step = n_factors == 1 ? 52 : (legend_height / ( n_factors - 1 ));
      let square_height = Math.floor( legend_step * h ) - 2;
      square_height = square_height >= 50 ? 50 : Math.max(square_height, 4);


      let text_offset = Math.round( legend_offset - legend_width ),
          text_start = Math.round( w - text_offset + this._fontSize_legend ),
          text_halfheight = Math.round( this._fontSize_legend * 0.21 );



      this.domContext.font = `${ this._fontSize_legend }px ${ this._fontType }`;
      this.domContext.strokeStyle = this.foreground_color;


      // Draw title. It should be 1 lines above legend grid
      this.domContext.fillText( legend_title, w - title_offset, legend_start * h - 50 );

      // Draw Ticks
      for(let ii = 0; ii < n_factors; ii++ ){
        let square_center = (legend_start + legend_step * ii) * h;
        this.domContext.fillStyle = '#' + lut.getColor(ii).getHexString();
        this.domContext.fillRect(
          w - legend_offset , square_center - square_height / 2 ,
          legend_width , square_height
        );

        this.domContext.beginPath();
        this.domContext.moveTo( w - text_offset , square_center );
        this.domContext.lineTo( w - text_offset + text_halfheight , square_center );
        this.domContext.stroke();

        this.domContext.fillStyle = this.foreground_color;

        if( !info_disabled && results.current_value === color_names[ii]){
          this.domContext.font = `bold ${ this._fontSize_legend }px ${ this._fontType }`;
          this.domContext.fillText(color_names[ii],
            text_start, square_center + text_halfheight, w - text_start - 1
          );
          this.domContext.font = `${ this._fontSize_legend }px ${ this._fontType }`;
        }else{
          this.domContext.fillText(color_names[ii],
            text_start, square_center + text_halfheight, w - text_start - 1
          );
        }

      }


    }
  }

  _draw_focused_info( results, x = 10, y = 10, w = 100, h = 100 ){
    // Add selected object information, or if not showing is set
    if( !results.selected_object || this.state_data.get( 'info_text_disabled') ){
      // no object selected, discard
      return( null );
    }


    this._lineHeight_normal = this._lineHeight_normal || Math.round( 25 * this.pixel_ratio[0] );
    this._lineHeight_small = this._lineHeight_small || Math.round( 15 * this.pixel_ratio[0] );
    this._fontSize_normal = this._fontSize_normal || Math.round( 15 * this.pixel_ratio[0] );
    this._fontSize_small = this._fontSize_small || Math.round( 10 * this.pixel_ratio[0] );

    this.domContext.fillStyle = this.foreground_color;

    this.domContext.font = `${ this._fontSize_normal }px ${ this._fontType }`;

    let text_left;
    if( this.has_side_cameras ){
      text_left = w - Math.ceil( 50 * this._fontSize_normal * 0.42 );
    } else {
      text_left = Math.ceil( this._fontSize_normal * 0.42 * 2 );
    }
    let text_position = [
      text_left,

      // Make sure it's not hidden by control panel
      this._lineHeight_normal + this._lineHeight_small + this.pixel_ratio[0] * 10
    ];

    // Line 1: object name
    this.domContext.fillText( results.selected_object.name, text_position[ 0 ], text_position[ 1 ] );

    // Smaller
    this.domContext.font = `${ this._fontSize_small }px ${ this._fontType }`;

    // Line 2: Global position

    let pos;
    if( results.selected_object.is_electrode ){
      pos = results.selected_object.MNI305_position;
      if( pos.x !== 0 || pos.y !== 0 || pos.z !== 0 ){
        text_position[ 1 ] = text_position[ 1 ] + this._lineHeight_small;
        this.domContext.fillText(
          `MNI305 position: (${pos.x.toFixed(0)},${pos.y.toFixed(0)},${pos.z.toFixed(0)})`,
          text_position[ 0 ], text_position[ 1 ]
        );
      }
    } else {
      pos = results.selected_object.position;
      text_position[ 1 ] = text_position[ 1 ] + this._lineHeight_small;
      this.domContext.fillText(
        `Global position: (${pos.x.toFixed(2)},${pos.y.toFixed(2)},${pos.z.toFixed(2)})`,
        text_position[ 0 ], text_position[ 1 ]
      );
    }


    // More information:

    // For electrodes


    if( results.selected_object.is_electrode ){
      const _m = results.selected_object.template_mapping;

      const _tn = this.object_chosen.userData.display_info.threshold_name || '[None]';
      let _tv = this.object_chosen.userData.display_info.threshold_value;
      if( typeof _tv === 'number' ){
        _tv = _tv.toPrecision(4);
      }

      const _dn = this.object_chosen.userData.display_info.display_name;
      let _dv = results.current_value;

      if( typeof _dv === 'number' ){
        _dv = _dv.toPrecision(4);
      }

      // Line 3: mapping method & surface type
      /*
      text_position[ 1 ] = text_position[ 1 ] + this._lineHeight_small;

      this.domContext.fillText(
        `Surface: ${ _m.surface }, shift vs. MNI305: ${ _m.shift.toFixed(2) }`,
        text_position[ 0 ], text_position[ 1 ]
      );
      */

      // Line 4:
      if( _dv !== undefined ){
        text_position[ 1 ] = text_position[ 1 ] + this._lineHeight_small;

        this.domContext.fillText(
          `Display:   ${ _dn } (${ _dv })`,
          text_position[ 0 ], text_position[ 1 ]
        );
      }


      // Line 5:
      if( _tv !== undefined ){
        text_position[ 1 ] = text_position[ 1 ] + this._lineHeight_small;

        this.domContext.fillText(
          `Threshold: ${ _tn } (${ _tv })`,
          text_position[ 0 ], text_position[ 1 ]
        );
      }


    }

    // Line last: customized message
    text_position[ 1 ] = text_position[ 1 ] + this._lineHeight_small;

    this.domContext.fillText(
      results.selected_object.custom_info || '',
      text_position[ 0 ], text_position[ 1 ]
    );

  }


  // Do not call this function directly after the initial call
  // use "this.start_animation(0);" to render once
  // use "this.start_animation(1);" to keep rendering
  // this.pause_animation(1); to stop rendering
  // Only use 0 or 1
  animate(){

    if( this._disposed ){ return; }

    requestAnimationFrame( this.animate.bind(this) );

    // If this.el is hidden, do not render
    if( this.el.clientHeight <= 0 ){
      return(null);
    }

    this.update();

    if(this.render_flag >= 0){

      if(this.has_stats){
        this.stats.update();
      }

  		const results = this.inc_time();


  		this.render( results );


  		// show mesh value info
      if( results.selected_object && this.object_chosen.userData.ani_exists ){

        const track_type = this.state_data.get("color_map");

        const track_data = this.object_chosen.userData.get_track_data( track_type );

        if( track_data ){
          const time_stamp = to_array( track_data.time );
          const values = to_array( track_data.value );
          let _tmp = - Infinity;
          for( let ii in time_stamp ){
            if(time_stamp[ ii ] <= results.current_time && time_stamp[ ii ] > _tmp){
              results.current_value = values[ ii ];
              _tmp = time_stamp[ ii ];
            }
          }
        }
      }

  		// draw main and side rendered images to this.domElement (2d context)
  		this.mapToCanvas();



  		// Add additional information
      const _pixelRatio = this.pixel_ratio[0];
      const _fontType = 'Courier New, monospace';
      const _width = this.domElement.width;
      const _height = this.domElement.height;

      this.domContext.fillStyle = this.foreground_color;

      // Draw title on the top left corner
      this._draw_title( results, 0, 0, _width, _height );

      // Draw timestamp on the bottom right corner
      this._draw_ani( results, 0, 0, _width, _height );

      // Draw legend on the right side
      this._draw_legend( results, 0, 0, _width, _height );

      // Draw focused target information on the top right corner
      this._draw_focused_info( results, 0, 0, _width, _height );


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

  remove_object( obj, resursive = true, dispose = true, depth = 100 ){
    if( !obj && depth < 0 ){ return; }
    if( resursive ){
      if( Array.isArray( obj.children ) ){
        for( let ii = obj.children.length - 1; ii >= 0; ii = Math.min(ii-1, obj.children.length) ){
          if( ii < obj.children.length ){
            this.remove_object( obj.children[ ii ], resursive, dispose, depth - 1 );
          }
        }
      }
    }
    if( obj.parent ){
      console.debug( 'removing object - ' + (obj.name || obj.type) );
      obj.parent.remove( obj );
    }

    if( dispose ){
      this.dispose_object( obj );
    }
  }
  dispose_object( obj, quiet = false ){
    if( !obj || typeof obj !== 'object' ) { return; }
    const obj_name = obj.name || obj.type || 'unknown';
    if( !quiet ){
      console.debug('Disposing - ' + obj_name);
    }
    if( obj.userData && typeof obj.userData.dispose === 'function' ){
      this._try_dispose( obj.userData, obj.name, quiet );
    }else{
      // Not implemented, try to guess dispose methods
      this._try_dispose( obj.material, obj_name + '-material', quiet );
      this._try_dispose( obj.geometry, obj_name + '-geometry', quiet );
      this._try_dispose( obj, obj_name, quiet );
    }
  }

  _try_dispose( obj, obj_name = undefined, quiet = false ){
    if( !obj || typeof obj !== 'object' ) { return; }
    if( typeof obj.dispose === 'function' ){
      try {
        obj.dispose();
      } catch(e) {
        if( !quiet ){
          console.warn( 'Failed to dispose ' + (obj_name || obj.name || 'unknown') );
        }
      }
    }
  }

  dispose(){
    // Remove all objects, listeners, and dispose all
    this._disposed = true;
    this.clock.stop();

    // Remove custom listeners
    this.dispose_eventlisters();

    // Remove customized objects
    this.clear_all();

    // Remove the rest objects in the scene
    this.remove_object( this.scene );

    // Call dispose method
    this.threebrain_instances.forEach((el) => {
      el.dispose();
    });

    // dispose scene
    this.scene.dispose();
    this.scene = null;

    // Remove el
    this.el.innerHTML = '';

    // How to dispose renderers? Not sure
    this.domContext = null;
    this.main_renderer.dispose();
    this.side_renderer.dispose();

  }

  // Function to clear all meshes
  clear_all(){
    // Stop showing information of any selected objects
    this.object_chosen=undefined;
    this.clickable.clear();

    this.subject_codes.length = 0;
    this.electrodes.clear();
    this.volumes.clear();
    this.ct_scan.clear();
    this.surfaces.clear();

    this.state_data.clear();
    this.shared_data.clear();
    this.color_maps.clear();
    this._mouse_click_callbacks['side_viewer_depth'] = undefined;

    console.log('TODO: Need to dispose animation clips');
    this.animation_clips.clear();

    this.group.forEach((g) => {
      // g.parent.remove( g );
      this.remove_object( g );
    });
    this.mesh.forEach((m) => {
      this.remove_object( m );
      // m.parent.remove( m );
      // this.dispose_object(m);
      // this.scene.remove( m );
    });
    this.mesh.clear();
    this.threebrain_instances.clear();
    this.group.clear();

    // set default values
    this.state_data.set( 'coronal_depth', 0 );
    this.state_data.set( 'axial_depth', 0 );
    this.state_data.set( 'sagittal_depth', 0 );

  }

  // To be implemented (abstract methods)
  set_coronal_depth( depth ){
    if( typeof this._set_coronal_depth === 'function' ){
      this._set_coronal_depth( depth );
    }else{
      console.debug('Set coronal depth not implemented');
    }
  }
  set_axial_depth( depth ){
    if( typeof this._set_axial_depth === 'function' ){
      this._set_axial_depth( depth );
    }else{
      console.debug('Set axial depth not implemented');
    }
  }
  set_sagittal_depth( depth ){
    if( typeof this._set_sagittal_depth === 'function' ){
      this._set_sagittal_depth( depth );
    }else{
      console.debug('Set sagittal depth not implemented');
    }
  }
  set_side_depth( c_d, a_d, s_d ){
    console.debug('Set side depth not implemented');
  }
  set_side_visibility( which, visible ){
    console.debug('Set side visibility not implemented');
  }
  side_plane_sendback( is_back ){
    if( typeof this._side_plane_sendback === 'function' ){
      this._side_plane_sendback( is_back );
    }
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
        inst = gen_f(g, this),
        layers = to_array(g.layer);

    if(typeof(inst) !== 'object' || inst === null){
      return(null);
    }

    let m = inst;

    if( inst.isThreeBrainObject ){
      this.threebrain_instances.set( g.name, inst );
      m = inst.object;
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
      this.electrodes.set( subject_code, {});
      this.volumes.set( subject_code, {} );
      this.ct_scan.set( subject_code, {} );
      this.surfaces.set(subject_code, {} );
    }


    if( g.type === 'datacube' ){
      // Special, as m is a array of three planes
      this.mesh.set( '_coronal_' + g.name, m[0] );
      this.mesh.set( '_axial_' + g.name, m[1] );
      this.mesh.set( '_sagittal_' + g.name, m[2] );

      if(g.clickable){
        this.clickable.set( '_coronal_' + g.name, m[0] );
        this.clickable.set( '_axial_' + g.name, m[1] );
        this.clickable.set( '_sagittal_' + g.name, m[2] );
      }


      // data cube must have groups
      let gp = this.group.get( g.group.group_name );
      // Move gp to global scene as its center is always 0,0,0
      this.origin.remove( gp );
      this.scene.add( gp );


      m.forEach((plane) => {

        gp.add( plane );

        set_layer( plane );
        plane.userData.construct_params = g;
        plane.updateMatrixWorld();
      });

      get_or_default( this.volumes, subject_code, {} )[ g.name ] = m;

      // flaw there, if volume has no subject, then subject_code is '',
      // if two volumes with '' exists, we lose track of the first volume
      // and switch_volume will fail in setting this cube invisible
      // TODO: force subject_code for all volumes or use random string as subject_code
      // or parse subject_code from volume name
      if( !this._has_datacube_registered ){
        this._register_datacube( m );
        this._has_datacube_registered = true;
      }


    }else if( g.type === 'datacube2' ){
      this.mesh.set( g.name, m );

      if(g.clickable){
        this.clickable.set( g.name, m );
      }

      // data cube 2 must have groups
      let gp = this.group.get( g.group.group_name );
      // Move gp to global scene as its center is always 0,0,0
      this.origin.remove( gp );
      this.scene.add( gp );

      gp.add( m );
      set_layer( m );
      m.userData.construct_params = g;
      m.updateMatrixWorld();

      get_or_default( this.ct_scan, subject_code, {} )[ g.name ] = m;



    }else if( g.type === 'sphere' && g.is_electrode ){
      set_layer( m );
      m.userData.construct_params = g;
      this.mesh.set( g.name, m );
      get_or_default( this.electrodes, subject_code, {} )[g.name] = m;

      // electrodes must be clickable, ignore the default settings
      this.clickable.set( g.name, m );
      let gp_position;
      if(g.group === null){
        this.add_to_scene(m);
      }else{
        let gp = this.group.get( g.group.group_name );
        gp.add(m);
        gp_position = gp.position.clone();
      }
      m.updateMatrixWorld();

      // For electrode, there needs some calculation
      // g = m.userData.construct_params
      if( (
            !g.vertex_number || g.vertex_number < 0 ||
            !g.hemisphere || !['left', 'right'].includes( g.hemisphere )
          ) && g.is_surface_electrode ){
        // surface electrode, need to calculate nearest node
        const snap_surface = g.surface_type,
              search_group = this.group.get( `Surface - ${snap_surface} (${subject_code})` );

        // Search 141 only
        if( search_group && search_group.userData ){
          const lh_vertices = search_group.userData.group_data[`free_vertices_Standard 141 Left Hemisphere - ${snap_surface} (${subject_code})`];
          const rh_vertices = search_group.userData.group_data[`free_vertices_Standard 141 Right Hemisphere - ${snap_surface} (${subject_code})`];
          const mesh_center = search_group.getWorldPosition( gp_position );
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
            console.log(`Electrode ${m.name}: ${node_idx}, ${side}`);
          }
        }

      }



    }else if( g.type === 'free' ){
      set_layer( m );
      m.userData.construct_params = g;
      this.mesh.set( g.name, m );
      if(g.clickable){ this.clickable.set( g.name, m ); }
      // freemesh must have group
      let gp = this.group.get( g.group.group_name ); gp.add(m);
      m.updateMatrixWorld();

      // Need to registr surface
      // instead of using surface name, use
      get_or_default( this.surfaces, subject_code, {} )[ g.name ] = m;

    }else{

      set_layer( m );
      m.userData.construct_params = g;
      this.mesh.set( g.name, m );

      if(g.clickable){
        this.clickable.set( g.name, m );
      }

      if(g.group === null){
        this.add_to_scene(m);
      }else{
        let gp = this.group.get( g.group.group_name );
        gp.add(m);
      }

      if(m.isMesh){
        m.updateMatrixWorld();
      }
    }

    inst.finish_init();
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
      // this._coronal_depth = depth;
      this.state_data.set( 'coronal_depth', depth );
      this.state_data.set( 'coronal_posy', m[0].position.y );
      this.trim_electrodes();
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
      // this._axial_depth = depth;
      this.state_data.set( 'axial_depth', depth );
      this.state_data.set( 'axial_posz', m[1].position.z );
      this.trim_electrodes();
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
      // this._sagittal_depth = depth;
      this.state_data.set( 'sagittal_depth', depth );
      this.state_data.set( 'sagittal_posx', m[2].position.x );
      this.trim_electrodes();
      // Animate on next refresh
      this.start_animation( 0 );
    };
    this._side_plane_sendback = ( sendback ) => {
      m.forEach( (p) => {
        p.material.uniforms.renderDepth.value = sendback ? 0.0 : 1.0;
        p.material.needsUpdate = true;
      });
    };

    this.set_side_visibility = ( which, visible ) => {
      let fn = visible ? 'enable' : 'disable';
      if( which === 'coronal' ){
        m[0].layers[fn](8);
        this.state_data.set( 'coronal_overlay', visible );
      }else if( which === 'axial' ){
        m[1].layers[fn](8);
        this.state_data.set( 'axial_overlay', visible );
      }else if( which === 'sagittal' ){
        m[2].layers[fn](8);
        this.state_data.set( 'sagittal_overlay', visible );
      }else{
        // reset, using cached
        fn = get_or_default( this.state_data, 'coronal_overlay', false ) ? 'enable' : 'disable';
        m[0].layers[fn](8);
        fn = get_or_default( this.state_data, 'axial_overlay', false ) ? 'enable' : 'disable';
        m[1].layers[fn](8);
        fn = get_or_default( this.state_data, 'sagittal_overlay', false ) ? 'enable' : 'disable';
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

        if(cache_info === undefined || cache_info === null || Array.isArray(cache_info) ){
          // Already cached
          item_size -= 1;
        /*}else if( cache_info.lazy ){
          // lazy-load the data
          cache_info.loaded = false;
          cache_info.server_path = cache_folder + g.cache_name + '/' + cache_info.file_name;
          item_size -= 1;*/
        } else {


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
    this.group.set( g.name, gp );

    this.add_to_scene(gp);

    // special case, if group name is "__global_data", then set group variable
    if( g.name === '__global_data' && g.group_data ){
      for( let _n in g.group_data ){
        this.shared_data.set(_n.substring(15), g.group_data[ _n ]);
      }
    }

    const check = function(){
      return(item_size === 0);
    };

    return(check);

  }

  // Get data from some geometry. Try to get from geom first, then get from group
  get_data(data_name, from_geom, group_hint){

    const m = this.mesh.get( from_geom );
    let re, gp;

    if( m ){
      if(m.userData.hasOwnProperty(data_name)){
        // Object itself own the property, no group needs to go to
        return(m.userData[data_name]);
      }else{
        let g = m.userData.construct_params.group;
        if(g !== null){
          let group_name = g.group_name;
          gp = this.group.get( group_name );
          // set re
        }
      }
    }else if(group_hint !== undefined){
      let group_name = group_hint;
      gp = this.group.get( group_name );
      // set re

    }else if(this.DEBUG){
      console.error('Cannot find data with name ' + from_geom + ' at group ' + group_hint);
    }

    // group exists
    if(gp && gp.userData.group_data !== null && gp.userData.group_data.hasOwnProperty(data_name)){

      re = gp.userData.group_data[data_name];
      /*
      if( re ){
        const is_lazy = re.lazy;
        const tobe_loaded = re.loaded === false;

        // if re is not lazy, run `lazy_onload`,
        // if re is lazy but loaded, run
        if( !(is_lazy && tobe_loaded) && typeof lazy_onload === 'function' ){
          // this means re is loaded. However, data is not overridden or missing
          // because otherwise re should be the actual object.
          // return re anyway to see if `lazy_onload` can further handle it
          lazy_onload( re );
        }

        if( is_lazy && tobe_loaded ){

          // otherwise load data

          // make sure we never load data again
          re.loaded = true;

          this.load_file(
            re.server_path, ( v ) => {
          	  const keys = Object.keys(v);
          	  keys.forEach((k) => {
                gp.userData.group_data[k] = v[k];
              });
              // recall function
              re = gp.userData.group_data[data_name];
              if( re && typeof lazy_onload === 'function' ){
                lazy_onload( re );
              }
          	},
          	( url, itemsLoaded, itemsTotal ) => {
            	console.debug( 'Loading file: ' + url + ' (lazy-load).\nLoaded ' +
            	              itemsLoaded + ' of ' + itemsTotal + ' files.' );
            }
          );
        }

      }*/
    }

    return(re);
  }


  // Generate animation clips and mixes
  generate_animation_clips( animation_name = 'Value', set_current=true,
                            callback = (e) => {} ){

    if( animation_name === undefined ){
      animation_name = this.shared_data.get('animation_name') || 'Value';
    }else{
      this.shared_data.set('animation_name', animation_name);
    }

    // TODO: make sure cmap exists or use default lut
    const cmap = this.switch_colormap( animation_name );
    // this.color_maps

    this.mesh.forEach( (m, k) => {
      if( !m.isMesh || !m.userData.get_track_data ){ return(null); }

      if( !m.userData.ani_exists ){ return(null); }

      // keyframe is not none, generate animation clip(s)
      /**
       * Steps to make an animation
       *
       * 1. get keyframes, here is "ColorKeyframeTrack"
       *        new THREE.ColorKeyframeTrack( '.material.color', time_key, color_value, THREE.InterpolateDiscrete )
       *    keyframe doesn't specify which object, it also can only change one attribute
       * 2. generate clip via "AnimationClip"
       *        new THREE.AnimationClip( clip_name , this.time_range_max - this.time_range_min, keyframes );
       *    animation clip combines multiple keyframe, still, doesn't specify which object
       * 3. mixer via "AnimationMixer"
       *        new THREE.AnimationMixer( m );
       *    A mixer specifies an object
       * 4. combine mixer with clips via "action = mixer.clipAction( clip );"
       *    action.play() will play the animation clips
       */

      // Step 0: get animation time_stamp start time
      // lut: lut,
      // value_type: value_type,
      // value_names: value_names, time_range: time_range

      // Obtain mixer, which will be used in multiple places
      let keyframe;

      // Step 1: Obtain keyframe tracks
      // if animation_name exists, get tracks, otherwise reset to default material
      const track_data = m.userData.get_track_data( animation_name, true );

      // no keyframe tracks, remove animation
      if( !track_data ){

        // If action is going, stop them all
        if( m.userData.ani_mixer ){ m.userData.ani_mixer.stopAllAction(); }
        return( null );

      }

      if( typeof m.userData.generate_animation === 'function'){
        keyframe = m.userData.generate_animation(track_data, cmap, this.animation_clips, m.userData.ani_mixer );
      }else{
        keyframe = generate_animation_default(m, track_data, cmap, this.animation_clips, m.userData.ani_mixer );
      }
      if( !keyframe ){ return; }

      const _time_min = cmap.time_range[0],
            _time_max = cmap.time_range[1];

      const clip_name = 'action_' + m.name + '__' + track_data.name;
      let clip = this.animation_clips.get( clip_name ), new_clip = false;

      if( !clip ){
        clip = new THREE.AnimationClip( clip_name, _time_max - _time_min, [keyframe] );
        this.animation_clips.set( clip_name, clip );
        new_clip = true;
      }else{
        clip.duration = _time_max - _time_min;
        clip.tracks[0].name = keyframe.name;
        clip.tracks[0].times = keyframe.times;
        clip.tracks[0].values = keyframe.values;
      }

      // Step 3: create mixer
      if( m.userData.ani_mixer ){
        m.userData.ani_mixer.stopAllAction();
      }
      m.userData.ani_mixer = new THREE.AnimationMixer( m );
      m.userData.ani_mixer.stopAllAction();

      // Step 4: combine mixer with clip
      const action = m.userData.ani_mixer.clipAction( clip );
      action.play();


    });



    callback( cmap );
  }


  // -------- Especially designed for brain viewer

  get_surface_types(){
    const re = { 'pial' : 1 }; // always put pials to the first one

    this.group.forEach( (gp, g) => {
      // let res = new RegExp('^Surface - ([a-zA-Z0-9_-]+) \\((.*)\\)$').exec(g);
      const res = CONSTANTS.REGEXP_SURFACE_GROUP.exec(g);
      if( res && res.length === 3 ){
        re[ res[1] ] = 1;
      }
    });

    return( Object.keys( re ) );
  }

  get_volume_types(){
    const re = {};

    this.volumes.forEach( (vol, s) => {
      let volume_names = Object.keys( vol ),
          //  T1 (YAB)
          res = new RegExp('^(.*) \\(' + s + '\\)$').exec(g);
          // res = CONSTANTS.REGEXP_VOLUME.exec(g);

      if( res && res.length === 2 ){
        re[ res[1] ] = 1;
      }
    });
    return( Object.keys( re ) );
  }

  get_ct_types(){
    const re = {};

    this.ct_scan.forEach( (vol, s) => {
      let volume_names = Object.keys( vol ),
          //  T1 (YAB)
          res = new RegExp('^(.*) \\(' + s + '\\)$').exec(g);
          // res = CONSTANTS.REGEXP_VOLUME.exec(g);

      if( res && res.length === 2 ){
        re[ res[1] ] = 1;
      }
    });
    return( Object.keys( re ) );
  }

  switch_subject( target_subject = '/', args = {}){

    if( this.subject_codes.length === 0 ){
      return( null );
    }

    const state = this.state_data;

    if( !this.subject_codes.includes( target_subject ) ){

      target_subject = state.get('target_subject');

      if( !target_subject || !this.subject_codes.includes( target_subject ) ){
        // This happends when subjects are just loaded
        if( this.shared_data.get(".multiple_subjects") ){
          target_subject = this.shared_data.get(".template_subjects");
        }
      }

      if( !target_subject || !this.subject_codes.includes( target_subject ) ){
        target_subject = this.subject_codes[0];
      }



    }
    state.set( 'target_subject', target_subject );

    let surface_type = args.surface_type || state.get( 'surface_type' ) || 'pial';

    let material_type_left = args.material_type_left || state.get( 'material_type_left' ) || 'normal';
    let material_type_right = args.material_type_right || state.get( 'material_type_right' ) || 'normal';
    let volume_type = args.volume_type || state.get( 'volume_type' ) || 'T1';
    let ct_type = args.ct_type || state.get( 'ct_type' ) || 'ct.aligned.t1';
    let ct_threshold = args.ct_threshold || state.get( 'ct_threshold' ) || 0.8;

    let map_template = state.get( 'map_template' ) || false;

    if( args.map_template !== undefined ){
      map_template = args.map_template;
    }
    let map_type_surface = args.map_type_surface || state.get( 'map_type_surface' ) || 'std.141';
    let map_type_volume = args.map_type_volume || state.get( 'map_type_volume' ) || 'mni305';
    let surface_opacity_left = args.surface_opacity_left || state.get( 'surface_opacity_left' ) || 1;
    let surface_opacity_right = args.surface_opacity_right || state.get( 'surface_opacity_right' ) || 1;
    //let v2v_orig = get_or_default( this.shared_data, target_subject, {} ).vox2vox_MNI305;
    let v2v_orig = this.shared_data.get( target_subject ).vox2vox_MNI305;
    let anterior_commissure = state.get('anterior_commissure') || new THREE.Vector3();
    anterior_commissure.set(0,0,0);

    let tkRAS_MNI305 = state.get('tkRAS_MNI305') || new THREE.Matrix4();
    tkRAS_MNI305.set(1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1);
    if(Array.isArray(v2v_orig) && v2v_orig.length == 4 && v2v_orig[3].length == 4 ){
      tkRAS_MNI305.set( v2v_orig[0][0], v2v_orig[0][1], v2v_orig[0][2], v2v_orig[0][3],
        v2v_orig[1][0], v2v_orig[1][1], v2v_orig[1][2], v2v_orig[1][3],
        v2v_orig[2][0], v2v_orig[2][1], v2v_orig[2][2], v2v_orig[2][3],
        v2v_orig[3][0], v2v_orig[3][1], v2v_orig[3][2], v2v_orig[3][3] );
      const MNI305_tkRAS = new THREE.Matrix4().getInverse( tkRAS_MNI305 );
      anterior_commissure.setFromMatrixPosition( MNI305_tkRAS );
    }

    this.switch_volume( target_subject, volume_type );
    this.switch_ct( target_subject, ct_type, ct_threshold );
    this.switch_surface( target_subject, surface_type,
                          [surface_opacity_left, surface_opacity_right],
                          [material_type_left, material_type_right] );

    if( map_template ){
      this.map_electrodes( target_subject, map_type_surface, map_type_volume );
    }else{
      this.map_electrodes( target_subject, 'reset', 'reset' );
    }

    // reset overlay
    this.set_side_visibility();

    state.set( 'surface_type', surface_type );
    state.set( 'material_type_left', material_type_left );
    state.set( 'material_type_right', material_type_right );
    state.set( 'volume_type', volume_type );
    state.set( 'ct_type', ct_type );
    state.set( 'ct_threshold', ct_threshold );
    state.set( 'map_template', map_template );
    state.set( 'map_type_surface', map_type_surface );
    state.set( 'map_type_volume', map_type_volume );
    state.set( 'surface_opacity_left', surface_opacity_left );
    state.set( 'surface_opacity_right', surface_opacity_right );
    state.set( 'anterior_commissure', anterior_commissure );
    state.set( 'tkRAS_MNI305', tkRAS_MNI305 );

    // reset origin to AC
    // this.origin.position.copy( anterior_commissure );

    this.dispatch_event(
      'switch_subject',
      {
        target_subject: target_subject
      }
    );

    this.start_animation( 0 );

  }

  calculate_mni305(vec, nan_if_trans_not_found = true){
    if( !vec.isVector3 ){
      throw('vec must be a THREE.Vector3 instance');
    }

    const tkRAS_MNI305 = this.state_data.get('tkRAS_MNI305');
    if( tkRAS_MNI305 && tkRAS_MNI305.isMatrix4 ){
      // calculate MNI 305 position
      vec.applyMatrix4(tkRAS_MNI305);
    } else if( nan_if_trans_not_found ){
      vec.set(NaN, NaN, NaN);
    }
    return(vec);
  }

  switch_surface( target_subject, surface_type = 'pial', opacity = [1, 1], material_type = ['normal', 'normal'] ){
    // this.surfaces[ subject_code ][ g.name ] = m;
    // Naming - Surface         Standard 141 Right Hemisphere - pial (YAB)
    // or FreeSurfer Right Hemisphere - pial (YAB)
    this.surfaces.forEach( (sf, subject_code) => {
      for( let surface_name in sf ){
        const m = sf[ surface_name ];
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
              m.material.opacity = opacity[0];
              m.material.transparent = opacity[0] < 0.99;
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
              m.material.opacity = opacity[1];
              m.material.transparent = opacity[1] < 0.99;
            }

            // Re-calculate controls center so that rotation center is the center of mesh bounding box
            this.bounding_box.setFromObject( m.parent );
            this.bounding_box.geometry.computeBoundingBox();
            const _b = this.bounding_box.geometry.boundingBox;
            this.controls.target.copy( _b.min.clone() ).add( _b.max ).multiplyScalar( 0.5 );
            this.control_center = this.controls.target.toArray();
            this.controls.update();
          }

        }
      }
    });
    this.start_animation( 0 );
  }

  switch_volume( target_subject, volume_type = 'T1' ){

    this.volumes.forEach( (vol, subject_code) => {
      for( let volume_name in vol ){
        const m = vol[ volume_name ];
        if( subject_code === target_subject && volume_name === `${volume_type} (${subject_code})`){
          m[0].parent.visible = true;
          this._register_datacube( m );
        }else{
          m[0].parent.visible = false;
        }
      }
    });

    this.start_animation( 0 );
  }

  switch_ct( target_subject, ct_type = 'ct.aligned.t1', ct_threshold = 0.8 ){

    this.ct_scan.forEach( (vol, subject_code) => {
      for( let ct_name in vol ){
        const m = vol[ ct_name ];
        if( subject_code === target_subject && ct_name === `${ct_type} (${subject_code})`){
          m.parent.visible = this._show_ct;
          m.material.uniforms.u_renderthreshold.value = ct_threshold;
        }else{
          m.parent.visible = false;
        }
      }
    });

    this.start_animation( 0 );
  }


  // Map electrodes
  map_electrodes( target_subject, surface = 'std.141', volume = 'mni305' ){
    /* DEBUG code
    target_subject = 'N27';surface = 'std.141';volume = 'mni305';origin_subject='YAB';
    pos_targ = new THREE.Vector3(),
          pos_orig = new THREE.Vector3(),
          mat1 = new THREE.Matrix4(),
          mat2 = new THREE.Matrix4();
    el = canvas.electrodes.get(origin_subject)["YAB, 29 - aTMP6"];
    g = el.userData.construct_params,
              is_surf = g.is_surface_electrode,
              vert_num = g.vertex_number,
              surf_type = g.surface_type,
              mni305 = g.MNI305_position,
              origin_position = g.position,
              target_group = canvas.group.get( `Surface - ${surf_type} (${target_subject})` ),
              hide_electrode = origin_position[0] === 0 && origin_position[1] === 0 && origin_position[2] === 0;
              pos_orig.fromArray( origin_position );
mapped = false,
            side = (typeof g.hemisphere === 'string' && g.hemisphere.length > 0) ? (g.hemisphere.charAt(0).toUpperCase() + g.hemisphere.slice(1)) : '';
    */


    const pos_targ = new THREE.Vector3(),
          pos_orig = new THREE.Vector3(),
          mat1 = new THREE.Matrix4(),
          mat2 = new THREE.Matrix4();

    this.electrodes.forEach( (els, origin_subject) => {
      for( let el_name in els ){
        const el = els[ el_name ],
              g = el.userData.construct_params,
              is_surf = g.is_surface_electrode,
              vert_num = g.vertex_number,
              surf_type = g.surface_type,
              mni305 = g.MNI305_position,
              origin_position = g.position,
              target_group = this.group.get( `Surface - ${surf_type} (${target_subject})` ),
              // origin_volume = this.group.get( `Volume (${origin_subject})` ),
              // target_volume = this.group.get( `Volume (${target_subject})` ),
              hide_electrode = origin_position[0] === 0 && origin_position[1] === 0 && origin_position[2] === 0;

        // Calculate MNI 305 coordinate in template space
        if( el.userData.MNI305_position === undefined ){
          el.userData.MNI305_position = new THREE.Vector3().set(0, 0, 0);
          if(
            Array.isArray( mni305 ) && mni305.length === 3 &&
            !( mni305[0] === 0 && mni305[1] === 0 && mni305[2] === 0 )
          ) {
            el.userData.MNI305_position.fromArray( mni305 );
          } else {
            let v2v_orig = get_or_default( this.shared_data, origin_subject, {} ).vox2vox_MNI305;
            if( v2v_orig ){
              mat1.set( v2v_orig[0][0], v2v_orig[0][1], v2v_orig[0][2], v2v_orig[0][3],
                                    v2v_orig[1][0], v2v_orig[1][1], v2v_orig[1][2], v2v_orig[1][3],
                                    v2v_orig[2][0], v2v_orig[2][1], v2v_orig[2][2], v2v_orig[2][3],
                                    v2v_orig[3][0], v2v_orig[3][1], v2v_orig[3][2], v2v_orig[3][3] );
              pos_targ.fromArray( origin_position ).applyMatrix4(mat1);
              el.userData.MNI305_position.fromArray( pos_targ.toArray() );
            }

          }
        }

        // mni305_points is always valid (if data is complete).
        const mni305_points = el.userData.MNI305_position;
        pos_orig.fromArray( origin_position );

        let mapped = false,
            side = (typeof g.hemisphere === 'string' && g.hemisphere.length > 0) ? (g.hemisphere.charAt(0).toUpperCase() + g.hemisphere.slice(1)) : '';

        // always do MNI305 mapping first as calibration
        if( !hide_electrode && volume === 'mni305' ){
          // apply MNI 305 transformation
          // let v2v_orig = get_or_default( this.shared_data, origin_subject, {} ).vox2vox_MNI305;
          const v2v_targ = get_or_default( this.shared_data, target_subject, {} ).vox2vox_MNI305;

          if( v2v_targ ){
            mat2.set( v2v_targ[0][0], v2v_targ[0][1], v2v_targ[0][2], v2v_targ[0][3],
                      v2v_targ[1][0], v2v_targ[1][1], v2v_targ[1][2], v2v_targ[1][3],
                      v2v_targ[2][0], v2v_targ[2][1], v2v_targ[2][2], v2v_targ[2][3],
                      v2v_targ[3][0], v2v_targ[3][1], v2v_targ[3][2], v2v_targ[3][3] );

            mat2.getInverse( mat2 );

            if( mni305_points.x !== 0 || mni305_points.y !== 0 || mni305_points.z !== 0 ){
              pos_targ.set( mni305_points.x, mni305_points.y, mni305_points.z ).applyMatrix4(mat2);
              mapped = true;
            }
            /*
            if( !mapped && v2v_orig ){
              mat1.set( v2v_orig[0][0], v2v_orig[0][1], v2v_orig[0][2], v2v_orig[0][3],
                        v2v_orig[1][0], v2v_orig[1][1], v2v_orig[1][2], v2v_orig[1][3],
                        v2v_orig[2][0], v2v_orig[2][1], v2v_orig[2][2], v2v_orig[2][3],
                        v2v_orig[3][0], v2v_orig[3][1], v2v_orig[3][2], v2v_orig[3][3] );

              // target position = inv(mat2) * mat1 * origin_position
              // mat2.multiplyMatrices( mat2, mat1 );
              pos_targ.fromArray( origin_position ).applyMatrix4(mat1);

              pos_targ.applyMatrix4( mat2 );
              mapped = true;
            }*/

            if( mapped ){
              el.position.copy( pos_targ );
              el.userData._template_mni305 = pos_targ.clone();
              el.userData._template_mapped = true;
              el.userData._template_space = 'mni305';
              el.userData._template_shift = 0;
              el.userData._template_surface = g.surface_type;
              el.userData._template_hemisphere = g.hemisphere;
            }else{
              el.userData._template_mni305 = undefined;
            }
          }

        }

        if( !hide_electrode && surface === 'std.141' && is_surf && vert_num >= 0 &&
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
            el.userData._template_surface = g.surface_type;
            el.userData._template_hemisphere = g.hemisphere;
            if( el.userData._template_mni305 ){
              el.userData._template_shift = pos_targ.distanceTo( el.userData._template_mni305 );
            }
            mapped = true;
          }

        }


        // Reset electrode
        if( !mapped ){
          el.position.fromArray( origin_position );
          el.userData._template_mapped = false;
          el.userData._template_space = 'original';
          el.userData._template_mni305 = undefined;
          el.userData._template_shift = 0;
          el.userData._template_surface = g.surface_type;
          el.userData._template_hemisphere = g.hemisphere;
        }
        if( hide_electrode ){
          el.visible = false;
        }

      }
    });

    this.start_animation( 0 );
  }


  // export electrodes
  electrodes_info(){

    const res = {};

    // Electrode Coord_x Coord_y Coord_z Label MNI305_x MNI305_y MNI305_z
    // SurfaceElectrode SurfaceType Radius VertexNumber
    this.electrodes.forEach( ( collection , subject_code ) => {
      const _regexp = new RegExp(`^${subject_code}, ([0-9]+) \\- (.*)$`),
            // _regexp = CONSTANTS.REGEXP_ELECTRODE,
            _v2v = get_or_default( this.shared_data, subject_code, {} ).vox2vox_MNI305,
            re = [],
            mat = new THREE.Matrix4(),
            pos = new THREE.Vector3();
      let row = {};
      let parsed, e, g;

      if( _v2v ){
        mat.set( _v2v[0][0], _v2v[0][1], _v2v[0][2], _v2v[0][3],
                 _v2v[1][0], _v2v[1][1], _v2v[1][2], _v2v[1][3],
                 _v2v[2][0], _v2v[2][1], _v2v[2][2], _v2v[2][3],
                 _v2v[3][0], _v2v[3][1], _v2v[3][2], _v2v[3][3] );

      }

      for( let k in collection ){
        parsed = _regexp.exec( k );
        // just incase
        if( parsed && parsed.length === 3 ){
          row = {};
          e = collection[ k ];
          g = e.userData.construct_params;
          pos.fromArray( g.position );

          // Electrode Coord_x Coord_y Coord_z Label Hemisphere
          row.Electrode = parseInt( parsed[1] );
          row.Coord_x = pos.x;
          row.Coord_y = pos.y;
          row.Coord_z = pos.z;
          row.Label = parsed[2];

          //  MNI305_x MNI305_y MNI305_z
          pos.applyMatrix4( mat );
          row.MNI305_x = pos.x;
          row.MNI305_y = pos.y;
          row.MNI305_z = pos.z;

          // SurfaceElectrode SurfaceType Radius VertexNumber
          row.SurfaceElectrode = g.is_surface_electrode? 'TRUE' : 'FALSE';
          row.SurfaceType = g.surface_type;
          row.Radius = g.radius;
          row.VertexNumber = g.vertex_number;     // vertex_number is already changed
          row.Hemisphere = g.hemisphere;

          // CustomizedInformation
          row.Notes = g.custom_info || '';

        }
        re[ row.Electrode - 1 ] = row;
      }
      row = {};
      // re set row to default
      row.Coord_x = 0;
      row.Coord_y = 0;
      row.Coord_z = 0;
      row.Label = 'NA';

      //  MNI305_x MNI305_y MNI305_z
      row.MNI305_x = 0;
      row.MNI305_y = 0;
      row.MNI305_z = 0;

      // SurfaceElectrode SurfaceType Radius VertexNumber
      row.SurfaceElectrode = 'TRUE';
      row.SurfaceType = 'NA';
      row.Radius = 1;
      row.VertexNumber = -1;
      row.Hemisphere = 'NA';
      row.Notes = '';
      for( let ii = 0; ii < re.length; ii++ ){
        if( re[ ii ] === undefined ){
          // missing one electrode, fill that in
          row.Electrode = ii + 1;
          re[ ii ] = {...row};
        }
      }

      res[ subject_code ] = re;
    });

    return( res );
  }

  download_electrodes( format = 'json' ){
    const res = this.electrodes_info();


    // convert to csv
    for( let subcode in res ){
      let electrode_data = res[ subcode ];

      if( subcode === '__localization__' ){
        const template_sub = this.state_data.get('target_subject');
        electrode_data = electrode_data.map((e) => {

          return({
            Electrode : e.Electrode,
            TemplateCoord_x : e.Coord_x,
            TemplateCoord_y : e.Coord_y,
            TemplateCoord_z : e.Coord_z,
            Label : e.Notes,
            TemplateSubject : template_sub
          });

        });

      }

      if( electrode_data.length > 0 ){
        if( format === 'json' ){
          download( JSON.stringify(electrode_data) , subcode + '_electrodes.json', 'application/json');
        }else if( format === 'csv' ){
          json2csv(electrode_data, (err, csv) => {
            download( csv , subcode + '_electrodes.csv', 'plan/csv');
          });
        }

      }
    }


  }

  // Only show electrodes near 3 planes
  trim_electrodes( distance ){
    if( typeof distance !== 'number' ){
      distance = get_or_default( this.state_data, 'threshold_electrode_plane', Infinity);
    }else{
      this.state_data.set( 'threshold_electrode_plane', distance );
    }
    const _x = get_or_default( this.state_data, 'sagittal_posx', 0);
    const _y = get_or_default( this.state_data, 'coronal_posy', 0);
    const _z = get_or_default( this.state_data, 'axial_posz', 0);
    const plane_pos = new THREE.Vector3().set( _x, _y, _z );
    const diff = new THREE.Vector3();

    this.electrodes.forEach((li, subcode) => {

      for( let ename in li ){
        const e = li[ ename ];

        // Make sure layer 8 (main camera can see these electrodes)
        e.layers.set( CONSTANTS.LAYER_SYS_MAIN_CAMERA_8 );

        // get offsets
        e.getWorldPosition( diff ).sub( plane_pos );

        // Check visibility
        if( Math.abs( diff.x ) <= distance ){
          e.layers.enable( CONSTANTS.LAYER_SYS_SAGITTAL_11 );
        }
        if( Math.abs( diff.y ) <= distance ){
          e.layers.enable( CONSTANTS.LAYER_SYS_CORONAL_9 );
        }
        if( Math.abs( diff.z ) <= distance ){
          e.layers.enable( CONSTANTS.LAYER_SYS_AXIAL_10 );
        }
      }

    });

  }
}



export { THREEBRAIN_CANVAS };
// window.THREEBRAIN_CANVAS = THREEBRAIN_CANVAS;





/* Some code that was old

  render_legend_old(text_color = '#ffffff'){

*/
//    let text_color_fmt = text_color.replace(/^[^0-9a-f]*/, '0x');
/*    let lut = this.lut,
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

*/
