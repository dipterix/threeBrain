/**
 * @Author: Zhengjia Wang
 * Adapter of model (threejs_scene) and viewer (htmlwidgets)
 */
import { download } from './js/download.js';
import { WEBGL } from './js/WebGL.js';
import * as THREE from './build/three.module.js';
import { THREEBRAIN_CONTROL } from './js/core/gui_wrapper.js';
import { THREEBRAIN_PRESETS } from './js/core/data_controls.js';
import { THREE_BRAIN_SHINY } from './js/shiny_tools.js';
import { THREEBRAIN_CANVAS } from './js/threejs_scene.js';
import { THREEBRAIN_STORAGE } from './js/threebrain_cache.js';
import { CONSTANTS } from './js/constants.js';
// import { invertColor, padZero, to_array } from './js/utils.js';
import { padZero, to_array, get_element_size, get_or_default } from './js/utils.js';
// import { D3Canvas } from './js/Math/sparkles.js';
// import { CCWebMEncoder } from './js/capture/CCWebMEncoder.js';
// import { CCanvasRecorder } from './js/capture/CCanvasRecorder.js';
import { json2csv } from 'json-2-csv';
import { Lut, ColorMapKeywords } from './js/jsm/math/Lut2.js';

window.THREEBRAIN = {
  Lut : Lut,
  ColorMapKeywords : ColorMapKeywords
};

const utils_toolbox = {
  'padZero' : padZero,
  'to_array' : to_array,
  'get_element_size' : get_element_size,
  'get_or_default' : get_or_default,
  'json2csv' : json2csv,
  'download' : download,
  'CONSTANTS' : CONSTANTS
};

class BrainCanvas{
  constructor(el, width, height, shiny_mode = false, viewer_mode = false,
    cache = false, DEBUG = true){
    // Make sure to resize widget in the viewer model because its parent element is absolute in position and setting height, width to 100% won't work.
    this.el = el;
    if(viewer_mode){
      this.el.style.height = '100vh';
      this.el.style.width = '100vw';
    }

    // --------------------- Assign class attribute ----------------------
    this.shiny_mode = shiny_mode;
    this.DEBUG = DEBUG;
    this.outputId = this.el.getAttribute( 'data-target' );
    // this.outputId = this.el.getAttribute('id');

    this.has_webgl = false;

    // ---------------------------- Utils ----------------------------
    // 0. Check WebGL
    this.check_webgl();

    // 1. HTML layout:
    // Create control panel
    this.el_side = document.createElement('div');
    this.el_side.style.maxHeight = height + 'px';
    // this.el_side.style.height = height + 'px';
    this.el_side.setAttribute('class', 'threejs-control');
    this.el.appendChild( this.el_side );

    // Control panel has three parts:
    // 1. data gui - auto
    // 2. text info - auto
    // 3. legend info - auto
    this.el_control = document.createElement('div');
    this.gui_placeholder = document.createElement('div');
    this.el_control.style.width = '100%';
    this.el_control.appendChild( this.gui_placeholder );
    this.el_side.appendChild( this.el_control );

    // this.el_legend = document.createElement('div');
    // this.el_legend_img = document.createElement('img');
    // this.el_legend.style.width = '100px';
    // this.el_legend.style.display = 'none';
    // this.el_legend.style.pointerEvents = 'none';
    // this.el_legend.style.padding = '10px';
    // this.el_legend.style.backgroundColor = 'rgba(255,255,255,0.2)';

    this.el_text = document.createElement('div');
    this.el_text.style.width = '100%';
    this.el_text.style.padding = '10px';

    //this.el_text2 = document.createElement('svg');
    //this.el_text2.style.width = '200px';
    //this.el_text2.style.padding = '10px';
    this.el_side.appendChild( this.el_text );

    // 3. initialize threejs scene
    this.canvas = new THREEBRAIN_CANVAS(
      this.el, width, height, 250,
      this.shiny_mode, cache, this.DEBUG, this.has_webgl2);

    // this.shiny = new THREE_BRAIN_SHINY( this.outputId, this.canvas, this.shiny_mode );


    // 4. Animation, but do not render;
    this.canvas.animate();

  }


