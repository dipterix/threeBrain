import { ThrottledEventDispatcher } from './ThrottledEventDispatcher.js';
import { asArray } from '../utility/asArray.js';
import { EnhancedGUI } from './EnhancedGUI.js';
import { ViewerControlCenter } from './ViewerControlCenter.js';
import { ViewerCanvas } from './ViewerCanvas.js';
import { MouseKeyboard } from './MouseKeyboard.js';
import { CONSTANTS } from '../constants.js';

class ViewerApp extends ThrottledEventDispatcher {

  constructor({

    // Element to store 3D viewer
    $wrapper,

    // in case $wrapper has 0 width or height
    width, height,

    // use cache? true, false, or the cache object
    cache = false,

    // debug mode?
    debug = false

  }) {

    super( $wrapper );

    // Flags
    this.DEBUG = debug;
    this.isViewerApp = true;
    this.controllerClosed = false;

    // this.outputId = this.$wrapper.getAttribute( 'data-target' );

    // data
    this.geoms = [];
    this.settings = {};

    // ---- initialize : DOM elements ------------------------------------------
    /** The layout is:
     * $wrapper:
     *   - A: 1. Settings panel
     *        - 2. Controller wrapper
     *          - 3. Controller placeholder ( this one will be replaced )
     *        - 4. Information container
     *          - 5. Progress wrapper
     *            - Progress bar ( for css reasons, this requires a wrapper )
     *          - 6. Information text
     *   - B. Canvas container
     *      - Coronal panel
     *      - Axial panel
     *      - Sagital panel
     *      - Main canvas
     */
    this.$wrapper = $wrapper;
    // --- A ---
    // 1. Control panel
    this.$settingsPanel = document.createElement('div');
    this.$settingsPanel.style.maxHeight = `${ height ?? this.$wrapper.clientHeight }px`;
    this.$settingsPanel.classList.add( 'threejs-control' )

    // 2. Controller wrapper
    this.$controllerContainer = document.createElement('div');
    this.$controllerContainer.style.width = '100%';

    // 3. Controller placeholder
    // initialized as placeholder, will be replaced by lil-gui
    this.$controllerGUI = document.createElement('div');

    // 4. Information container
    this.$informationContainer = document.createElement('div');
    this.$informationContainer.style.width = '100%';
    this.$informationContainer.style.padding = '0 0 10px 0'; // avoid ugly text layout

    // 5. Progress
    this.$progressWrapper = document.createElement('div');
    this.$progressWrapper.classList.add( "threejs-control-progress" );
    this.$progress = document.createElement('span');
    this.$progress.style.width = '0';

    // 6. Information text
    this.$informationText = document.createElement('div');
    this.$informationText.style.width = '100%';

    // Assemble A.1-6
    /*    1. Settings panel
     *        - 2. Controller wrapper
     *          - 3. Controller placeholder ( this one will be replaced )
     *        - 4. Information container
     *          - 5. Progress wrapper
     *            - Progress bar ( for css reasons, this requires a wrapper )
     *          - 6. Information text
     */
    // add 3 to 2
    this.$controllerContainer.appendChild( this.$controllerGUI );
    // add 2 to 1
    this.$settingsPanel.appendChild( this.$controllerContainer );
    // add $progress to 5
    this.$progressWrapper.appendChild( this.$progress );
    // add 5 to 4
    this.$informationContainer.appendChild( this.$progressWrapper );
    // add 6 to 4
    this.$informationContainer.appendChild( this.$informationText );
    // add 4 to 1
    this.$settingsPanel.appendChild( this.$informationContainer );
    // add 1 to $wrapper
    this.$wrapper.appendChild( this.$settingsPanel );

    // --- B Canvas container ------------------------------------------------
    this.canvas = new ViewerCanvas(
      this.$wrapper,
      width ?? this.$wrapper.clientWidth,
      height ?? this.$wrapper.clientHeight,
      250, false, cache, this.DEBUG, true );

    this.canvas.animate();

    // Add listeners for mouse
    this.mouseKeyboard = new MouseKeyboard( this );


  }

  get mouseLocation () { return this.mouseKeyboard.mouseLocation; }

  dispose() {
    super.dispose();
    this.mouseKeyboard.dispose();
    if( this.controllerGUI ) {
      try { this.controllerGUI.dispose(); } catch (e) {}
    }
  }

  setProgressBar({
    // 0 - 100
    progress, message, autoHide = true } = {}) {

    if( progress < 0 ) { return; }
    if( progress >= 100 ) { progress = 100; }
    this.__progress = progress;
    this.$progress.style.width = `${ progress }%`;

    if( message ) {
      if( this.DEBUG ) {
        console.debug(`THREEBRAIN (viewer app progress): ${ message }`);
      }
      this.$informationText.innerHTML = `<small>${ message }</small>`;
    } else {
      this.$informationText.innerHTML = "";
    }

    if( autoHide && progress >= 99.99999 ) {
      this.$informationContainer.style.display = 'none';
    } else {
      this.$informationContainer.style.display = 'block';
    }
  }

