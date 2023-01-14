/**
 * @Author: Zhengjia Wang
 * Adapter of model (threejs_scene) and viewer (htmlwidgets)
 */
import { MathUtils } from 'three';
import { WebGL } from './js/jsm/capabilities/WebGL.js'
import { download } from './js/download.js';
import * as THREE from 'three';
import { EnhancedGUI } from './js/core/EnhancedGUI.js';
import { ViewerControlCenter } from './js/core/ViewerControlCenter.js';
import { CanvasEvent } from './js/core/events.js';
import { THREE_BRAIN_SHINY } from './js/shiny_tools.js';
import { THREEBRAIN_CANVAS } from './js/threejs_scene.js';
import { StorageCache } from './js/core/StorageCache.js';
import { CONSTANTS } from './js/constants.js';
// import { invertColor, padZero, to_array } from './js/utils.js';
import { padZero, to_array, get_element_size, get_or_default, storageAvailable } from './js/utils.js';
// import { D3Canvas } from './js/Math/sparkles.js';
// import { CCWebMEncoder } from './js/capture/CCWebMEncoder.js';
// import { CCanvasRecorder } from './js/capture/CCanvasRecorder.js';
import { json2csv } from 'json-2-csv';
import { Lut, ColorMapKeywords } from './js/jsm/math/Lut2.js';
import css from './css/dipterix.css';

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

    this.isThreeBrainViewer = true;
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

    this.controllerIsHidden = false;

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
    this.$controllerGUIWrapper = document.createElement('div');
    this.$controllerGUI = document.createElement('div');
    this.$controllerGUIWrapper.style.width = '100%';
    this.$controllerGUIWrapper.appendChild( this.$controllerGUI );
    this.el_side.appendChild( this.$controllerGUIWrapper );

    // this.el_legend = document.createElement('div');
    // this.el_legend_img = document.createElement('img');
    // this.el_legend.style.width = '100px';
    // this.el_legend.style.display = 'none';
    // this.el_legend.style.pointerEvents = 'none';
    // this.el_legend.style.padding = '10px';
    // this.el_legend.style.backgroundColor = 'rgba(255,255,255,0.2)';

    this.$sideInfo = document.createElement('div');
    this.$sideInfo.style.width = '100%';
    this.$sideInfo.style.padding = '0 0 10px 0';

    this.$progressWrapper = document.createElement('div');
    this.$progressWrapper.classList.add( "threejs-control-progress" );
    this.$progress = document.createElement('span');
    this.$progress.style.width = '0';
    this.$progressWrapper.appendChild( this.$progress );
    this.$sideInfo.appendChild( this.$progressWrapper );


    this.$sideText = document.createElement('div');
    this.$sideText.style.width = '100%';
    this.$sideInfo.appendChild( this.$sideText );

    //this.el_text2 = document.createElement('svg');
    //this.el_text2.style.width = '200px';
    //this.el_text2.style.padding = '10px';
    this.el_side.appendChild( this.$sideInfo );

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

  __resize_widget(width, height){
    if( width <= 0 || height <= 0 ){
      // Do nothing! as the canvas is usually invisible
      return(null);
    }
    // console.debug( this.outputId + ' - Resize to ' + width + ' x ' + height );
    this.el_side.style.maxHeight = height + 'px';
    if( this.controllerIsHidden ) {
      this.canvas.handle_resize(width, height);
    } else {
      this.canvas.handle_resize(width - 300, height);
    }
    if( this._reset_flag ){
      this._reset_flag = false;
      this.canvas.sideCanvasList.coronal.reset({ zoomLevel: true, position: true, size : true });
      this.canvas.sideCanvasList.axial.reset({ zoomLevel: true, position: true, size : true });
      this.canvas.sideCanvasList.sagittal.reset({ zoomLevel: true, position: true, size : true });
    }
    this.canvas.start_animation(0);
  }

  resize_widget(width, height){

    // delay resizing if the widget size is too small

    if(!width || width <= 0) {
      this.__width = 0;
    } else {
      this.__width = width;
    }

    if(!height || height <= 0) {
      this.__height = 0;
    } else {
      this.__height = height;
    }

    const _f = () => {
      const _w = this.__width || this.el.clientWidth;
      const _h = this.__height || this.el.clientHeight;
      if(_w <= 10 || _h <= 10) {
        setTimeout(_f, 1000);
      } else {
        this.__resize_widget(_w, _h);
      }
    }

    _f();

  }

  renderControllers(){
    if( this.controllerGUI ) {
      try { this.controllerGUI.dispose(); } catch (e) {}
    }
    this.controllerGUI = new EnhancedGUI({
      autoPlace: false,
      title : "3D Viewer Control Panel",
      // width: 300
    });
    if(this.DEBUG){
      window.controllerGUI = this.controllerGUI;
    }
    // --------------- Register GUI controller ---------------
    // Set default on close handler
    this.controllerGUI.addEventListener( "open", ( event ) => {
      if( event.folderPath !== "" ) { return; }
      this.controllerIsHidden = false;
      this.resize_widget( this.el.clientWidth, this.el.clientHeight );
    });
    this.controllerGUI.addEventListener( "close", ( event ) => {
      if( event.folderPath !== "" ) { return; }
      this.controllerIsHidden = true;
      this.resize_widget( this.el.clientWidth, this.el.clientHeight );
    });

    // Set side bar
    if( this.settings.hide_controls ) {
      this.controllerIsHidden = true;
    } else {
      this.$controllerGUIWrapper.replaceChild( this.controllerGUI.domElement, this.$controllerGUI );
      this.$controllerGUI = this.controllerGUI.domElement;

      if( this.settings.control_display ) {
        this.controllerIsHidden = false;
      } else {
        this.controllerIsHidden = true;
      }
    }
    if( this.controllerIsHidden ) {
      this.controllerGUI.close();
    } else {
      this.controllerGUI.open();
    }

    // Add listeners
    const enabledPresets = this.settings.control_presets;
    this.controlCenter = new ViewerControlCenter(
      this.canvas, this.controllerGUI, this.settings, this.shiny
    );
    window.controlCenter = this.controlCenter;

    // ---------------------------- Defaults
    this.controlCenter.addPreset_background();

    // ---------------------------- Main, side canvas settings is on top
    // this.controlCenter.addPreset_recorder();
    this.controlCenter.addPreset_resetCamera();
    this.controlCenter.addPreset_setCameraPosition2();
    this.controlCenter.addPreset_compass();

    // ---------------------------- Side cameras
    if( this.settings.side_camera ){
    //   // this.gui.add_folder('Side Canvas').open();
      this.controlCenter.addPreset_enableSidePanel();
      this.controlCenter.addPreset_resetSidePanel();
      this.controlCenter.addPreset_sideSlices();
      this.controlCenter.addPreset_sideViewElectrodeThreshold();
    }

    // ---------------------------- Presets
    let animationControllerRegistered = false;
    to_array( enabledPresets ).forEach(( presetName ) => {

      try {
        if( presetName === 'animation' ){
          animationControllerRegistered = true;
        }
        this.controlCenter['addPreset_' + presetName]();
      } catch (e) {
        if(this.DEBUG){
          console.warn(`Cannot add preset ${ presetName }`);
        }
      }
    });
    if( !animationControllerRegistered ){
      this.controlCenter.addPreset_animation();
    }
  }

  async renderValues({
    x,
    dataIsValid,
    reset = false
  }){

    const _isValid = (msg) => {
      if( typeof dataIsValid === 'function' ) {
        try {
          return( dataIsValid(msg) );
        } catch (e) {}
      }
      return true;
    }

    this.geoms = x.geoms;
    this.settings = x.settings;
    this.defaultControllerValues = x.settings.default_controllers || {},
    this.groups = x.groups,
    this.has_animation = x.settings.has_animation,
    this.DEBUG = x.settings.debug || false;

    this.canvas.DEBUG = this.DEBUG;
    this.canvas.mainCamera.needsReset = reset === true;
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

    this.canvas.title = this.settings.title;

    if( this.controllerGUI ) {
      try { this.controllerGUI.dispose(); } catch (e) {}
      this.controllerGUI = undefined;
    }

    if( !_isValid("Adding color maps") ) { return; }

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


    if( !_isValid("Loading group data") ) { return; }

    // load group data
    this.$sideInfo.style.display = 'block';

    let count = 0, nGroups = this.groups.length, loadingGroupNames = {};
    let progress = 20;
    const groupPromises = this.groups.map(async (g, ii) => {
      loadingGroupNames[g.name] = true;
      this.$sideText.innerHTML = `<small>Loading group: ${g.name}</small>`;

      progress = Math.floor( 20 + ((ii + 1) / nGroups * 30) );
      this.$progress.style.width = `${progress}%`;

      await this.canvas.add_group(g, this.settings.cache_folder);
      count++;

      progress = Math.floor( 50 + (count / nGroups * 45) );
      this.$progress.style.width = `${progress}%`;

      delete loadingGroupNames[g.name];

      const stillLoading = Object.keys( loadingGroupNames );
      if( stillLoading.length ) {
        this.$sideText.innerHTML = `<small>Loaded ${count} (out of ${ nGroups }): ${g.name} (still loading ${stillLoading[0]})</small>`;
      } else {
        this.$sideText.innerHTML = `<small>Loaded ${count} (out of ${ nGroups }): ${g.name}</small>`;
      }
    })

    // in the meanwhile, sort geoms
    if( !Array.isArray( this.geoms ) ) {
      this.geoms = to_array( this.geoms );
    }
    this.geoms.sort((a, b) => {
      return( a.render_order - b.render_order );
    });

    await Promise.all( groupPromises );
    this.$sideText.innerHTML = `<small>Group data loaded. Generating geometries...</small>`;
    this.$progress.style.width = `95%`;
    // creating objects
    console.debug(this.outputId + ' - Finished loading. Adding object');

    if( !_isValid("Adding geometries") ) { return; }

    const nGroms = this.geoms.length;
    count = 0;
    const geomPromises = this.geoms.map((g) => {
      return new Promise(async (r) => {
        await this.canvas.add_object( g );
        r();
      }).then(() => {
        count++;
        progress = Math.floor( 95 + (count / nGroms * 5) );
        this.$progress.style.width = `${progress}%`;
        this.$sideText.innerHTML = `<small>Added object ${g.name}</small>`;
      }).catch((e) => {
        if( this.DEBUG ){
          throw e;
        }else{
          console.warn(e);
        }
      });
    });

    await Promise.all( geomPromises );
    if( !_isValid() ) { return; }
    this.$progress.style.width = `100%`;
    this.$sideText.innerHTML = `<small>Finalizing...</small>`;

    return;

  }


  finalize_render( callback ) {

    this.canvas.finish_init();

    this.renderControllers();

    // FIXME
    // this.shiny.register_gui( this.gui, this.presets );



    /* Update camera. If we set camera position, then shiny will behave weird and we have to
    * reset camera every time. To solve this problem, we only reset zoom level
    *
    * this is the line that causes the problem
    */
    this.canvas.mainCamera.setZoom({ zoom : this.settings.start_zoom });
    this.canvas.set_font_size( this.settings.font_magnification || 1 );

    // Compile everything
    this.canvas.main_renderer.compile( this.canvas.scene, this.canvas.mainCamera );

    // Set side camera
    if(this.settings.side_camera || false){

      // Set canvas zoom-in level
      if( this.settings.side_display || false ){
        this.canvas.enableSideCanvas();
        // reset so that the size is displayed correctly
        this._reset_flag = true;
      }else{
        this.canvas.disableSideCanvas();
      }

    }else{
      this.canvas.disableSideCanvas();
    }

    /* FIXME
    if( !this.hide_controls ){
      // controller is displayed
      if( display_controllers ){
        this.gui.open();
      } else {
        this.gui.close();
      }
    }
    */

    this.resize_widget( this.el.clientWidth, this.el.clientHeight );

    // remember last settings
    try {
      this.controlCenter.update();
      this.controllerGUI.setFromDictionary( this.defaultControllerValues );
    } catch (e) {}

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
          this.canvas, this.controllerGUI, this.controlCenter,
          this.presets, this.shiny, utils_toolbox );

    }

    this.$sideInfo.style.display = 'none';
  }
}


