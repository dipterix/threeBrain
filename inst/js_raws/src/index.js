/**
 * @Author: Zhengjia Wang
 * Adapter of model (threejs_scene) and viewer (htmlwidgets)
 */
import { download } from './js/download.js';
import { WEBGL } from './js/WebGL.js';
import { THREE } from './js/threeplugins.js';
import { THREEBRAIN_PRESETS, THREEBRAIN_CONTROL } from './js/data_controls.js';
import { THREE_BRAIN_SHINY } from './js/shiny_tools.js';
import { THREEBRAIN_CANVAS } from './js/threejs_scene.js';
import { THREEBRAIN_STORAGE } from './js/threebrain_cache.js';
import { CONSTANTS } from './js/constants.js';
// import { invertColor, padZero, to_array } from './js/utils.js';
import { padZero, to_array } from './js/utils.js';
// import { D3Canvas } from './js/Math/sparkles.js';
// import { CCWebMEncoder } from './js/capture/CCWebMEncoder.js';
// import { CCanvasRecorder } from './js/capture/CCanvasRecorder.js';

class BrainCanvas{
  constructor(el, width, height, shiny_mode = false, viewer_mode = false, cache = false, DEBUG = true){
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
    this.shiny = new THREE_BRAIN_SHINY( this.outputId, this.shiny_mode );
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
    this.shiny.register_canvas( this.canvas );

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
    console.debug( this.outputId + ' - Resize to ' + width + ' x ' + height );
    this.el_side.style.maxHeight = height + 'px';
    if(this.hide_controls){
      this.canvas.handle_resize(width, height);
    }else{
      this.canvas.handle_resize(width - 300, height);
    }
    this.canvas.start_animation(0);
  }

  _register_gui_control(){
    const gui = new THREEBRAIN_CONTROL({ autoPlace: false }, this.DEBUG);
    if(this.DEBUG){
      window.gui = gui;
    }
    // --------------- Register GUI controller ---------------
    // Set default on close handler
    gui.set_closeHandler( (evt) => {
      this.hide_controls = gui.closed;
      this.resize_widget( this.el.clientWidth, this.el.clientHeight );
    });

    // Set side bar
    if(this.settings.hide_controls || false){
      this.hide_controls = true;
      gui.close();
      // gui.domElement.style.display = 'none';
    }else{
      // gui.domElement.style.display = 'block';
      const placeholder = this.el_control.firstChild;
      this.el_control.replaceChild( gui.domElement, placeholder );
      this.hide_controls = false;
    }

    // Add listeners
    const control_presets = this.settings.control_presets;
    const presets = new THREEBRAIN_PRESETS( this.canvas, gui, this.settings, this.shiny );
    this.presets = presets;
    if(this.DEBUG){
      window.presets = presets;
    }else{
      window.__presets = presets;
    }



    // ---------------------------- Defaults
    presets.c_background();

    // ---------------------------- Main, side canvas settings is on top
    gui.add_folder('Main Canvas').open();
    presets.c_recorder();
    presets.c_reset_camera();
    presets.c_main_camera_position();
    presets.c_toggle_anchor();
    /*
    gui.add_item('Free Controls', () => {
      _camera_pos.setValue( '[free rotate]' );
      this.canvas.controls.enabled = true;
    }, {folder_name: 'Main Canvas'});
    */

    // ---------------------------- Side cameras
    if( this.settings.side_camera ){
      gui.add_folder('Side Canvas').open();
      presets.c_toggle_side_panel();
      presets.c_reset_side_panel();
      presets.c_side_depth();
      presets.c_side_electrode_dist();
    }

    // ---------------------------- Presets
    to_array( control_presets ).forEach((control_preset) => {
      if( control_preset === 'animation' ){
        return(null);
      }
      try {
        presets['c_' + control_preset]();
      } catch (e) {
        if(this.DEBUG){
          console.warn(e);
        }
      }
    });

    presets.c_animation();

    return(gui);

  }

  _set_loader_callbacks(){
    this.canvas.loader_manager.onLoad = () => {
      this.finalize_render();
    };

    this.el_text.style.display = 'block';

    this.canvas.loader_manager.onProgress = ( url, itemsLoaded, itemsTotal ) => {

    	let path = /\/([^/]*)$/.exec(url)[1],
    	    msg = '<p><small>Loading file: ' + (itemsLoaded + 1) + ' of ' + itemsTotal + ' files.<br>' + path + '</small></p>';

      if(this.DEBUG){
        console.debug(msg);
      }

      this.el_text.innerHTML = msg;

    };
  }