  resize( width, height ) {
    const _width = width ?? this.$wrapper.clientWidth;
    const _height = height ?? this.$wrapper.clientHeight;
    if( _width <= 0 || _height <= 0 ){ // Do nothing! as the canvas is usually invisible
      return ;
    }
    this.$settingsPanel.style.maxHeight = _height + 'px';
    if( this.controllerClosed ) {
      this.canvas.handle_resize( _width, _height );
    } else {
      this.canvas.handle_resize( _width - 300, _height );
    }
    /* FIXME : move to canvas, not here!!!
    if( this._reset_flag ){
      this._reset_flag = false;
      this.canvas.sideCanvasList.coronal.reset({ zoomLevel: true, position: true, size : true });
      this.canvas.sideCanvasList.axial.reset({ zoomLevel: true, position: true, size : true });
      this.canvas.sideCanvasList.sagittal.reset({ zoomLevel: true, position: true, size : true });
    }
    this.canvas.start_animation(0);
    */
  }

  bootstrap( { bootstrapData, reset = false } ) {
    this.DEBUG = this.DEBUG || bootstrapData.debug;

    // read configurations
    const path = bootstrapData.settings.cache_folder + bootstrapData.data_filename;

    this.setProgressBar({
      progress  : 0,
      message   : "Loading configuration files..."
    });

    const fileReader = new FileReader();
    this.__fileReader = fileReader;

    /**
     * The render process is async and may take time
     * If new data come in and this.render is called,
     * then this.__fileReader will be altered, and this reader
     * is obsolete. In such case, abandon the rendering process
     * as there is a new process rendering up-to-date data
     */
    const readerIsObsolete = () => {
      const re = this.__fileReader !== fileReader;
      if( re && this.DEBUG ) {
        console.debug( "THREEBRAIN (viewer.render): configuration is obsolete, abandon current process to yield." );
      }
      return ( re );
    };

    fileReader.onload = (evt) => {

      fileReader.onload = undefined;
      if( readerIsObsolete() ) { return; }

      this.setProgressBar({
        progress  : 10,
        message   : "Parsing configurations..."
      });

      const viewerData = JSON.parse(evt.target.result);
      viewerData.settings = bootstrapData.settings;

      this.setProgressBar({
        progress  : 20,
        message   : "Updating viewer data..."
      });

      this.updateData({
        data : viewerData,
        reset : reset,
        isObsolete : readerIsObsolete
      })

      /*
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
    */
    }

    window.fetch( path ).then( r => r.blob() ).then( blob => {
      fileReader.readAsText( blob );
    });
  }


  enableDebugger() {
    window.app = this;
    window.groups = this.groups;
    window.geoms = this.geoms;
    window.settings = this.settings;
    window.canvas = this.canvas;
    window.controllerGUI = this.controllerGUI;
    this.canvas.addNerdStats();
  }