class ViewerWrapper {

  /**
   * The whole point of class ViewerWrapper is to separate actual viewer
   * from the enclosing HTML element. This is becuase we want to reuse the
   * viewer in shiny applications.
   */

  get containerID () {
    // previously this.element_id
    this.$container.getAttribute('id');
  }
  get cacheID () {
    return `__THREEBRAIN_CONTAINER_${ this.containerID }__`;
  }
  get shinyID () {
    return `${ this.containerID }__shiny`;
  }
  get viewerCanvas () {
    if( !this.viewer ) { return; }
    return this.viewer.canvas;
  }

  getCachedViewer() {
    if( !this.cache ) { return; }
    return this.cache.get_item( this.cacheID , undefined );
  }
  cacheViewer () {
    if( !this.cache ){ return; }
    if( !this.viewer || !this.viewer.isThreeBrainViewer ) { return; }
    this.cache.set_item( this.cacheID , this.viewer );
  }

  constructor({
    $container, width, height,

    // HTMLWidgets.shinyMode, HTMLWidgets.viewerMode,
    shinyMode = false, viewerMode = false, cache = false
  } = {}){

    /**
     * ll the viewer data are cached here so we don't need to reload
     * duplicated data. However, this global cache might
     * 1. use lots of memories when lots of different subject are loaded
     * 2. Unable to update data if file on disk is changed.
     *
     * I do not plan to solve these issue as I can loading 10 different
     * subjects without too much pressure. Also this is in web browser,
     * simply refresh the page and cache will go away. The speed performance
     * is what matters for now.
     */
    if( cache === true ){
      this.cache = window.global_cache || new StorageCache();
    } else {
      this.cache = cache;
    }

    // Flag
    this.initialized = false;
    this.width = width;
    this.height = height;
    this.shinyMode = shinyMode;
    this.viewerMode = viewerMode;
    this.DEBUG = false;
    this.uuid = MathUtils.generateUUID();

    // DOM related
    this.$container = $container;
    this.$container.classList.add('threejs-brain-container');

    this.$loaderIcon = document.createElement("div");
    this.$loaderIcon.classList.add("threejs-brain-loader");

    // Viewer & Data ( initial small settings containing path to configuration )
    this.viewer = this.getCachedViewer();
    this.viewerBootstrapData = undefined;
    // this will be the root element of the viewer
    this.$viewerWrapper = undefined;


    if( this.viewer === undefined ) {
      // ---- Initialize ---------------------------------------------------------
      // Create wrapper for viewer, this will be the root element of the viewer
      // This is the first time, hence consider adding modal to prevent rendering
      this.addModal();

    } else {

      /**
       * This happens in Shiny mode where the entire ViewerWrapper is removed
       * by external code. The viewer app does not go away, we can get from
       * cache
       */

      this.activateViewer();

    }

  }