  check_webgl(){
    this.has_webgl = false;
    this.has_webgl2 = false;

    if ( WEBGL.isWebGLAvailable() === false ) {
			this.el.appendChild( WEBGL.getWebGLErrorMessage() );
		}else{
		  this.has_webgl = true;
		  // Check webgl2
		  if ( WEBGL.isWebGL2Available() === false ) {
  			console.warn('WebGL2 is disabled in this browser, some features might be affected. Force using WebGL instead.');
  		}else{
  		  this.has_webgl2 = true;
  		}
		}
  }

  resize_widget(width, height){
    if( width <= 0 || height <= 0 ){
      // Do nothing! as the canvas is usually invisible
      return(null);
    }
    // console.debug( this.outputId + ' - Resize to ' + width + ' x ' + height );
    this.el_side.style.maxHeight = height + 'px';
    if( this.hide_controls || !this.control_display ){
      this.canvas.handle_resize(width, height);
    }else{
      this.canvas.handle_resize(width - 300, height);
    }
    if( this._reset_flag ){
      this._reset_flag = false;
      this.canvas.reset_side_canvas();
    }
    this.canvas.start_animation(0);
  }

  _register_gui_control(){

    if( this.gui ){ try { this.gui.dispose(); } catch (e) {} }

    const gui = new THREEBRAIN_CONTROL({
      autoPlace: false,
    }, this.DEBUG);
    if(this.DEBUG){
      window.gui = gui;
    }
    this.gui = gui;
    // --------------- Register GUI controller ---------------
    // Set default on close handler
    this.gui.set_closeHandler( (evt) => {
      this.control_display = !this.gui.closed;
      this.resize_widget( this.el.clientWidth, this.el.clientHeight );
    });

    // Set side bar
    if(this.settings.hide_controls || false){
      this.hide_controls = true;
      this.gui.close();
      // gui.domElement.style.display = 'none';
    }else{
      // gui.domElement.style.display = 'block';
      const placeholder = this.el_control.firstChild;
      this.el_control.replaceChild( this.gui.domElement, placeholder );
      this.hide_controls = false;
    }

    // Add listeners
    const control_presets = this.settings.control_presets;
    const presets = new THREEBRAIN_PRESETS( this.canvas, this.gui, this.settings, this.shiny );
    this.presets = presets;
    if(this.DEBUG){
      window.presets = presets;
    }else{
      window.__presets = presets;
    }



    // ---------------------------- Defaults
    presets.c_background();

    // ---------------------------- Main, side canvas settings is on top
    // this.gui.add_folder('Main Canvas').open();
    presets.c_recorder();
    presets.c_reset_camera();
    presets.c_main_camera_position();
    presets.c_toggle_anchor();
    /*
    this.gui.add_item('Free Controls', () => {
      _camera_pos.setValue( '[free rotate]' );
      this.canvas.controls.enabled = true;
    }, {folder_name: 'Main Canvas'});
    */

    // ---------------------------- Side cameras
    if( this.settings.side_camera ){
      // this.gui.add_folder('Side Canvas').open();
      presets.c_toggle_side_panel();
      presets.c_reset_side_panel();
      presets.c_side_depth();
      presets.c_side_electrode_dist();
    }

    // ---------------------------- Presets
    let _ani_control_registered = false;
    to_array( control_presets ).forEach((control_preset) => {

      try {
        presets['c_' + control_preset]();
        if( control_preset === 'animation' ){
          _ani_control_registered = true;
        }
      } catch (e) {
        if(this.DEBUG){
          console.warn(e);
        }
      }
    });
    if( !_ani_control_registered ){
      presets.c_animation();
    }


    return(gui);

  }

