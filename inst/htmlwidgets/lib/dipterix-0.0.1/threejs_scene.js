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

function to_dict(x, keys){
  if(typeof(x) !== 'object'){
    x = [x];
  }
  if(x === null){
    return({});
  }
  x = {...x};
  if(keys !== undefined){
    old_keys = Object.keys(x);
    let y = {};

    [...old_keys.keys()].forEach((ii) => {y[keys[ii]] = x[old_keys[ii]]});

    x = y;
  }

  return(x);
}

function to_array(x){
  if(typeof(x) !== 'object'){
    x = [x];
  }else{
    if(x === null){
      return([]);
    }
    if(!Array.isArray(x)){
      x = Object.values(x);
    }
  }
  return(x);
}

class THREEBRAIN_CANVAS {
  constructor(el, width, height, side_width = 250, DEBUG = false) {

    if(DEBUG){
      console.debug('Debug Mode: ON.');
      this.DEBUG = true;
    }else{
      this.DEBUG = false;
    }

    this.mesh = {};
    this.group = {};
    this.clickable = {}
    this.render_flag = true;
    this.disable_raycast = true;


    // General scene. Two scenes for double-buffer (depth information)
    this.scene = new THREE.Scene();
    this.scene2 = new THREE.Scene();
    this.scene_legend = new THREE.Scene();

    // Main camera
    this.main_camera = new THREE.OrthographicCamera( -150, 150, height / width * 150, -height / width * 150, 1, 10000 );
		this.main_camera.position.z = 500;
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
  	this.main_renderer = new THREE.WebGLRenderer( { antialias: false, alpha: true } );
  	this.main_renderer.setPixelRatio( window.devicePixelRatio );
  	this.main_renderer.setSize( width, height );
  	this.main_renderer.autoClear = false; // Manual update so that it can render two scenes
  	this.main_renderer.localClippingEnabled=true; // Enable clipping

  	// sidebar renderer (multiple renderers)
  	this.side_renderer = new THREE.WebGLRenderer( { antialias: false, alpha: true } );
  	this.side_renderer.setPixelRatio( window.devicePixelRatio );
  	this.side_renderer.autoClear = false; // Manual update so that it can render two scenes
  	// this.side_renderer.setSize( width, height ); This step is set dynamically when sidebar cameras are inserted

    /* Use R plots instead
  	// legend renderer to this.scene_legend
  	this.legend_renderer = new THREE.WebGLRenderer( { antialias: false, alpha: true } );
  	this.legend_renderer.setPixelRatio( window.devicePixelRatio );
  	this.legend_renderer.setSize( 300, 200 );

  	// legend camera
  	this.legend_camera = new THREE.OrthographicCamera( -3, 3, 2, -2, 1, 100 );
  	this.legend_camera.layers.set(1);
  	this.legend_camera.position.z = 10;
  	this.legend_camera.aspect = 3/2;
  	this.legend_camera.updateProjectionMatrix();

  	this.scene_legend.add( new THREE.AmbientLight( 0x808080 ) );
  	this.scene_legend.add( this.legend_camera );

    this.legend_renderer.domElement.style.pointerEvents = 'none';
  	el_legend.appendChild( this.legend_renderer.domElement );
    this.el_legend = el_legend;
  	// this.legend_renderer.render( this.scene_legend, this.legend_camera );
    */


    // Main canvas
    // Generate inner canvas DOM element
    this.side_canvas = document.createElement('div');
    this.side_canvas.className = 'THREEBRAIN-SIDE-CANVAS';
    this.side_canvas.style.width = '100%';
    this.side_canvas.style.height = '0px';
    this.side_canvas.style.margin = '0px';
    this.side_canvas.style.padding = '0px';
    this.side_canvas.style.display = 'none';
    this.side_canvas.style.overflowY = 'scroll';
    this.side_renderer.domElement.style.margin = 'auto';
    this.side_canvas.appendChild( this.side_renderer.domElement );

    this.side_divider = document.createElement('div');
    this.side_divider.className = 'THREEBRAIN-SIDE-DIVIDER';
    this.side_divider.innerHTML = '<span style="width:5px;">.</span>';
    this.side_divider.draggable=true;
    this.side_divider.ondragend = (evt) => {
      this.side_width_fixed =  evt.clientX + 5;
      this.handle_resize();
    };
    this.side_canvas.appendChild( this.side_divider );

    this.main_canvas = document.createElement('div');
    this.main_canvas.className = 'THREEBRAIN-MAIN-CANVAS';
    this.main_canvas.style.width = width + 'px';
    // register mouse events to save time from fetching from DOM elements
    this.register_main_canvas_events();

    this.main_canvas.appendChild( this.main_renderer.domElement );

    let wrapper_canvas = document.createElement('div');
    this.wrapper_canvas = wrapper_canvas;
    // this.side_canvas.style.display = 'inline-flex';
    this.main_canvas.style.display = 'inline-flex';
    this.wrapper_canvas.style.display = 'flex';
    this.wrapper_canvas.style.flexWrap = 'wrap';
    this.wrapper_canvas.style.width = '100%';

    // Add canvas t
    wrapper_canvas.appendChild( this.side_canvas );
    wrapper_canvas.appendChild( this.main_canvas );
    el.appendChild( wrapper_canvas );

    // if DEBUG, add stats information
    // Stats
    if(DEBUG){
      this.has_stats = true;
      this.stats = new Stats();
      this.stats.domElement.style.display = 'block';
      this.stats.domElement.style.position = 'absolute';
      this.stats.domElement.style.top = '0';
      this.stats.domElement.style.left = '0';
      el.appendChild( this.stats.domElement );
    }else{
      this.has_stats = false;
    }







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




  	// Side cameras

    this.side_cameras = [
      new THREE.OrthographicCamera( side_width / - 2, side_width / 2, side_width / 2, side_width / - 2, 1, 10000 ),
      new THREE.OrthographicCamera( side_width / - 2, side_width / 2, side_width / 2, side_width / - 2, 1, 10000 ),
      new THREE.OrthographicCamera( side_width / - 2, side_width / 2, side_width / 2, side_width / - 2, 1, 10000 ),
      new THREE.OrthographicCamera( side_width / - 2, side_width / 2, side_width / 2, side_width / - 2, 1, 10000 )
    ];

    this.side_cameras[0].position.fromArray( [-100, 0, 0] );
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
      })

      let side_light = new THREE.DirectionalLight( 0xefefef, 0.5 ),
          pos = [0,0,0];
      if(ii == 0){
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
		} );


		// File loader
    this.loader_triggered = false;
    this.loader_manager = new THREE.LoadingManager();
    this.loader_manager.onStart = () => {
      this.loader_triggered = true
      console.debug( 'Loading start!')
    };
    this.loader_manager.onLoad = () => { console.debug( 'Loading complete!') };
    this.loader_manager.onProgress = ( url, itemsLoaded, itemsTotal ) => {
    	console.debug( 'Loading file: ' + url + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.' );
    };
    this.loader_manager.onError = function ( url ) { console.debug( 'There was an error loading ' + url ) };

    this.json_loader = new THREE.FileLoader( this.loader_manager );

  }

  register_main_canvas_events(){
    this.main_canvas.addEventListener( 'dblclick', (event) => { // Use => to create flexible access to this
      if(this.mouse_event !== undefined && this.mouse_event.level > 1){
        return(null);
      }
      this.mouse_event = {
        'action' : 'dblclick',
        'event' : event,
        'dispose' : false,
        'level' : 1
      };
    }, false );

    this.main_canvas.addEventListener( 'click', (event) => { // Use => to create flexible access to this
      if(this.mouse_event !== undefined && this.mouse_event.level > 1){
        return(null);
      }
      this.mouse_event = {
        'action' : 'click',
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

  _fast_raycast(clickable_only, max_search = 500){

    this.use_octree = true;

    // Use octree to speed up
    var items = [];

    this.mouse_raycaster.setFromCamera( this.mouse_pointer, this.main_camera );

    if(clickable_only){
      let raycaster = this.mouse_raycaster;
      let octreeObjects = this.octree.search( raycaster.ray.origin, raycaster.ray.far, true, raycaster.ray.direction );
      items = raycaster.intersectOctreeObjects( octreeObjects );
    }else{
      if(this.DEBUG){
        console.debug('Searching for all intersections - Partial searching')
      }

      // We need to filter out meshes
      // 1. invisible
      // 2. layers > 20
      // 3. not intersect with ray on the boxes

      // First step, intersect with boxes
      let target_object = undefined,
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

  // method to target object with mouse pointed at
  target_mouse_helper(){

    if(this._mouse_helper_sleep_count++ < 2 || this.mouse_event === undefined || this.mouse_event.dispose || false){
      return(null)
    }else{
      this._mouse_helper_sleep_count = 0
    }

    if(this.disable_raycast && (
      this.mouse_event.action != 'dblclick' &&
      this.mouse_event.action != 'click'
    )){
      return(null);
    }

    const clickable_only = this.mouse_event.action != 'dblclick';

    this.mouse_event.dispose = true;
    if(this.mouse_event.level < 2){
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
        direction.applyMatrix3(new THREE.Matrix3().set(-1,0,0,0,-1,0,0,0,-1))
      }


      if(this.DEBUG && ['dblclick', 'click'].includes(this.mouse_event.action)){
        console.debug('object selected ' + target_object.name);
      }
      if(['dblclick', 'click'].includes(this.mouse_event.action)){
        this.object_chosen = target_object;
        if(this._mouse_click_callback !== undefined){
          this._mouse_click_callback(target_object);
        }
      }

      this.mouse_helper.position.fromArray( to_array(from) );
      this.mouse_helper.setDirection(direction);
      this.mouse_helper.visible = true;
    }else{
      this.mouse_helper.visible = false;
    }

  }

  /*
  set_legend_visibility(v=false){
    if(v){
      this.legend_camera.layers.set(1);
      this.el_legend.style.display = 'block';
    }else{
      this.legend_camera.layers.set(31);
      this.el_legend.style.display = 'none';
    }
    this.legend_camera.updateProjectionMatrix();
    this.legend_renderer.render( this.scene_legend, this.legend_camera );
  }
  */


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
    })

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
      position : { x: -1, y: 0, z: 0 },
      //dimensions : { width: 0.2, height: 1.6 }
    });
    this.legend.layers.set(1);
    this.legend_group.add(this.legend);

    this.legend.geometry.computeBoundingBox();


    this.legend_labels = this.lut.setLegendLabels( label_args );

    //labels = lut.setLegendLabels( { 'title': 'Pressure', 'um': 'Pa', 'ticks': 5 } );
    this.legend_labels[ 'title' ].layers.set(1);
    this.legend_group.add( this.legend_labels[ 'title' ] );


  	for ( var i = 0; i < Object.keys( this.legend_labels[ 'ticks' ] ).length; i ++ ) {
  	  this.legend_labels[ 'ticks' ][ i ].layers.set(1);
  	  this.legend_labels[ 'ticks' ][ i ].position.y += 0.05;
  	  this.legend_group.add( this.legend_labels[ 'ticks' ][ i ] );

  		this.legend_labels[ 'lines' ][ i ].layers.set(1);
  		this.legend_group.add( this.legend_labels[ 'lines' ][ i ] );
  	}


    this.legend_renderer.render( this.scene_legend, this.legend_camera );
    // canvas.legend_renderer.render( canvas.scene_legend, canvas.legend_camera );
    */
  }

  get_color(v){
    if(this._colormap === undefined){
      return('#e2e2e2');
    }else{
      let color_index = Math.floor((v - this._colorshift) * this._colorscale);
      if(color_index < 0) {
        color_index = 0;
      }
      if(color_index > this._colormap.length-1){
        color_index = this._colormap.length-1;
      }
      return(this._colormap[color_index]);
    }
  }


  handle_resize(width, height){

    // console.debug('width: ' + width + '; height: ' + height);
    if(width === undefined){
      width = this.client_width;
      height = this.client_height;
    }else{
      this.client_width = width;
      this.client_height = height;
    }

    var main_width = width,
        main_height = height,
        side_width;


    /*
    this.side_canvas.style.display = 'block';
    this.main_canvas.style.display = 'block';
    this.wrapper_canvas.style.display = 'block';
    */

    // Check if side_camera exists
    if(!this.has_side_cameras){
      this.side_canvas.style.display = 'none';
    }else{
      this.side_canvas.style.display = 'inline-flex';

      this.side_scene = 'vertical';
      side_width = this.side_width_fixed || Math.floor(height / 4);
      main_width = width - side_width - 6;

      this.side_canvas.style.height = height + 'px';
      this.side_divider.style.minHeight = height + 'px';
      this.side_divider.style.height = side_width * 4 + 'px';
      this.side_canvas.style.width = (side_width+5) + 'px';

      this.side_renderer.setSize( side_width , 4 * side_width );

      /* Dipterix thinks this is a good idea but not for science
      if(width / 16 * 9 >= height){
        this.side_scene = 'square';

        side_width = Math.floor(height / 2);
        main_width = width - 2 * side_width - 1;
        this.side_canvas.style.height = height + 'px';
        this.side_canvas.style.width = side_width * 2 + 'px';

        this.side_renderer.setSize( 2 * side_width , 2 * side_width );

      }else if(width / 3 * 2 >= height){
        // wide screen

        this.side_scene = 'vertical';
        side_width = Math.floor(height / 4);
        main_width = width - side_width - 1;

        this.side_canvas.style.height = height + 'px';
        this.side_canvas.style.width = side_width + 'px';

        this.side_renderer.setSize( side_width , 4 * side_width );

      }else{

        this.side_scene = 'horizontal';
        side_width = Math.min(height * 0.27, 350, width / 4);
        side_width = Math.floor(side_width);
        main_height = height - side_width;

        this.side_canvas.style.height = side_width + 'px';
        this.side_canvas.style.width = (main_width-1) + 'px';

        this.side_renderer.setSize( 4 * side_width , side_width );

      }
      */

      this.side_width = side_width;

      // let half_width = side_width / 2;

      /*
      for(var ii = 0; ii < 4; ii++ ){
        this.side_cameras[ii].left = half_width;
        this.side_cameras[ii].right = half_width;
        this.side_cameras[ii].top = half_width;
        this.side_cameras[ii].bottom = half_width;
      }
      */


      //side_renderer.setClearColor( renderer_colors[1] );
    }

    this.main_canvas.style.width = main_width + 'px';
    this.main_canvas.style.height = main_height + 'px';
    this.main_camera.left = -150;
	  this.main_camera.right = 150;
	  this.main_camera.top = main_height / main_width * 150;
	  this.main_camera.bottom = -main_height / main_width * 150;
    this.main_camera.updateProjectionMatrix();

    this.main_renderer.setSize( main_width, main_height );

    this.controls.handleResize();

    // this.render();


  }

  update_control_center( v ){
    this.control_center = to_array( v );
    this.controls.target.fromArray( v );
  }
  reset_controls(){
	  // reset will erase target, manually reset target
	  // let target = this.controls.target.toArray();
		this.controls.reset();
		this.controls.target.fromArray( this.control_center );
		// this.main_camera.position.set(0 , 0 , 500);
	}
  update(){

    if(this.render_flag !== true){
      return(undefined);
    }

    this.render();

    if(this.use_octree){
      this.octree.update();
    }


    this.get_mouse();
    this.controls.update();
    if(this.has_stats){
      this.stats.update();
    }
    try {
      this.target_mouse_helper();
    } catch (e) {
      if(this.DEBUG){
        console.error(e);
      }
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
      var side_width = this.side_width;

      if(this.side_scene === undefined){
        return(null);
      }

      for(var ii = 0; ii < 4; ii++ ){
        var x, y;
        if(this.side_scene === 'square'){
          x = ii % 2;
          y = (ii - x) / 2;
        }else if(this.side_scene === 'vertical'){
          x = 0;
          y = ii
        }else{
          x = ii;
          y = 0
        }

        this.side_renderer.setViewport( x * side_width, y * side_width, side_width, side_width );
        this.side_renderer.setScissor( x * side_width, y * side_width, side_width, side_width );
        this.side_renderer.setScissorTest( true );
        this.side_renderer.clear();
        this.side_renderer.render( this.scene, this.side_cameras[ii] );
        this.side_renderer.clearDepth();
        this.side_renderer.render( this.scene2, this.side_cameras[ii] );

      }



    }

  }

  animate(){
		requestAnimationFrame( this.animate.bind(this) );
		this.update();
	}


	enable_side_cameras(){
	  // Add side renderers to the element
	  this.has_side_cameras = true;
	  this.handle_resize();
	}
	disable_side_cameras(force = false){
	  this.side_canvas.style.display = 'none';
	  this.has_side_cameras = false;
	  this.handle_resize();
	}



  // Function to clear all meshes
  clear_all(){
    for(var i in this.mesh){
      this.scene.remove(this.mesh[i]);
    }
    for(var i in this.group){
      this.scene.remove(this.group[i]);
    }
    this.mesh = {};
    this.group = {};
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
      })
      console.debug(g.name + ' is enabled layer ' + ii);
    }else if(layers.length == 0 || layers[0] > 20){
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
      if(m.isMesh || false){
        this.octree.add( m, { useFaces: false } );
      }
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
    this.loader_triggered = true;
    this.json_loader.load( path, onLoad );
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
          let path = 'lib/' + cache_folder + '-0/' + g.cache_name + '/' + cache_info.file_name;
          if(HTMLWidgets.shinyMode){
            path = cache_folder + '-0/' + g.cache_name + '/' + cache_info.file_name;
          }



          this.load_file(
            path, ( v ) => {

              if(typeof(v) === 'string'){
                v = JSON.parse(v);
              }
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
      return(item_size == 0);
    }

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



}




function gen_sphere(g, canvas){
  var gb = new THREE.SphereBufferGeometry(
        radius = g.radius,
        widthSegments = g.width_segments,
        heightSegments = g.height_segments
      ),
      values = to_array(g.value),
      material;
  gb.name = 'geom_sphere_' + g.name;

  // Make material based on value
  if(values.length == 0){
    material = new THREE.MeshLambertMaterial({ 'transparent' : true });
  }else{
    // Use the first value
    material = new THREE.MeshBasicMaterial({ 'transparent' : true });
  }

  let mesh = new THREE.Mesh(gb, material);
  mesh.name = 'mesh_sphere_' + g.name;

  let linked = false
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
  })

  faces.forEach((v) => {
    face_orders.push(v[0], v[1], v[2]);
  })

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
  }

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

