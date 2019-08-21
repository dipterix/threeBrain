/**
 * @Author: Zhengjia Wang
 * Adapter of model (threejs_scene) and viewer (htmlwidgets)
 */
import * as d3 from "d3";
import { download } from './js/download.js';
import { WEBGL } from './js/WebGL.js';
import { THREE } from './js/threeplugins.js';
import { THREEBRAIN_PRESETS, THREEBRAIN_CONTROL } from './js/data_controls.js';
import { THREE_BRAIN_SHINY } from './js/shiny_tools.js';
import { THREEBRAIN_CANVAS } from './js/threejs_scene.js';
import { THREEBRAIN_STORAGE } from './js/threebrain_cache.js';
import { invertColor, padZero, to_dict, to_array } from './js/utils.js';
import { D3Canvas } from './js/Math/sparkles.js';
// import { CCWebMEncoder } from './js/capture/CCWebMEncoder.js';
import { CCanvasRecorder } from './js/capture/CCanvasRecorder.js';

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
    this.outputId = this.el.getAttribute('id');
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

    this.el_legend = document.createElement('div');
    //this.el_legend_img = document.createElement('img');
    this.el_legend.style.width = '100px';
    this.el_legend.style.display = 'none';
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


    // 2. Add legend (Not needed anymore, legend is all integrated into canvas 2d context)
    /*

    this.legend_data = {
      "id":"canvas",
      "width":"300px","height":"200px",
      "layout":[
        {
          "name":"sparks","x":"50","y":0,"w":"width - 70","h":"height","xlim":[-1,2],"ylim":[1,200],"margin":[20,20,50,10]
        },{
          "name":"colorbar","x":0,"y":0,"w":50,"h":"height","xlim":[-1,2],"ylim":[1,200],"zlim":[1,60200],"margin":[20,25,50,10]
        }
      ],
      "plot_data":{"x":[1],"y":[1], "z": [[1]]},
      "content":{
        // right sparks
        "sparks":{
          "main":"","cex_main":0.5,"anchor_main":"middle","main_top":30,"data":null,
          "geom_traces":{"lines":{"type":"geom_line","data":null,"x":"x","y":"y"}},
          "axis":[
            {"side":1,"text":"","at":null,"labels":null,"las":1,"cex_axis":0.5,"cex_lab":0.5,"line":0},
            {"side":2,"text":"","at":null,"labels":null,"las":1,"cex_axis":0.5,"cex_lab":0.5,"line":0}
          ]
        },
        "colorbar":{
          "main":"","cex_main":0.5,"anchor_main":"middle","main_top":30,"data":null,
          "geom_traces":{
            "heatmap":{
              "type":"geom_heatmap",
              "data":null,
              "x":"x","y":"y","z":"z","x_scale":"linear","y_scale":"linear",
              "palette":["steelblue","red"],
              "rev_x":false,"rev_y":true
            }
          },
          "axis":[{
            "side":2,"text":"","at":[0,200],"las":1,"cex_axis":0.5,"cex_lab":0.5,"line":0
          }]
        }
      }
    };


    const legend_el = document.createElement('svg');
    this.el_legend.appendChild( legend_el );
    this.el_side.appendChild( this.el_legend );
    // this.legend = new D3Canvas(this.legend_data, legend_el);

    // window.legend = this.legend;
    // window.legend_data = this.legend_data;
  */


    // 3. initialize threejs scene
    this.canvas = new THREEBRAIN_CANVAS(
      this.el, width, height, 250,
      this.shiny_mode, cache, this.DEBUG, this.has_webgl2);

    // 4. Animation, but do not render;
    this.canvas.animate();

  }

  /*
  set_legend_value(x, y, title = ''){
    if( x && y ){
      this.legend_data.content.sparks.data = {
        'x' : x,
        'y' : y
      };
    }

    if( this.show_legend ){
      this.legend._render_graph('sparks', title);
    }

  }
  */

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

    // Set side bar
    if(this.settings.hide_controls || false){
      gui.domElement.style.display = 'none';
      this.hide_controls = true;
    }else{
      gui.domElement.style.display = 'block';
      let placeholder = this.el_control.firstChild;
      this.el_control.replaceChild( gui.domElement, placeholder );
      this.hide_controls = false;
    }

    const control_presets = this.settings.control_presets;
    const presets = new THREEBRAIN_PRESETS( this.canvas, gui, this.optionals.map_to_template || false);
    if(this.DEBUG){
      window.presets = presets;
    }

    to_array( control_presets ).forEach((control_preset) => {
      try {
        presets[control_preset]();

        let callback = presets[control_preset + '_callback'];
        if(typeof(callback) === 'function'){
          callback();
        }
      } catch (e) {
        if(this.DEBUG){
          console.warn(e);
        }
      }
    });

    // GUI folders to keep them in order
    gui.add_folder('Graphics');
    gui.add_folder('Misc');


    // Add listeners

    // Background color
    gui.add_item('Background Color', "#ffffff", {is_color : true, folder_name: 'Misc'})
      .onChange((v) => {
        let inversedColor = invertColor(v);
        this.canvas.main_renderer.setClearColor(v);
        this.canvas.side_renderer.setClearColor(v);
        this.el_text.style.color=inversedColor;
        // this.el_text2.style.color=inversedColor;
        this.el.style.backgroundColor = v;

        this.canvas.start_animation(0);
        this.canvas.background_color = v;
        this.canvas.foreground_color = inversedColor;
      });

    gui.add_item('Record Video', false, {folder_name: 'Default'})
      .onChange((v) =>{

        if(v){
          // create capture object
          if( !this.canvas.capturer ){

            this.canvas.capturer = new CCanvasRecorder({

              canvas: this.canvas.domElement,

              // FPS = 15
              framerate: 24,
              // Capture as webm
              format: 'webm',
              // workersPath: 'lib/',
              // verbose results?
              verbose: true,
              autoSaveTime : 0,

              main_width: this.canvas.main_renderer.domElement.width,
              main_height: this.canvas.main_renderer.domElement.height,
              sidebar_width: 300,
              pixel_ratio : this.canvas.main_renderer.domElement.width / this.canvas.main_renderer.domElement.clientWidth


            });

          }

          this.canvas.capturer.baseFilename = this.canvas.capturer.filename = new Date().toGMTString();
          this.canvas.capturer.start();
          this.canvas.capturer_recording = true;
          // Force render a frame
          // Canvas might not render
          // this.canvas.start_animation(0);
        }else{
          this.canvas.capturer_recording = false;
          if(this.canvas.capturer){
            this.canvas.capturer.stop();
            this.canvas.capturer.save();
            // this.canvas.capturer.incoming = false;
          }
        }


      });


    gui.add_item('Lock Camera', false, {folder_name: 'Misc'})
      .onChange((v) => {
        this.canvas.controls.enabled = !v;
      });

    const _legend_callback = (v) => {
      this.show_legend = v;
      let d = v? 'block' : 'none';
      this.el_legend.style.display = d;
      this.canvas.render_legend = v;
      if(this.canvas.lut){
        this.canvas.lut.color_type = this.settings.color_type ? this.settings.color_type : 'continuous';
        if( this.canvas.lut.color_type === 'discrete' ){

          this.canvas.lut.color_names = to_array(this.settings.color_names);

        }
      }

      this.canvas.start_animation(0);

      /*
      if(v){
        let c = gui.get_controller('Background Color', 'Misc');
        if ( c && typeof( c.getValue ) === 'function' ){
          let iv = invertColor( c.getValue() );

          // TODO: change background color
          this.legend.render();

        }else{
          this.legend.render();
        }

      }
      */
    };
    gui.add_item('Show Legend', this.settings.show_legend, {folder_name: 'Graphics'})
      .onChange(_legend_callback);

    _legend_callback(this.settings.show_legend);

    gui.add_item('Realtime Raycast', false, {folder_name: 'Misc'})
      .onChange((v) =>{
        this.canvas.disable_raycast = !v;
      });

    // check if it's chome browser
    gui.add_item('Viewer Title', '', {folder_name: 'Default'})
      .onChange((v) => {
        this.canvas.title = v;
        this.canvas.start_animation(0);
      });

    gui.add_item('Reset Camera [M]', () => {this.canvas.reset_controls()}, {folder_name: 'Default'});

    if( this.settings.side_camera ){
      gui.add_item('Hide Canvas [S]', false, {folder_name: 'Default'})
        .onChange((v) => {
          if( v ){
            this.canvas.disable_side_cameras();
          }else{
            this.canvas.enable_side_cameras();
          }
        });
      gui.add_item('Reset Canvas [S]', () => {this.canvas.reset_side_canvas( true, true )},
                    {folder_name: 'Default'});

      // side plane
      const _controller_coronal = gui.add_item('Coronal (P - A)', 0, {folder_name: 'Default'})
        .min(-128).max(128).step(1).onChange((v) => {
          this.canvas.set_coronal_depth( v );
        });
      const _controller_axial = gui.add_item('Axial (I - S)', 0, {folder_name: 'Default'})
        .min(-128).max(128).step(1).onChange((v) => {
          this.canvas.set_axial_depth( v );
        });
      const _controller_sagittal = gui.add_item('Sagittal (L - R)', 0, {folder_name: 'Default'})
        .min(-128).max(128).step(1).onChange((v) => {
          this.canvas.set_sagittal_depth( v );
        });
      this.canvas.set_side_depth = (c, a, s) => {
        _controller_coronal.setValue( c || 0 );
        _controller_axial.setValue( a || 0 );
        _controller_sagittal.setValue( s || 0 );
      };

      gui.add_item('Overlay Viewers', 'none', {args: ['none','coronal','axial','sagittal'], folder_name: 'Default'})
        .onChange( this.canvas.set_side_visibility );
    }

    return(gui);

  }

  _set_loader_callbacks(){
    this.canvas.loader_manager.onLoad = () => {
      console.debug(this.outputId + ' - Loading complete. Adding object');
      // this.el_text2.innerHTML = '';
      if( this.hide_controls ){
        this.el_text.innerHTML = '';
      }else{
        this.el_text.innerHTML = '<p><small>Loading Complete!</small></p>';
      }

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

      let gui = this._register_gui_control();
      this._set_info_callback();

      // Generate animations
      this.canvas.generate_animation_clips();

      this.canvas.start_animation(0);

      // If has animation, then enable it
      if( this.has_animation ){
        let c = gui.get_controller('Play/Pause', 'Timeline');
        if( typeof( c.setValue ) === 'function' ){
          c.setValue(true);
        }
      }

    };

    this.canvas.loader_manager.onProgress = ( url, itemsLoaded, itemsTotal ) => {

    	let path = /\/([^/]*)$/.exec(url)[1],
    	    msg = '<p><small>Loading file: ' + itemsLoaded + ' of ' + itemsTotal + ' files.<br>' + path + '</small></p>';

      if(this.DEBUG){
        console.debug(msg);
      }

      this.el_text.innerHTML = msg;

    };


  }

  _set_info_callback(){
    this.canvas.add_mouse_callback(
      (evt) => {
        return({
          pass  : evt.action === 'click' || evt.action === 'dblclick',
          type  : 'clickable'
        });
      },
      ( res, evt ) => {
        const obj = res.target_object;
        if( obj && obj.userData ){
          let g = obj.userData.construct_params,
            pos = obj.getWorldPosition( new THREE.Vector3() );

          // Get information and show them on screen
          let group_name = g.group ? g.group.group_name : '(No Group)';

          let shiny_data = {
            object: g,
            group: group_name,
            position: pos,
            event: evt
          };
          this.shiny.to_shiny(shiny_data, '_mouse_event');
        }
      },
      'show_info'
    );

    /* this.canvas.set_animation_callback((obj, v, t) => {
      let txt = '';
      if( obj === undefined || this.hide_controls ){
        this.set_legend_value(
          [0],[0], ''
        );
      }else{
        if( typeof(v) !== 'number' ){
          v = 'NA';
        }else{
          v = v.toFixed(2);
        }

        txt = `Value: ${v}`;

        if(this.has_animation && typeof(t) === 'number'){
          txt = `Time: ${t.toFixed(2)} \nValue: ${v}`;
        }

        try {
          this.set_legend_value(
            to_array( obj.userData.ani_time ),
            to_array( obj.userData.ani_value ),
            txt
          );
        } catch (e) {}

      }

      // Purely for video export only
      if( obj && obj.userData ){
        let g = obj.userData.construct_params,
            pos = obj.getWorldPosition( new THREE.Vector3() );
        // Get information and show them on screen
        let group_name = g.group ? g.group.group_name : '(No Group)';

        txt = `${g.name} \n Group: ${group_name} \n Global Position: (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)}) \n ${g.custom_info || ''} \n ${txt}`;
      }

      return(txt);

    }); */

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

    /*
    // sparks
    this.legend_data.layout[0].xlim = this.settings.time_range;
    this.legend_data.layout[0].ylim = this.settings.value_range;
    this.legend_data.content.sparks.axis[0].at = make_sequence(this.settings.time_range, 4, true);
    this.legend_data.content.sparks.axis[1].at = make_sequence(this.settings.value_range, 4, true);

    // colorbar
    this.legend_data.layout[1].xlim = [1,1];
    this.legend_data.layout[1].ylim = this.settings.value_range;
    this.legend_data.layout[1].zlim = this.settings.value_range;
    this.legend_data.content.colorbar.axis[0].at = make_sequence(this.settings.value_range, 4, true);
    this.legend_data.content.colorbar.data = {
      'x' : [1], 'y' : make_sequence(this.settings.value_range, 100, false),
      'z' : [make_sequence(this.settings.value_range, 100, false)]
    };

    this.legend_data.content.colorbar.geom_traces.heatmap.palette = this.settings.colors.map((v) => { return(v[1].replace(/^0x/, '#')) });

    // render legend
    if( this.show_legend ){
      this.legend._render_graph('colorbar');
      this.legend._render_graph('sparks');
    }
    */

    this.canvas.pause_animation(9999);
    this.canvas.clear_all();

    this.canvas.set_time_range(
      this.settings.time_range[0],
      this.settings.time_range[1]
    );

    this.canvas.set_colormap(
      this.settings.colors,
      this.settings.value_range[0],
      this.settings.value_range[1],
      this.outputId
    );

    // load data
    this.canvas.loader_triggered = false;

    // Register some callbacks
    this._set_loader_callbacks();

    this.groups.forEach((g) => {

      this.canvas.add_group(g, this.settings.cache_folder);

    });

    // Make sure the data loading process is on
    if( !this.canvas.loader_triggered ){
      this.canvas.loader_manager.onLoad();
    }

    // controller center
    this.canvas.update_control_center( this.settings.control_center );

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
      this.canvas.enable_side_cameras();
      this.canvas.side_renderer.compile( this.canvas.scene, this.canvas.side_canvas.coronal.camera );
      this.canvas.side_renderer.compile( this.canvas.scene, this.canvas.side_canvas.axial.camera );
      this.canvas.side_renderer.compile( this.canvas.scene, this.canvas.side_canvas.sagittal.camera );
    }else{
      this.canvas.disable_side_cameras();
    }

    // Force render canvas
    // Resize widget in case control panel is hidden
    this.hide_controls = this.settings.hide_controls || false;
    this.resize_widget( this.el.clientWidth, this.el.clientHeight );
    this.canvas.render();
  }
}

window.BrainCanvas = BrainCanvas;
window.THREEBRAIN_STORAGE = THREEBRAIN_STORAGE;
window.THREE = THREE;
window.d3 = d3;
window.download = download;
export { BrainCanvas };