  _set_loader_callbacks( callback ){
    this.canvas.loader_manager.onLoad = () => {
      this.finalize_render( callback );
    };

    this.el_text.style.display = 'block';

    this.canvas.loader_manager.onProgress = ( url, itemsLoaded, itemsTotal ) => {

    	let path = /\/([^/]*)$/.exec(url)[1],
    	    msg = '<p><small>Loaded file: ' + itemsLoaded + ' of ' + itemsTotal + ' files.<br>' + path + '</small></p>';

      if(this.DEBUG){
        console.debug(msg);
      }

      this.el_text.innerHTML = msg;

    };
  }


  render_value( x, reset = false, callback = undefined ){
    this.geoms = x.geoms;
    this.settings = x.settings;
    this.default_controllers = x.settings.default_controllers || {},
    this.groups = x.groups,
    this.has_animation = x.settings.has_animation,
    this.DEBUG = x.settings.debug || false;

    this.canvas.DEBUG = this.DEBUG;
    this.canvas.__reset_flag = reset === true;
    this.shiny.set_token( this.settings.token );

    if(this.DEBUG){
      window.__ctrller = this;
      window.groups = this.groups;
      window.geoms = this.geoms;
      window.settings = this.settings;
      window.canvas = this.canvas;
      window.scene = this.canvas.scene; // chrome debugger seems to need this
      this.canvas._add_stats();
    }else{
      window.__ctrller = this;
      window.__groups = this.groups;
      window.__geoms = this.geoms;
      window.__settings = this.settings;
      window.__canvas = this.canvas;
    }

    // Generate legend first

    const make_sequence = function(arr, len, contain_zero = true){
      let re = Array(len).fill(0).map((v, i) => { return arr[0] + i * (arr[1] - arr[0]) / (len - 1) });
      if ( contain_zero && !(0 in re) ){
        re.push(0);
      }
      return(re);
    };

    this.canvas.pause_animation(9999);
    this.canvas.clear_all();

    to_array( this.settings.color_maps ).forEach((v) => {
      // calculate cmap, add time range so that the last value is always displayed
      // let tr = v.time_range;
      this.canvas.add_colormap(
        v.name,
        v.alias,
        v.value_type,
        v.value_names,
        v.value_range,
        v.time_range,
        v.color_keys,
        v.color_vals,
        v.color_levels,
        v.hard_range
      );
    });


    // load data
    this.canvas.loader_triggered = false;

    // Register some callbacks
    this._set_loader_callbacks( callback );

    let promises = this.groups.map( (g) => {
      return(new Promise( (resolve) => {
        this.canvas.add_group(g, this.settings.cache_folder);
        resolve( true );
      }));
    });

    Promise.all(promises).then((values) => {
      if( !this.canvas.loader_triggered ){
        this.finalize_render( callback );
      }
    });

    /*
    this.groups.forEach((g) => {

      this.canvas.add_group(g, this.settings.cache_folder);

    });

    // Make sure the data loading process is on
    if( !this.canvas.loader_triggered ){
      this.finalize_render();
    }
    */
  }