  addModal = () => {
    if( this.$modal ) { return; }
    this.$container.classList.add("threejs-brain-blank-container");
    this.$modal = document.createElement("div");
    this.$modal.classList.add("threejs-brain-modal");
    // check webgl2 availability
    this.$modal.innerText = "Click me to load 3D viewer.";

    if( !WebGL.isWebGL2Available() ) {
      const $warning = WebGL.getWebGLErrorMessage();
      const $warningSubtext = document.createElement("small");
      $warningSubtext.innerHTML = "Please use Chrome/Firefox/Safari for full support. You can force me to render viewer anyway by clicking me, but I might not work properly."
      $warning.appendChild( $warningSubtext );
      this.$modal.appendChild( $warning );
    }

    this.$container.innerHTML = "";
    this.$container.appendChild( modal );
    this.$container.addEventListener( "click", this.activateViewer );
  }

  activateViewer = () => {
    this.$container.removeEventListener( "click", this.activateViewer );

    if( this.$modal ) {
      this.$modal.innerText = ""
      this.$modal.appendChild( this.$loaderIcon )
      this.$modal = undefined;
    }

    // check if viewer has been initialized
    if( this.initialized ) {
      this.useCachedViewer( true );
    } else {
      this.createViewer( true );
    }

    this.render();

  }