  async updateData({ data, reset = false, isObsolete = false }) {

    this.dispatch( "viewerApp.updateData.start", {}, true );

    const _isObsolete = ( args ) => {
      if( typeof isObsolete !== 'function' ) { return isObsolete; }
      try { return isObsolete( args ); } catch (e) { return false; }
    }
    if( _isObsolete( "Updating viewer data" ) ) { return; }

    this.DEBUG = data.settings.debug || false;

    // clear canvas
    this.canvas.pause_animation(9999);
    this.canvas.clear_all();
    if( this.controllerGUI ) {
      try { this.controllerGUI.dispose(); } catch (e) {}
      this.controllerGUI = undefined;
    }

    this.groups = asArray( data.groups );
    this.geoms = asArray( data.geoms );
    this.settings = data.settings;
    this.initialControllerValues = data.settings.default_controllers || {};
    this.hasAnimation = data.settings.has_animation;
    this.colorMaps = asArray( data.settings.color_maps );

    // canvas flags
    this.canvas.DEBUG = this.DEBUG;
    this.canvas.mainCamera.needsReset = reset === true;
    // this.shiny.set_token( this.settings.token );

    if( this.DEBUG ) {
      this.enableDebugger();
    }


    this.canvas.title = this.settings.title;

    if( _isObsolete("Adding color maps") ) { return; }

    this.colorMaps.forEach( params => {
      // calculate cmap, add time range so that the last value is always displayed
      // let tr = v.time_range;
      this.canvas.add_colormap(
        params.name, params.alias,
        params.value_type, params.value_names, params.value_range, params.time_range,
        params.color_keys, params.color_vals, params.color_levels, params.hard_range
      );
    });

    if( _isObsolete("Loading group data") ) { return; }

    this.setProgressBar({
      progress  : 20,
      message   : "Loading group data..."
    });

    const nGroups = this.groups.length;
    let count = 0, progressIncrement = 0.5 / nGroups * 75;

    const groupPromises = this.groups.map(async (g, ii) => {
      this.setProgressBar({
        progress : this.__progress + progressIncrement,
        message : `Loading group: ${g.name}`
      });

      await this.canvas.add_group(g, this.settings.cache_folder);
      count++;

      this.setProgressBar({
        progress : this.__progress + progressIncrement,
        message : `Loaded ${count} (out of ${ nGroups }): ${g.name}`
      });
    })

    // in the meanwhile, sort geoms
    this.geoms.sort((a, b) => {
      return( a.render_order - b.render_order );
    });

    // wait for all groups to get loaded
    await Promise.all( groupPromises );

    this.setProgressBar({
      progress : 95,
      message : "Group data loaded. Generating geometries..."
    });

    if( _isObsolete("Adding geometries") ) { return; }

    const nGeoms = this.geoms.length;
    progressIncrement = 5 / nGeoms;
    const geomPromises = this.geoms.map( async(g) => {
      try {

        await this.canvas.add_object( g );
        this.setProgressBar({
          progress : this.__progress + progressIncrement,
          message : `Added object ${g.name}`
        });

      } catch (e) {

        console.warn(e);

      }
    });

    await Promise.all( geomPromises );
    if( _isObsolete() ) { return; }

    // this.canvas.finish_init();

    this.setProgressBar({
      progress : 100,
      message : "Finalizing..."
    });

    // ---- Finalizing: add controllers ----------------------------------------
    this.updateControllers();

    // FIXME: Add driver, which contains shiny support
    // this.shiny.register_gui( this.gui, this.presets );



    // The following stuff need to run *after* controller set up
    // TODO: consider moving these to the canvas class
    /* Update camera zoom. If we set camera position, then shiny will behave weird and we have to
    * reset camera every time. To solve this problem, we only reset zoom level
    *
    * this is the line that causes the problem
    */
    this.canvas.mainCamera.setZoom({ zoom : this.settings.start_zoom });
    this.canvas.set_font_size( this.settings.font_magnification || 1 );

    // Compile everything
    this.canvas.main_renderer.compile( this.canvas.scene, this.canvas.mainCamera );

    // Set side camera
    if( this.settings.side_camera || false ){

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

    this.resize( this.$wrapper.clientWidth, this.$wrapper.clientHeight );

    // remember last settings
    try {
      this.controlCenter.update();
      this.controllerGUI.setFromDictionary( this.defaultControllerValues );
    } catch (e) {}

    // Force starting rendering
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
      (( viewerApp ) => {
        try {
          eval( this.settings.custom_javascript );
        } catch (e) {
          console.warn(e);
        }
      })( this );
    }

    // Make sure it's hidden though progress will hide it
    this.$informationContainer.style.display = 'none';

    this.dispatch( "viewerApp.updateData.end", {}, true );

  }

  updateControllers() {
    if( this.controllerGUI ) {
      try { this.controllerGUI.dispose(); } catch (e) {}
    }
    this.controllerGUI = new EnhancedGUI({
      autoPlace: false,
      title : "3D Viewer Control Panel"
    });
    // --------------- Register GUI controller ---------------
    // Set default on close handler
    this.controllerGUI.addEventListener( "open", ( event ) => {
      if( event.folderPath !== "" ) { return; }
      this.controllerClosed = false;
      this.resize( this.$wrapper.clientWidth, this.$wrapper.clientHeight );
    });
    this.controllerGUI.addEventListener( "close", ( event ) => {
      if( event.folderPath !== "" ) { return; }
      this.controllerClosed = true;
      this.resize( this.$wrapper.clientWidth, this.$wrapper.clientHeight );
    });

    // Set side bar
    if( this.settings.hide_controls ) {

      // Do not show controller GUI at all.
      this.controllerClosed = true;
      const $placeholder = document.createElement("div");
      this.$controllerContainer.replaceChild( $placeholder, this.$controllerGUI );
      this.$controllerGUI = $placeholder;
    } else {

      // set GUI
      this.$controllerContainer.replaceChild( this.controllerGUI.domElement, this.$controllerGUI );
      this.$controllerGUI = this.controllerGUI.domElement;

      if( this.settings.control_display ) {
        this.controllerClosed = false;
      } else {
        // fold the controller GUI
        this.controllerClosed = true;
      }
    }
    if( this.controllerClosed ) {
      this.controllerGUI.close();
    } else {
      this.controllerGUI.open();
    }

    // Add listeners
    const enabledPresets = this.settings.control_presets;
    this.controlCenter = new ViewerControlCenter(
      this.canvas, this.controllerGUI, this.settings, this.shiny
    );
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

    // ---- Add Presets --------------------------------------------------------
    let animationControllerRegistered = false;
    asArray( enabledPresets ).forEach(( presetName ) => {

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
}

export { ViewerApp };