  finalize_render( callback ){
    console.debug(this.outputId + ' - Finished loading. Adding object');
    // this.el_text2.innerHTML = '';
    this.el_text.style.display = 'none';

    this.geoms.sort((a, b) => {
      return( a.render_order - b.render_order );
    });

    this.geoms.forEach((g) => {
      if( this.DEBUG ){
        this.canvas.add_object( g );
      }else{
        try {
          this.canvas.add_object( g );
        } catch (e) {
          console.warn(e);
        }
      }
    });

    this.canvas.finish_init();

    let display_controllers = this.control_display;

    this._register_gui_control();
    this.shiny.register_gui( this.gui, this.presets );



    /* Update camera. If we set camera position, then shiny will behave weird and we have to
    * reset camera every time. To solve this problem, we only reset zoom level
    *
    * this is the line that causes the problem
    */
    // this.canvas.reset_main_camera( this.settings.camera_pos , this.settings.start_zoom );
    this.canvas.reset_main_camera( undefined , this.settings.start_zoom );
    this.canvas.set_font_size( this.settings.font_magnification || 1 );

    // Add/remove axis anchor
    let coords = to_array(this.settings.coords);
    if(coords.length === 3){
      this.canvas.draw_axis( coords[0], coords[1], coords[2] );
    }else{
      this.canvas.draw_axis( 0, 0, 0 );
    }

    // Compile everything
    this.canvas.main_renderer.compile( this.canvas.scene, this.canvas.main_camera );

    // Set side camera
    if(this.settings.side_camera || false){

      // Set canvas zoom-in level
      this.canvas.side_canvas.coronal.set_zoom_level( this.settings.side_canvas_zoom || 1 );
      this.canvas.side_canvas.axial.set_zoom_level( this.settings.side_canvas_zoom || 1 );
      this.canvas.side_canvas.sagittal.set_zoom_level( this.settings.side_canvas_zoom || 1 );

      this.canvas.side_renderer.compile( this.canvas.scene, this.canvas.side_canvas.coronal.camera );
      this.canvas.side_renderer.compile( this.canvas.scene, this.canvas.side_canvas.axial.camera );
      this.canvas.side_renderer.compile( this.canvas.scene, this.canvas.side_canvas.sagittal.camera );

      if( this.settings.side_display || false ){
        this.canvas.enable_side_cameras();
        // reset so that the size is displayed correctly
        this._reset_flag = true;
      }else{
        this.canvas.disable_side_cameras();
      }

    }else{
      this.canvas.disable_side_cameras();
    }

    // Force render canvas
    // Resize widget in case control panel is hidden

    if( !this.shiny_mode || display_controllers === undefined ){
      display_controllers = this.settings.control_display;
    }

    if( !this.hide_controls ){
      // controller is displayed
      if( display_controllers ){
        this.gui.open();
      } else {
        this.gui.close();
      }
    }

    /*
    this.hide_controls = this.settings.hide_controls || false;
    if( !this.hide_controls && !this.settings.control_display ){
      this.gui.close();
    }
    */
    this.resize_widget( this.el.clientWidth, this.el.clientHeight );

    // remember last settings
    if( this.gui ){
      this.presets.update_self();
      this.gui.remember( this.default_controllers );
    }

    this.canvas.render();

    this.canvas.start_animation(0);

    if( typeof( callback ) === 'function' ){
      try {
        callback();
      } catch (e) {
        console.warn(e);
      }
    }

    // canvas is ready. set flag
    this.canvas.ready = true;

    // run customized js code
    if( this.settings.custom_javascript &&
        this.settings.custom_javascript !== ''){

      if( this.canvas.DEBUG ){
        console.debug("[threeBrain]: Executing customized js code:\n"+this.settings.custom_javascript);
      }

      const _f = (groups, geoms, settings, scene,
        canvas, gui, presets, shiny, tools
      ) => {
        try {
          eval( this.settings.custom_javascript );
        } catch (e) {
          console.warn(e);
        }
      };

      _f( this.groups, this.geoms, this.settings, this.scene,
          this.canvas, this.gui, this.presets, this.shiny, utils_toolbox );

    }
  }
}

class BrainWidgetWrapper {

  constructor(el, cache = false){

    this._container = undefined;
    if( cache === true ){
      this.cache = window.global_cache || new THREEBRAIN_STORAGE();
    } else {
      this.cache = cache;
    }

    this.element_id = el.getAttribute('id');
    this.cache_id = '__THREE_CANVAS_' + this.element_id;
    this.initialized = false;

    // Add class to el to make it display: flex
    this.el = el;
    this.el.classList.add('threejs-brain-container');

    this.handler = undefined;

  }