  _set_info_callback(){
    const pos = new THREE.Vector3();

    this.canvas.add_mouse_callback(
      (evt) => {
        return({
          pass  : (evt.action === 'click' || evt.action === 'dblclick'),
          type  : 'clickable'
        });
      },
      ( res, evt ) => {
        const obj = res.target_object;
        if( obj && obj.userData ){
          const g = obj.userData.construct_params;
          obj.getWorldPosition( pos );

          // Get information and show them on screen
          const group_name = g.group ? g.group.group_name : null;
          const shiny_data = {
            object      : g,
            name        : g.name,
            geom_type   : g.type,
            group       : group_name,
            position    : pos.toArray(),
            action      : evt.action,
            meta        : evt,
            edit_mode   : this.canvas.edit_mode,
            is_electrode: false,
            current_time: 0,
            color_maps  : this.settings.color_maps,
            time_range  : this.presets.animation_time
          };

          if( this.gui ){
            // clip name
            let _c = this.gui.get_controller('Clip Name');
            if( _c && _c.getValue ){
              shiny_data.current_clip = _c.getValue();
            }

            _c = this.presets._ani_time;
            if( _c && _c.getValue ){
              shiny_data.current_time = _c.getValue();
            }
          }

          if( g.is_electrode ){

            const m = CONSTANTS.REGEXP_ELECTRODE.exec( g.name );
            if( m.length === 4 ){

              shiny_data.subject = m[1];
              shiny_data.electrode_number = parseInt( m[2] );
              shiny_data.is_electrode = true;
            }

          }

          if( evt.action === 'click' ){
            this.shiny.to_shiny(shiny_data, 'mouse_clicked');
          }else{
            this.shiny.to_shiny(shiny_data, 'mouse_dblclicked');
          }


        }
      },
      'to-shiny'
    );



  }

  render_value( x ){
    this.geoms = x.geoms;
    this.settings = x.settings;
    this.optionals = x.settings.optionals || {},
    this.groups = x.groups,
    this.has_animation = x.settings.has_animation,
    this.DEBUG = x.settings.debug || false;

    this.canvas.DEBUG = this.DEBUG;
    this.shiny.set_token( this.settings.token );

    if(this.DEBUG){
      window.groups = this.groups;
      window.geoms = this.geoms;
      window.settings = this.settings;
      window.canvas = this.canvas;
      window.scene = this.canvas.scene; // chrome debugger seems to need this
      this.canvas._add_stats();
    }else{
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
      this.canvas.add_colormap(
        v.name,
        v.value_type,
        v.value_names,
        v.value_range,
        v.time_range,
        v.color_keys,
        v.color_vals,
        v.color_levels
      );
    });


    // load data
    this.canvas.loader_triggered = false;

    // Register some callbacks
    this._set_loader_callbacks();

    this.groups.forEach((g) => {

      this.canvas.add_group(g, this.settings.cache_folder);

    });

    // Load fonts
    /*
    this.canvas.load_file(
      this.settings.lib_path + 'threejs-0.101.1/fonts/helvetiker_regular.typeface.json',
      (v) => {
        this.canvas.font_library = v;
      }, 'font_loader'
    );
    */

    // Make sure the data loading process is on
    if( !this.canvas.loader_triggered ){
      this.finalize_render();
    }

  }


  finalize_render(){
    console.debug(this.outputId + ' - Finished loading. Adding object');
    // this.el_text2.innerHTML = '';
    this.el_text.style.display = 'none';

    this.geoms.forEach((g) => {
      if( this.DEBUG ){
        this.canvas.add_object( g );
      }else{
        try {
          this.canvas.add_object(g);
        } catch (e) {
        }
      }
    });

    if( this.gui ){
      try {
        this.gui.dispose();
      } catch (e) {}
    }
    let gui = this._register_gui_control();
    this.gui = gui;
    this.shiny.register_gui( gui );
    this._set_info_callback();



    /* Update camera. If we set camera position, then shiny will behave weird and we have to
    * reset camera every time. To solve this problem, we only reset zoom level
    *
    * this is the line that causes the problem
    */
    // this.canvas.reset_main_camera( this.settings.camera_pos , this.settings.start_zoom );
    this.canvas.reset_main_camera( undefined , this.settings.start_zoom );

    // Add/remove axis
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
      }else{
        this.canvas.disable_side_cameras();
      }

    }else{
      this.canvas.disable_side_cameras();
    }

    // Force render canvas
    // Resize widget in case control panel is hidden
    this.hide_controls = this.settings.hide_controls || false;
    if( !this.hide_controls && !this.settings.control_display ){
      this.gui.close();
    }
    this.resize_widget( this.el.clientWidth, this.el.clientHeight );
    this.canvas.render();

    this.canvas.start_animation(0);
  }
}

window.BrainCanvas = BrainCanvas;
window.THREE = THREE;
window.download = download;
window.THREEBRAIN_STORAGE = THREEBRAIN_STORAGE;
export { BrainCanvas };