  createViewer( insertViewer = false ) {
    if( this.initialized ) {
      return this.useCachedViewer();
    }
    this.$viewerWrapper = document.createElement('div');
    this.$viewerWrapper.classList.add( 'threejs-brain-canvas' );
    this.$viewerWrapper.setAttribute( 'data-target', this.containerID );
    this.viewer = new BrainCanvas(

      // Element to store 3D viewer
      this.$viewerWrapper,

      // dimension of the viewer
      this.width, this.height,

      // Different sizing policy, as well as callbacks
      this.shinyMode, this.viewerMode,

      // use cache? true, false, or the cache object
      this.cache,

      // DEBUG mode?
      this.DEBUG
    );

    this.cacheViewer();
    this.initalized = true;

    if( insertViewer ) {
      // clear the container element
      this.$container.innerHTML = '';
      this.$container.classList.remove("threejs-brain-blank-container");
      this.$container.appendChild( this.$viewerWrapper );

      this.resize();
    }
    // otherwise no need to resize as the $viewerWrapper is just created, and
    // there is no way the wrapper is added to DOM
  }

  useCachedViewer( insertViewer = false ) {
    if( !this.initialized ) {
      return this.createViewer();
    }
    if( !this.viewer ) {
      this.viewer = this.getCachedViewer();
      this.cacheViewer();
    }
    if( !this.viewer ) { throw 'THREEBRAIN: Trying to use a cached/existing viewer, but the viewer is nowhere to be found!'; }
    console.debug('THREEBRAIN: Re-using an existing/cached viewer.');

    this.$viewerWrapper = this.viewer.el;

    // make sure (can be overkill)
    this.initalized = true;
    if( insertViewer ) {
      // clear the container element
      this.$container.innerHTML = '';
      this.$container.classList.remove("threejs-brain-blank-container");
      this.$container.appendChild( this.$viewerWrapper );

    }
    this.resize();
  }

