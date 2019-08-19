import { to_dict, to_array } from './utils.js';
import { Stats } from './libs/stats.min.js';
import { THREE } from './threeplugins.js';
import { THREEBRAIN_STORAGE } from './threebrain_cache.js';
import { make_draggable } from './libs/draggable.js';
import { make_resizable } from './libs/resizable.js';


/*
    Class defining basic canvas


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

const cached_storage = new THREEBRAIN_STORAGE();

class THREEBRAIN_CANVAS {
  constructor(
    el, width, height, side_width = 250, shiny_mode=false, cache = false, DEBUG = false, has_webgl2 = true
  ) {
    this.el = el;
    this.container_id = el.id;
    this.has_webgl2 = has_webgl2;
    this.side_width = side_width;
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

    this.mesh = {};
    this.group = {};
    this.clickable = {};
    this.shiny_mode = shiny_mode;
    this.render_flag = 0;
    this.disable_raycast = true;
    this.render_legend = false;
    this.color_type = 'continuous';

    // If there exists animations, this will control the flow;
    this.animation_controls = {};
    this.animation_mixers = {};
    this.clock = new THREE.Clock();

    // Generate a canvas domElement using 2d context to put all renderers together
    // Since it's 2d canvas, we might also add customized information onto it
    this.domElement = document.createElement('canvas');
    this.domContext = this.domElement.getContext('2d');
    this.background_color = '#ffffff'; // white background
    this.foreground_color = '#000000';
    this.domContext.fillStyle = this.background_color;


    // General scene. Two scenes for double-buffer (depth information)
    this.scene = new THREE.Scene();
    this.scene2 = new THREE.Scene();
    //this.scene_legend = new THREE.Scene();

    // Main camera
    this.main_camera = new THREE.OrthographicCamera( -150, 150, height / width * 150, -height / width * 150, 1, 10000 );
		this.main_camera.position.z = 500;
		this.main_camera.userData.pos = [0,0,500];
		this.main_camera.layers.set(0);
		this.main_camera.layers.enable(1);
		this.main_camera.layers.enable(2);
		this.main_camera.layers.enable(3);
		this.main_camera.layers.enable(7);
		this.main_camera.layers.enable(8);
		this.main_camera.lookAt( new THREE.Vector3(0,0,0) ); // Force camera

		// Camera light, casting from behind the main_camera
    var light = new THREE.DirectionalLight( 0xefefef, 0.5 );
    light.position.set(0,0,-1);
    light.layers.set(8);
    this.main_camera.add(light);

    // Add main camera to scene
    this.scene.add( this.main_camera );

    // Add ambient light
    let ambient_light = new THREE.AmbientLight( 0x808080 );
    ambient_light.layers.set(7);
    this.scene.add( ambient_light ); // soft white light


    // Set Main renderer
    if( this.has_webgl2 ){
      // We need to use webgl2 for VolumeRenderShader1 to work
      let main_canvas_el = document.createElement('canvas'),
          main_context = main_canvas_el.getContext( 'webgl2' );
    	this.main_renderer = new THREE.WebGLRenderer({
    	  antialias: false, alpha: true,
    	  canvas: main_canvas_el, context: main_context
    	});
    }else{
    	this.main_renderer = new THREE.WebGLRenderer({
    	  antialias: false, alpha: true
    	});
    }

    this.pixel_ratio = [ window.devicePixelRatio, 1 ];

  	this.main_renderer.setPixelRatio( this.pixel_ratio[0] );
  	this.main_renderer.setSize( width, height );
  	this.main_renderer.autoClear = false; // Manual update so that it can render two scenes
  	this.main_renderer.localClippingEnabled=true; // Enable clipping
  	this.main_renderer.setClearColor( this.background_color );


  	// sidebar renderer (multiple cameras. WebGL1 only)
  	this.side_renderer = new THREE.WebGLRenderer( { antialias: false, alpha: true } );
  	this.side_renderer.setPixelRatio( this.pixel_ratio[1] );
  	this.side_renderer.autoClear = false; // Manual update so that it can render two scenes
  	// this.side_renderer.setSize( width, height ); This step is set dynamically when sidebar cameras are inserted

    /* Use R plots instead
  	// legend renderer to this.scene_legend
  	this.legend_renderer = new THREE.WebGLRenderer( { antialias: false, alpha: true } );
  	this.legend_renderer.setPixelRatio( window.devicePixelRatio );
  	this.legend_renderer.setSize( 100, 200 );

  	// legend camera
  	this.legend_camera = new THREE.OrthographicCamera( -0.65, 1.15, 1.9, -1.7, 1, 100 );
  	this.legend_camera.layers.set(1);
  	this.legend_camera.position.z = 10;
  	this.legend_camera.aspect = 1/2;
  	this.legend_camera.updateProjectionMatrix();

  	this.scene_legend.add( new THREE.AmbientLight( 0x808080 ) );
  	this.scene_legend.add( this.legend_camera );

    this.legend_renderer.domElement.style.pointerEvents = 'none';
    adapter.add_legend( this.legend_renderer.domElement );
  	// this.legend_renderer.render( this.scene_legend, this.legend_camera );
    */

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
      let _width = this.side_width,
          _height = this.side_width;

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
      cvs.width = Math.floor( this.side_width * this.pixel_ratio[1]);
      cvs.height = Math.floor( this.side_width * this.pixel_ratio[1]);
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

			const zoom_reset = document.createElement('div');
			zoom_reset.className = 'zoom-tool';
			zoom_reset.style.top = '77px';
			zoom_reset.innerText = 'o';
			div.appendChild( zoom_reset );
			zoom_reset.addEventListener('click', (e) => {
			  cvs.style.top = '0';
        cvs.style.left = '0';
			  set_zoom_level( 1 );
			});


			// Add cameras
			const camera = new THREE.OrthographicCamera( this.side_width / - 2,
			                                              this.side_width / 2,
			                                              this.side_width / 2,
			                                              this.side_width / - 2, 1, 10000 );
			// Side light is needed so that side views are visible.
			const side_light = new THREE.DirectionalLight( 0xefefef, 0.5 );

			if( idx === 0 ){
			  // coronal (FB)
			  camera.position.fromArray( [0, -500, 0] );
			  camera.up.set( 0, 0, 1 );
			  camera.layers.enable(9);
			  side_light.position.fromArray([0, 1, 0]);
			  side_light.layers.set(9);
			}else if( idx === 1 ){
			  // axial (IS)
			  camera.position.fromArray( [0, 0, 500] );
			  camera.up.set( 0, 1, 0 );
			  camera.layers.enable(10);
			  side_light.position.fromArray([0, 0, -1]);
			  side_light.layers.set(10);
			}else{
			  // sagittal (LR)
			  camera.position.fromArray( [-500, 0, 0] );
			  camera.up.set( 0, 0, 1 );
			  camera.layers.enable(11);
			  side_light.position.fromArray([1, 0, 0]);
			  side_light.layers.set(11);
			}

			camera.lookAt( new THREE.Vector3(0,0,0) );
			camera.aspect = 1;
			camera.updateProjectionMatrix();
			[1, 4, 5, 6, 7, 13].forEach((ly) => {
        camera.layers.enable(ly);
      });

      // light is always following cameras
      camera.add( side_light );
      this.scene.add( camera );

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
      const raise_top = (e) => {
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
      make_draggable( cvs, undefined, div, raise_top );


      // Make resizable, keep current width and height
      const resize_div = (w, h) => {
        // cache size
  			_width = Math.floor( w );
  			_height = Math.floor( h );
  			const _w = _width * this.pixel_ratio[1],
  			      _h = _height * this.pixel_ratio[1];
  			cvs.width = Math.floor( _w );
        cvs.height = Math.floor( _h );

        camera.left = _w / 2;
  		  camera.right = -_w / 2;
  		  camera.top = _h / 2;
  		  camera.bottom = -_h / 2;

      };
      make_resizable( div, true, (w, h) => {}, (w, h) => {
        resize_div(w, h);
        // reset side renderer
  		  this.handle_resize( undefined, undefined );
  		});

      // add double click handler
      const reset = ( reset_wrapper, reset_canvas ) => {
        div.style.top = ( idx * this.side_width ) + 'px';
        div.style.left = '0';
        div.style.width = this.side_width + 'px';
        div.style.height = this.side_width + 'px';
        resize_div( this.side_width, this.side_width );
        set_zoom_level( 1 );
        cvs.style.top = '0';
        cvs.style.left = '0';
      };
      div_header.addEventListener("dblclick", (evt) => {
        reset( true, false );
        // Resize side canvas
        this.handle_resize( undefined, undefined );
      });


      this.side_canvas[ nm ] = {
        'container' : div,
        'canvas'    : cvs,
        'context'   : cvs.getContext('2d'),
        'camera'    : camera,
        'get_dimension' : ( pixel_correlated ) => {
          if( pixel_correlated ){
            return({
              'width' : Math.floor( _width * this.pixel_ratio[1] ) ,
              'height' : Math.floor( _height * this.pixel_ratio[1] )
            });
          }else{
            return({ 'width' : _width , 'height' : _height });
          }

        },
        'reset'     : reset,
        'get_zoom_level' : () => { return( zoom_level ) },
        'set_zoom_level' : set_zoom_level
      };


    });


    // Add main canvas to wrapper element
    // this.wrapper_canvas.appendChild( this.side_canvas );
    this.wrapper_canvas.appendChild( this.main_canvas );
    this.el.appendChild( this.wrapper_canvas );


    // Side cameras
    /*

    this.side_cameras = [
      // // coronal (FB), position: ( 0 , -500 , 0 )
      new THREE.OrthographicCamera( side_width / - 2, side_width / 2, side_width / 2, side_width / - 2, 1, 10000 ),

      // axial (IS),
      new THREE.OrthographicCamera( side_width / - 2, side_width / 2, side_width / 2, side_width / - 2, 1, 10000 ),

      // sagittal (LR)
      new THREE.OrthographicCamera( side_width / - 2, side_width / 2, side_width / 2, side_width / - 2, 1, 10000 ),
      new THREE.OrthographicCamera( side_width / - 2, side_width / 2, side_width / 2, side_width / - 2, 1, 10000 )
    ];

    this.side_cameras[0].position.fromArray( [-500, 0, 0] );
    this.side_cameras[0].up.set( 0, 0, 1 );

    this.side_cameras[1].position.fromArray( [100, 0, 0] );
    this.side_cameras[1].up.set( 0, 0, 1 );

    this.side_cameras[2].position.fromArray( [0, 100, 0] );
    this.side_cameras[2].up.set( 0, 0, 1 );

    this.side_cameras[3].position.fromArray( [0, 0, 100] );
    this.side_cameras[3].up.set( 0, 1, 0 );

    for(var ii = 0; ii < 4; ii++){
      this.side_cameras[ii].lookAt( new THREE.Vector3(0,0,0) );
      this.side_cameras[ii].aspect = 1;
      this.side_cameras[ii].updateProjectionMatrix();
      this.side_cameras[ii].layers.set(1);

      [1, 4, 5, 6, 7, ii+9, 13].forEach((ly) => {
        this.side_cameras[ii].layers.enable(ly);
      });

      let side_light = new THREE.DirectionalLight( 0xefefef, 0.5 ),
          pos = [0,0,0];
      if(ii === 0){
        pos[0] = -1;
      }else{
        pos[ii-1] = 1;
      }

      side_light.position.fromArray(pos);
      side_light.layers.set(ii + 9);
      this.scene.add( side_light );
    }
    this.has_side_cameras = false;
    this.side_width = side_width;
    */






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

      if(this.render_flag < 0){
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


    // Mouse helpers
    let mouse_pointer = new THREE.Vector2(),
        mouse_raycaster = new THREE.Raycaster(),
        mouse_helper = new THREE.ArrowHelper(new THREE.Vector3( 0, 0, 1 ), new THREE.Vector3( 0, 0, 0 ), 50, 0xff0000, 2 ),
        mouse_helper_root = new THREE.Mesh(
          new THREE.BoxBufferGeometry( 4,4,4 ),
          new THREE.MeshBasicMaterial({ color : 0xff0000 })
        );

    // root is a green cube that's only visible in side cameras
    mouse_helper_root.layers.set(13);
    mouse_helper.layers.set(7);

    mouse_helper.add( mouse_helper_root );
    this.mouse_helper = mouse_helper;
    this.mouse_raycaster = mouse_raycaster;
    this.mouse_pointer = mouse_pointer;
    this._mouse_helper_sleep_count = 0;

    this.scene.add(mouse_helper);

    /*
    // octree for fast raycasting
    this.octree = new THREE.Octree( {
			// uncomment below to see the octree (may kill the fps)
			//scene: scene,
			// when undeferred = true, objects are inserted immediately
			// instead of being deferred until next octree.update() call
			// this may decrease performance as it forces a matrix update
			undeferred: false,
			// set the max depth of tree
			depthMax: 5,
			// max number of objects before nodes split or merge
			objectsThreshold: 200000,
			// percent between 0 and 1 that nodes will overlap each other
			// helps insert objects that lie over more than one node
			overlapPct: 1
		} );*/


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
      this._coordinates.x.layers.set(7);
      this._coordinates.y.layers.set(7);
      this._coordinates.z.layers.set(7);
      this.scene.add( this._coordinates.x );
      this.scene.add( this._coordinates.y );
      this.scene.add( this._coordinates.z );
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

  set_mouse_click_callback(callback){
    this._mouse_click_callback = callback;
  }

  /*
  set_animation_callback(callback){
    this._animation_callback = callback;
  }
  */

  // method to target object with mouse pointed at
  target_mouse_helper(){

    if(this._mouse_helper_sleep_count++ < 2 || this.mouse_event === undefined || this.mouse_event.dispose || false){
      return(null);
    }else{
      this._mouse_helper_sleep_count = 0;
    }

    if(this.disable_raycast && (
      this.mouse_event.action != 'dblclick' &&
      this.mouse_event.action != 'click'
    )){
      return(null);
    }

    const clickable_only = !(this.mouse_event.action == 'click' && this.mouse_event.button == 2);

    this.mouse_event.dispose = true;
    if(this.mouse_event.level <= 2){
      this.mouse_event.level = 0;
    }


    let items = this._fast_raycast(clickable_only);
    if(items.length > 0){
      // Has intersects!
      let first_item = items[0],
          target_object = first_item.object,
          from = first_item.point,
          direction = first_item.face.normal.normalize();

      // Some objects may be rotated, hence we need to update normal according to target object matrix world first to get action (world) normal direction
      direction.transformDirection( target_object.matrixWorld );
      let back = this.mouse_raycaster.ray.direction.dot(direction) > 0; // Check if the normal is hidden by object (from camera)


      if(back){
        direction.applyMatrix3(new THREE.Matrix3().set(-1,0,0,0,-1,0,0,0,-1));
      }


      if(this.DEBUG && ['dblclick', 'click'].includes(this.mouse_event.action)){
        console.debug('object selected ' + target_object.name);
      }
      if(['dblclick', 'click'].includes(this.mouse_event.action)){
        this.object_chosen = target_object;
        if(this._mouse_click_callback !== undefined){
          this._mouse_click_callback(target_object, this.mouse_event);
        }
      }

      this.mouse_helper.position.fromArray( to_array(from) );
      this.mouse_helper.setDirection(direction);
      this.mouse_helper.visible = true;
    }else{
      this.mouse_helper.visible = false;
    }

    this.start_animation(0);

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

    /* Not use threejs to render anymore. use R plots to render
    if(this.legend_group === undefined){
      this.legend_group = new THREE.Group(); // TODO add to constructor
      this.scene_legend.add( this.legend_group );
    }else{
      // Clear group
    }


    this.legend = this.lut.setLegendOn({
      position : { x: 0, y: 0, z: 0 },
      //dimensions : { width: 0.2, height: 1.6 }
    });
    this.legend.layers.set(1);
    this.legend_group.add(this.legend);

    this.legend.geometry.computeBoundingBox();


    this.legend_labels = this.lut.setLegendLabels( label_args );

    //labels = lut.setLegendLabels( { 'title': 'Pressure', 'um': 'Pa', 'ticks': 5 } );
    this.legend_labels.title.layers.set(1);
    this.legend_group.add( this.legend_labels.title);


  	for ( var i = 0; i < Object.keys( this.legend_labels.ticks ).length; i ++ ) {
  	  this.legend_labels.ticks[ i ].layers.set(1);
  	  this.legend_labels.ticks[ i ].position.y += 0.05;
  	  this.legend_group.add( this.legend_labels.ticks[ i ] );

  		this.legend_labels.lines[ i ].layers.set(1);
  		this.legend_group.add( this.legend_labels.lines[ i ] );
  	}


    this.legend_renderer.render( this.scene_legend, this.legend_camera );
    // canvas.legend_renderer.render( canvas.scene_legend, canvas.legend_camera );
    /*/
  }

  get_color(v){
    if(this.lut === undefined){
      return('#e2e2e2');
    }else{
      return(this.lut.getColor(v));
    }
  }


  handle_resize(width, height, lazy = false){


    if(width === undefined){
      width = this.client_width;
      height = this.client_height;

      if(lazy){
        this.controls.handleResize();

        this.start_animation(0);

        return(undefined);
      }

    }else{
      this.client_width = width;
      this.client_height = height;
    }

    // console.debug('width: ' + width + '; height: ' + height);

    var main_width = width,
        main_height = height;


    // Check if side_camera exists
    if(!this.has_side_cameras){
      // this.side_canvas.style.display = 'none';
    }else{
      // We use actual HTML dimensions to get new pixel ratio as well as side canvas dim
      let coronal_size = this.side_canvas.coronal.get_dimension( false ),
          axial_size = this.side_canvas.axial.get_dimension( false ),
          sagittal_size = this.side_canvas.sagittal.get_dimension( false );

      // Originally was set vertically, however, it seems GPU is most efficient when
      // rendering things horizotally
      let side_width = coronal_size.width + axial_size.width + sagittal_size.width;
      let side_height = Math.max( coronal_size.height, axial_size.height, sagittal_size.height );

      // calculate new pixel ratio
      /*let _pr = window.devicePixelRatio
                  Math.min( screen.availWidth / side_width,
                            screen.availHeight / side_height, 1 );
      this.pixel_ratio[1] = _pr;
      this.side_renderer.setPixelRatio( _pr ); */
      this.side_renderer.setSize( side_width , side_height );
      // side_renderer.setClearColor( renderer_colors[1] );
    }

    this.main_canvas.style.width = main_width + 'px';
    this.main_canvas.style.height = main_height + 'px';
    this.main_camera.left = -150;
	  this.main_camera.right = 150;
	  this.main_camera.top = main_height / main_width * 150;
	  this.main_camera.bottom = -main_height / main_width * 150;
    this.main_camera.updateProjectionMatrix();

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
  reset_side_cameras( wrapper = true, canvas = true ){
    this.side_canvas.coronal.reset( wrapper, canvas );
    this.side_canvas.axial.reset( wrapper, canvas );
    this.side_canvas.sagittal.reset( wrapper, canvas );
    // Resize side canvas
    this.handle_resize( undefined, undefined );
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

    try {
      this.target_mouse_helper();
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
      const _p = this.pixel_ratio[1];
      const coronal_size = this.side_canvas.coronal.get_dimension( true ),
            axial_size = this.side_canvas.axial.get_dimension( true ),
            sagittal_size = this.side_canvas.sagittal.get_dimension( true );

      /* Use integer pixels here to avoid sub-pixel antialiasing problem */
      let c_w = Math.floor( coronal_size.width ),
          c_h = Math.floor( coronal_size.height );
      this.side_canvas.coronal.context.fillStyle = this.background_color;
      this.side_canvas.coronal.context.fillRect(0, 0, c_w, c_h);
      this.side_canvas.coronal.context.drawImage( this.side_renderer.domElement, 0, 0, c_w, c_h, 0, 0, c_w, c_h);


      let a_w = Math.floor( axial_size.width ),
          a_h = Math.floor( axial_size.height );
      this.side_canvas.axial.context.fillStyle = this.background_color;
      this.side_canvas.axial.context.fillRect(0, 0, a_w, a_h);
      this.side_canvas.axial.context.drawImage( this.side_renderer.domElement, c_w, 0, a_w, a_h, 0, 0, a_w, a_w);


      let s_w = Math.floor( sagittal_size.width ),
          s_h = Math.floor( sagittal_size.height );
      this.side_canvas.sagittal.context.fillStyle = this.background_color;
      this.side_canvas.sagittal.context.fillRect(0, 0, s_w, s_h);
      this.side_canvas.sagittal.context.drawImage( this.side_renderer.domElement, c_w + a_w, 0, s_w, s_h, 0, 0, s_w, s_h);
    }


  }

  render(){


    // double-buffer to make sure depth renderings
    //this.main_renderer.setClearColor( renderer_colors[0] );
    this.main_renderer.clear();
    this.main_renderer.render( this.scene, this.main_camera );
    this.main_renderer.clearDepth();
    this.main_renderer.render( this.scene2, this.main_camera );

    if(this.has_side_cameras){
      let coronal_size = this.side_canvas.coronal.get_dimension( false ),
          axial_size = this.side_canvas.axial.get_dimension( false ),
          sagittal_size = this.side_canvas.sagittal.get_dimension( false );
      let side_width = coronal_size.width + axial_size.width + sagittal_size.width;
      let side_height = Math.max( coronal_size.height, axial_size.height, sagittal_size.height );

      // Cut side views
      // Threejs's origin is at bottom-left, but html is at topleft
      // Need to adjust for each view
      // coronal
      this.side_renderer.setViewport(
        0, side_height - coronal_size.height,
        coronal_size.width, coronal_size.height );
      this.side_renderer.setScissor(
        0, side_height - coronal_size.height,
        coronal_size.width, coronal_size.height );
      this.side_renderer.setScissorTest( true );
      this.side_renderer.clear();
      this.side_renderer.render( this.scene, this.side_canvas.coronal.camera );
      this.side_renderer.clearDepth(); // Ignore depth information and render again
      this.side_renderer.render( this.scene2, this.side_canvas.coronal.camera );

      // axial
      this.side_renderer.setViewport(
        coronal_size.width, side_height - axial_size.height,
        axial_size.width, axial_size.height
      );
      this.side_renderer.setScissor(
        coronal_size.width, side_height - axial_size.height,
        axial_size.width, axial_size.height
      );
      this.side_renderer.setScissorTest( true );
      this.side_renderer.clear();
      this.side_renderer.render( this.scene, this.side_canvas.axial.camera );
      this.side_renderer.clearDepth(); // Ignore depth information and render again
      this.side_renderer.render( this.scene2, this.side_canvas.axial.camera );

      // sagittal
      this.side_renderer.setViewport(
        coronal_size.width + axial_size.width, side_height - sagittal_size.height,
        sagittal_size.width, sagittal_size.height
      );
      this.side_renderer.setScissor(
        coronal_size.width + axial_size.width, side_height - sagittal_size.height,
        sagittal_size.width, sagittal_size.height
      );
      this.side_renderer.setScissorTest( true );
      this.side_renderer.clear();
      this.side_renderer.render( this.scene, this.side_canvas.sagittal.camera );
      this.side_renderer.clearDepth(); // Ignore depth information and render again
      this.side_renderer.render( this.scene2, this.side_canvas.sagittal.camera );


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
          name : this.object_chosen.userData.construct_params.name,
          position : this.object_chosen.getWorldPosition( new THREE.Vector3() ),
          custom_info : this.object_chosen.userData.construct_params.custom_info
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
          this.domContext.fillText( tick[0], _width - 130, tick[1] + 5 );
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
          _width - 10 - legend_title_width, 50 //legend_start * _height - 63
        );

        const pos = results.selected_object.position;
        this.domContext.font = `${_pixelRatio * 10}px ${_fontType}`;
        this.domContext.fillText(
          `(${pos.x.toFixed(2)},${pos.y.toFixed(2)},${pos.z.toFixed(2)})`,
          _width - 300, 108 //legend_start * _height - 34
        );

        if( typeof(results.selected_object.custom_info) === 'string' ){
          legend_title_width = results.selected_object.custom_info.length * 12;
          if( legend_title_width < 330 ){
            legend_title_width = legend_title_width / 2 + 175;
          }
          this.domContext.fillText(
            results.selected_object.custom_info,
            _width - 10 - legend_title_width, 79 //legend_start * _height - 34
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

    // Stop showing information of any selected objects
    this.object_chosen=undefined;
  }

  // Generic method to add objects
  add_object(g){
    //
    if(this.DEBUG){
      console.debug('Generating geometry '+g.type);
    }
    var gen_f = eval('gen_' + g.type),
        m = gen_f(g, this),
        layers = to_array(g.layer);

    if(typeof(m) !== 'object' || m === null){
      return(null);
    }

    m.layers.set(31);
    if(layers.length > 1){
      layers.forEach((ii) => {
        m.layers.enable(ii);
      });
      console.debug(g.name + ' is enabled layer ' + ii);
    }else if(layers.length === 0 || layers[0] > 20){
      if(this.DEBUG){
        console.debug(g.name + ' is set invisible.');
      }
      m.layers.set(1);
      m.visible = false;
    }else{
      m.layers.set(layers[0]);
    }

    m.userData.construct_params = g;
    this.mesh[g.name] = m;

    if(g.clickable){
      this.clickable[g.name] = m;
      /*if(m.isMesh || false){
        this.octree.add( m, { useFaces: false } );
      }*/
    }

    if(g.group === null){
      this.scene.add(m);
    }else{
      let gp = this.group[g.group.group_name];
      gp.add(m);
    }

    if(m.isMesh){
      m.updateMatrixWorld();
    }

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

  load_file(path, onLoad){


    if( this.use_cache ){

      // check cache first,
      if( this.cache.check_item( path ) ){
        onLoad( this.cache.get_item( path ) );
      }else{
        this.loader_triggered = true;
        this.json_loader.load( path, (v) => {
          if(typeof(v) === 'string'){
            v = JSON.parse(v);
          }
          this.cache.set_item( path, v );
          onLoad( v );
        });
      }
    }else{
      this.loader_triggered = true;
      this.json_loader.load( path , (v) => {
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

    this.scene.add(gp);

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
}




function gen_sphere(g, canvas){
  const gb = new THREE.SphereBufferGeometry( g.radius, g.width_segments, g.height_segments ),
      values = to_array(g.value);
  let material;
  gb.name = 'geom_sphere_' + g.name;

  // Make material based on value
  if(values.length === 0){
    material = new THREE.MeshLambertMaterial({ 'transparent' : true });
  }else{
    // Use the first value
    material = new THREE.MeshBasicMaterial({ 'transparent' : true });
  }

  const mesh = new THREE.Mesh(gb, material);
  mesh.name = 'mesh_sphere_' + g.name;

  let linked = false;
  if(g.use_link){
    // This is a linkedSphereGeom which should be attached to a surface mesh
    let vertex_ind = Math.floor(g.vertex_number - 1),
        target_name = g.linked_geom,
        target_mesh = canvas.mesh[target_name];

    if(target_mesh && target_mesh.isMesh){
      let target_pos = target_mesh.geometry.attributes.position.array;
      mesh.position.set(target_pos[vertex_ind * 3], target_pos[vertex_ind * 3+1], target_pos[vertex_ind * 3+2]);
      linked = true;
    }
  }

  if(!linked){
    mesh.position.fromArray(g.position);
  }


  mesh.userData.ani_value = values;
  mesh.userData.ani_time = to_array(g.time_stamp);

  if(values.length > 0){
    // Set animation keyframes, will set material color
    mesh.userData.generate_keyframe_tracks = () => {
      let cols = [], time_stamp = [];
      mesh.userData.ani_value.forEach((v) => {
        let c = canvas.get_color(v);
        cols.push( c.r, c.g, c.b );
      });
      mesh.userData.ani_time.forEach((v) => {
        time_stamp.push( v - canvas.time_range_min );
      });
      return([new THREE.ColorKeyframeTrack(
        '.material.color',
        time_stamp, cols, THREE.InterpolateDiscrete
      )]);

    };

  }

  return(mesh);
}

function gen_blank(g, canvas){
  return(null);
}

function gen_free(g, canvas){
  const gb = new THREE.BufferGeometry(),
      vertices = canvas.get_data('free_vertices_'+g.name, g.name, g.group.group_name),
      faces = canvas.get_data('free_faces_'+g.name, g.name, g.group.group_name);

  const vertex_positions = [],
      face_orders = [];
      //normals = [];

  vertices.forEach((v) => {
    vertex_positions.push(v[0], v[1], v[2]);
    // normals.push(0,0,1);
  });

  faces.forEach((v) => {
    face_orders.push(v[0], v[1], v[2]);
  });

  gb.setIndex( face_orders );
  gb.addAttribute( 'position', new THREE.Float32BufferAttribute( vertex_positions, 3 ) );
  // gb.addAttribute( 'normal', new THREE.Float32BufferAttribute( normals, 3 ) );
  gb.computeVertexNormals();
  gb.computeBoundingBox();
  gb.computeBoundingSphere();
  //gb.computeFaceNormals();
  //gb.faces = faces;


  gb.name = 'geom_free_' + g.name;

  let material = new THREE.MeshLambertMaterial({ 'transparent' : true });

  let mesh = new THREE.Mesh(gb, material);
  mesh.name = 'mesh_free_' + g.name;

  mesh.position.fromArray(g.position);

  // mesh.userData.ani_value = values;
  // mesh.userData.ani_time = to_array(g.time_stamp);

  return(mesh);

}



function gen_datacube(g, canvas){
  let mesh, group_name;

  // Cube values Must be from 0 to 1, float
  const cube_values = canvas.get_data('datacube_value_'+g.name, g.name, g.group.group_name),
        cube_half_size = canvas.get_data('datacube_half_size_'+g.name, g.name, g.group.group_name),
        volume = {
          'xLength' : cube_half_size[0]*2,
          'yLength' : cube_half_size[1]*2,
          'zLength' : cube_half_size[2]*2
        };

  // If webgl2 is enabled, then we can show 3d texture, otherwise we can only show 3D plane
  if( canvas.has_webgl2 ){
    // Generate 3D texture, to do so, we need to customize shaders

    // 3D texture
    let texture = new THREE.DataTexture3D(
      new Float32Array(cube_values),
      cube_half_size[0]*2,
      cube_half_size[1]*2,
      cube_half_size[2]*2
    );

    texture.minFilter = texture.magFilter = THREE.LinearFilter;

    // Needed to solve error: INVALID_OPERATION: texImage3D: ArrayBufferView not big enough for request
    texture.format = THREE.RedFormat;
    texture.type = THREE.FloatType;
    texture.unpackAlignment = 1;

    texture.needsUpdate = true;

    // Colormap textures, using datauri hard-coded
  	let cmtextures = {
  		viridis: new THREE.TextureLoader().load( "data:;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAABCAIAAAC+O+cgAAAAtUlEQVR42n2Q0W3FMAzEyNNqHaH7j2L1w3ZenDwUMAwedXKA+MMvSqJiiBoiCWqWxKBEXaMZ8Sqs0zcmIv1p2nKwEvpLZMYOe3R4wku+TO7es/O8H+vHlH/KR9zQT8+z8F4531kRe379MIK4oD3v/SP7iplyHTKB5WNPs4AFH3kzO446Y+y6wA4TxqfMXBmzVrtwREY5ZrMY069dxr28Yb+wVjp02QWhSwKFJcHCaGGwTLBIzB9eyYkORwhbNAAAAABJRU5ErkJggg==" ),
  		gray: new THREE.TextureLoader().load( "data:;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAABCAIAAAC+O+cgAAAAEklEQVR42mNkYGBgHAWjYKQCAH7BAv8WAlmwAAAAAElFTkSuQmCC" )
  	};

  	// Material
  	const shader = THREE.VolumeRenderShader1;

  	let uniforms = THREE.UniformsUtils.clone( shader.uniforms );
  	uniforms.u_data.value = texture;
  	uniforms.u_size.value.set( volume.xLength, volume.yLength, volume.zLength );
  	uniforms.u_clim.value.set( 0, 1 );
  	uniforms.u_renderstyle.value = 0; // 0: MIP, 1: ISO
  	uniforms.u_renderthreshold.value = 0.015; // For ISO renderstyle
  	uniforms.u_cmdata.value = cmtextures.gray;

    let material = new THREE.ShaderMaterial( {
  		uniforms: uniforms,
  		vertexShader: shader.vertexShader,
  		fragmentShader: shader.fragmentShader,
  		side: THREE.BackSide // The volume shader uses the backface as its "reference point"
  	} );

  	let geometry = new THREE.BoxBufferGeometry( volume.xLength, volume.yLength, volume.zLength );

  	// TODO: Make sure this translate is correct
  	geometry.translate( volume.xLength / 2 - 0.5, volume.yLength / 2 - 0.5, volume.zLength / 2 - 0.5 );

  	mesh = new THREE.Mesh( geometry, material );
  	mesh.name = 'mesh_datacube_' + g.name;

    mesh.position.fromArray(g.position);
  }

	return(mesh);

}



function gen_particle(g, canvas){
  // har-code texture as base64
  var image = "data:;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAAZiS0dEAAAAAAAA+UO7fwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB9sHDgwCEMBJZu0AAAAdaVRYdENvbW1lbnQAAAAAAENyZWF0ZWQgd2l0aCBHSU1QZC5lBwAABM5JREFUWMO1V0tPG2cUPZ4Hxh6DazIOrjFNqJs0FIMqWFgWQkatsmvVbtggKlSVRVf5AWz4AWz4AUSKEChll19QJYSXkECuhFxsHjEhxCYm+DWGMZ5HF72DJq4bAzFXurI0M/I5997v3u9cC65vTJVn2lX/xHINQOYSBLTLEuIuCWw4Z3IGAEvf6ASmVHjNzHCXBG4A0AjACsAOwEbO0nsFQBnAGYASAIl+ZRMR7SolMEdsByD09fV5R0ZGgg8ePPjW5/N1iqLYpuu6RZblciKR2I9Go69evnwZnZ+fjwI4IS8AKBIRzeQfJWCANwKwh0KhtrGxsYehUOin1tbW+zzP23ietzY2NnIAoGmaLsuyUiqVyvl8XtrY2NiamZn589mzZxsAUgCOAeQAnFI2tI+VxIjaAeDzoaGh7xYWFuZOTk6OZVk+12uYqqq6JEnn0Wg0OT4+/geAXwGEAdwDIFJQXC1wO4DWR48e/RCPxxclSSroVzRFUbSDg4P848ePFwH8DuAhkWih83TRQWxFOXgAwvDwcOfo6OhvXV1d39tsNtuVBwTDWBwOh1UUxVsMw1hXVlbSdCgNV43uYSvrHg6H24aHh38eHBz85TrgF9FYLHA4HLzH43FvbW2d7u/vG+dANp8FpqIlbd3d3V8Fg8EfBUFw4BONZVmL3+9vHhkZCQL4AoAHgJPK8G+yzC0XDofdoVAo5PP5vkadTBAEtr+/39ff3x8gAp/RPOEqx2qjx+NpvXv3bk9DQ0NDvQgwDIOWlhZrMBj8kgi0UJdxRgYMArzL5XJ7vd57qLPZ7Xamp6fnNgBXtQxcjFuHw+Hyer3t9SYgCAITCAScAJoBNNEY/08GOFVVrfVMv7kMNDntFD1vjIAPrlRN0xjckOm6biFQ3jwNPwDMZrOnqVTqfb3Bi8Wivru7W/VCYkwPlKOjo0IikXh7EwQikYgE4Nw0CfXKDCipVCoTj8df3QABbW1tLUc6oUgkFPMkVACUNjc337148eKvw8PDbJ2jP1taWkoCyNDVXDSECmNSK4qiKNLq6urW8+fPI/UicHx8rD59+jSVy+WOAKSJhKENwFItLtoxk8mwsixzHR0dHe3t7c5PAU+n09rs7OzJkydPYqVSaQfANoDXALIk31S2smU1TWMPDg7K5XKZ7+3t9TudTut1U7+wsFCcmJiIpdPpbQBxADsAknQWymYCOukBHYCuKApisdhpMpnURFEU79y503TVyKenpzOTk5M7e3t7MQKPV0Zv1gNm+awB0MvlshqLxfLb29uyJElWURSbXC4XXyvqxcXFs6mpqeTc3Nzu3t7e3wQcA7BPZ8Cov1pNlJplmQtAG8MwHV6v95tAINA5MDBwPxAIuLu6upr8fr/VAN3c3JQjkcjZ+vp6fnl5+d2bN29SuVzuNYAEpf01CdRChUL+X1VskHACuA3Ay3Fcu9vt7nA6nZ7m5uYWQRCaNE3jVVW15PP580KhIGUymWw2m00DOAJwSP4WwPtq4LX2Ao6USxNlQyS/RcQcdLGwlNIz6vEMAaZpNzCk2Pll94LK/cDYimxERiBwG10sxjgvEZBE0UpE6vxj+0Ct5bTaXthgEhRmja8QWNkkPGsuIpfdjpkK+cZUWTC0KredVmtD/gdlSl6EG4AMvQAAAABJRU5ErkJggg==";



  // Usually this is a big particle system
  var geometry = new THREE.BufferGeometry(),
      texture = new THREE.Texture(),
      mesh, group_name;

  texture.image = image;
  texture.repeat.set(3,3);
  texture.wrapS = texture.wrapT = texture.MirroredRepeatWrapping;
  image.onLoad = function(){
    texture.needsUpdate = true;
  };

  if(g.group !== null){
    group_name = g.group.group_name;
  }else{
    group_name = undefined;
  }
  var paricle_location = canvas.get_data('paricle_location', g.name, group_hint = group_name),
      paricle_value = canvas.get_data('paricle_value', g.name, group_hint = group_name);

  // For particles, we use special shader
  var customUniforms = {
		texture:   { value: texture },
	};
	var customAttributes = {
		customColor:   { type: "c", value: [] },
	};
	var colors = [], sizes = [];
	var positions = [];
  var v;


  if(g.paricle_location_cube){
    for(var x in paricle_location.x){
      for(var y in paricle_location.x){
        for(var z in paricle_location.x){
          v = paricle_value[x][y][z];
          let thred = 100;
          // v = (v+128);
          if(v > 50 && Math.abs(x-32)<20 && Math.abs(y-32)<20 && Math.abs(z-32)<20){
            positions.push( paricle_location.x[x], paricle_location.y[y], paricle_location.z[z] );
            colors.push( 0, 0, 0, v * 2 );

            v = (v - thred) / (128-thred) * 2 - 1;
            v = Math.exp(v * 2) / ( 1 + Math.exp(v * 2) );
            v = v * 10;
            sizes.push(v);
          }


        }
      }
    }
    let colorAttribute = new THREE.Uint8BufferAttribute( colors, 4 );
    colorAttribute.normalized = true;

    geometry.addAttribute( 'position', new THREE.Float32BufferAttribute( positions, 3 ) );
		geometry.addAttribute( 'color', colorAttribute );
		geometry.addAttribute( 'size', new THREE.Float32BufferAttribute( sizes, 1 ).setDynamic( true ) );
		geometry.computeBoundingSphere();

		geometry.name = 'geom_particle_' + g.name;

		// let material = new THREE.PointsMaterial( { size: 15, vertexColors: THREE.VertexColors } );
		// mesh = new THREE.Points( geometry, material );

  }else{
    console.debug('TODO: particle system with no cube data');
  }

  var shaderMaterial = new THREE.RawShaderMaterial({
		uniforms: customUniforms,
		// attributes:	customAttributes,
		vertexShader: `

    //varying vec3 vColor;
    //void main() {
    //  vColor = color;
    //	vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
    //	gl_PointSize = size * ( 300.0 / length( mvPosition.z ) );
    //	gl_Position = projectionMatrix * mvPosition;
    //}


    precision mediump float;
		precision mediump int;
		uniform mat4 modelViewMatrix; // optional
		uniform mat4 projectionMatrix; // optional
		attribute vec3 position;
		attribute vec4 color;
		attribute float size;
		varying vec4 vColor;
		void main()	{
			vColor = color;
			vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );

			gl_Position = projectionMatrix * mvPosition;
			gl_PointSize = size * ( 300.0 / length( mvPosition.z ) );
		}



		`,
		fragmentShader: `
    precision mediump float;
		precision mediump int;
		uniform sampler2D texture;
		varying vec4 vColor;
		void main()	{
			gl_FragColor = vec4( vColor ); // * texture2D( texture, gl_PointCoord );
		}
		`,
		//transparent: true, alphaTest: 0.5,  // if having transparency issues, try including: alphaTest: 0.5,
		transparent: true,
		side: THREE.DoubleSide,
		vertexColors: true,
	});

	// shaderMaterial = new THREE.PointsMaterial( { size: 5, vertexColors: THREE.VertexColors, transparent: true } );

	mesh = new THREE.Points( geometry, shaderMaterial );


  mesh.name = 'mesh_particle_' + g.name;

  mesh.position.fromArray(g.position);
  return(mesh);

}

export { THREEBRAIN_CANVAS };
// window.THREEBRAIN_CANVAS = THREEBRAIN_CANVAS;