  initialize (width, height) {

    if(this.cache){
      this.handler = this.cache.get_item(this.cache_id, undefined);
    }

    if( this.handler ){
      console.log('Found previous handler, re-use it.');

      this._container = this.handler.el;

      // remove inner html of el
      this.el.onclick = undefined;
      this.el.innerHTML = '';
      this.el.classList.remove("threejs-brain-blank-container");

      this.el.appendChild( this._container );

      // Make sure the canvas is resized
      console.log(`Reusing previous 3D handler with dimension: ${width} x ${height}`);
      this.handler.resize_widget(width, height);

      this.initalized = true;
    } else {

      this.initalized = false;
      this._container = document.createElement('div');
      this._container.classList.add( 'threejs-brain-canvas' );
      this._container.setAttribute( 'data-target', this.element_id );

      this.addModal();
      this.el.onclick = () => {
        const modal = this.el.getElementsByClassName("threejs-brain-modal");
        if( modal.length ){
          modal[0].innerText = "";
          const loader = document.createElement("div");
          loader.classList.add("threejs-brain-loader");
          modal[0].appendChild( loader );
          this.el.classList.remove("threejs-brain-blank-container");
        }

        this.el.onclick = undefined;
        this.el.innerHTML = '';
        this.el.classList.remove("threejs-brain-blank-container");
        this.el.appendChild( this._container );

        let _w = width, _h = height;
        if(_w <= 10 || _h <= 10) {
          _w = this._container.clientWidth;
          _h = this._container.clientHeight;
        }
        console.log(`Creating new 3D handler with dimension: ${_w} x ${_h}`);
        this.handler = new BrainCanvas(

          // Element to store 3D viewer
          this._container,

          // dimension of the viewer
          _w, _h,

          // Different sizing policy, as well as callbacks
          HTMLWidgets.shinyMode, HTMLWidgets.viewerMode,

          // use cache? true, false, or the cache object
          this.cache,

          // DEBUG mode?
          false
        );
        this.handler.shiny = new THREE_BRAIN_SHINY( this, HTMLWidgets.shinyMode );

        if(this.cache){
          this.cache.set_item(this.cache_id, this.handler);
        }

        this.initalized = true;
        if( this.values !== undefined ){
          this.render( this.values, true );
        }
      };

    }

  }

  render(v, reset = false, callback = undefined) {
    // read
    const xobj = new XMLHttpRequest();
    // path = 'lib/' + cache_folder + '-0/' + g.cache_name + '/' + cache_info.file_name;
    // lib/threebrain_data-0/config.json
    let path = v.settings.cache_folder + v.data_filename;

    console.debug( 'Reading configuration file from: ' + path );

    xobj.overrideMimeType("application/json");

    const cb_ = () => {
      if(typeof (callback) === "function"){
        callback();
      }
      const modal = this.el.getElementsByClassName("threejs-brain-modal");
      if( modal.length ){
        modal[0].classList.add("hidden");
      }
    };

    xobj.onreadystatechange = () => {
      if (xobj.readyState == 4 && xobj.status == "200") {
        new Promise( () => {
          let x = JSON.parse(xobj.responseText);
          x.settings = v.settings;
          this.handler.render_value( x, reset, cb_ );
        });
      }
    };
    xobj.open('GET', path, true);
    xobj.send(null);
  }

  resize(width, height) {
    if( this.handler ){
      this.handler.resize_widget( width, height );
    }
  }

  addModal(){
    this.el.classList.add("threejs-brain-blank-container");
    const modal = document.createElement("div");
    modal.classList.add("threejs-brain-modal");
    // check webgl2 availability
    modal.innerText = "Click me to load 3D viewer.";
    if ( window._WEBGL ){
      try {
        if(!window._WEBGL.isWebGL2Available()){
          modal.innerHTML = "It seems your browser does not support WebGL2. <br />Please use Chrome for full support. <br /><br /> Click me to load 3D viewer anyway.";
        }
      } catch (e) {}
    }

    this.el.innerHTML = "";
    this.el.appendChild( modal );
  }

}


window.BrainWidgetWrapper = BrainWidgetWrapper;
window.BrainCanvas = BrainCanvas;
window.THREE = THREE;
window._WEBGL = WEBGL;
window.download = download;
window.THREEBRAIN_STORAGE = THREEBRAIN_STORAGE;
export { BrainCanvas };