  receiveData({ data , reset = false } = {}) {
    // data contains basic viewer settings, which contains path to viewer data file

    /**
     * The render is async, hence we can't use this.viewerBootstrapData here
     * this is to backup the data in case we create viewer after receiving data:
     *    When shiny renders the HTMLWidget, this object will receive the data,
     *    store it in `this.viewerBootstrapData`. However, there is a chance
     *    that the user hasn't clicked this.$modal to initialize the viewer yet.
     *
     * The solution is to store the data, when this.createViewer is called,
     * it checks whether data has been received. If so, render it
     */
    this.viewerBootstrapData = {
      data : data,
      reset : reset
    };

    if( !this.initalized ) {
      if( data.force_render ) {
        this.activateViewer();
      }
      return;
    }

    this.render( reset );


  }

  render() {
    if( !this.viewer || !this.viewerBootstrapData ) {
      // throw 'THREEBRAIN: Cannot render viewer without the viewer UI and data.'.
      return;
    }
    // read configurations
    const data = this.viewerBootstrapData.data;
    const reset = this.viewerBootstrapData.reset;
    const path = data.settings.cache_folder + data.data_filename;

    this.viewer.$sideText.innerHTML = `<small>Loading configuration files...</small>`;
    this.viewer.$progress.style.width = '0';
    this.viewer.$sideInfo.style.display = 'block';

    console.debug( 'Reading configuration file...' );

    const fileReader = new FileReader();
    this.__fileReader = fileReader;


    return new Promise( resolve => {
      fileReader.onload = (evt) => {

        // Do not double-load or load obsolete viewers
        if( this.__fileReader !== fileReader ) { return; }
        fileReader.onload = undefined;

        console.debug("Configurations loaded.")
        const viewerData = JSON.parse(evt.target.result);
        viewerData.settings = data.settings;

        this.viewer.$progress.style.width = '20%';

        this.viewer.renderValues({
          x : viewerData,
          reset: reset,
          dataIsValid : ( msg ) => {
            const isValid = this.__fileReader === fileReader;
            if( msg ) {
              console.debug(`${msg} (fileReader is ${isValid})`);
            }
            return isValid;
          }
        }).then(() => {
          if( this.__fileReader === fileReader ) {
            this.__fileReader = undefined;
            this.viewer.finalize_render();
            this.resize();
          }
        });
      }

      fetch( path ).then( r => r.blob() ).then( blob => {
        fileReader.readAsText( blob );
      });
    });

  }

  resize( width, height ) {
    if( this.viewer ){
      this.viewer.resize_widget(
        width ?? this.width,
        height ?? this.height
      );
    }
  }
}


window.ViewerWrapper = ViewerWrapper;
window.THREE = THREE;
window.download = download;
window.StorageCache = StorageCache;
export { BrainCanvas, ViewerWrapper };

