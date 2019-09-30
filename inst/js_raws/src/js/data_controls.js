import { THREE } from './threeplugins.js';
import * as dat from './libs/dat.gui.module.js';
import { add_electrode, is_electrode } from './geometry/sphere.js';
import { invertColor, to_array, get_or_default } from './utils.js';
import { CONSTANTS } from './constants.js';
import { CCanvasRecorder } from './capture/CCanvasRecorder.js';
// Some presets for gui and canvas


function has_meta_keys( event, shift = true, ctrl = true, alt = true){
  let v1 = 0 + event.shiftKey + event.ctrlKey * 2 + event.altKey * 4,
      v2 = 0 + shift + ctrl * 2 + alt * 4;
  if( v1 === v2 ){
    return(true);
  }
  return( false );
}
/**
 * @author: Zhengjia Wang
 * Defines model (logic) part for dat.GUI
 */
class THREEBRAIN_PRESETS{

  /**
   * Initialization, defines canvas (viewer), gui controller (viewer), and settings (initial values)
   */
  constructor(canvas, gui, settings, shiny){
    this.canvas = canvas;
    this.gui = gui;
    this.settings = settings;
    this.shiny = shiny;

    this.electrode_regexp = RegExp('^electrodes-(.+)$');

    // Min max of animation time
    this.animation_time = [0,1];

  }

  /**
   * wrapper for canvas.start_animation and pause_animation
   */
  _update_canvas(level = 0){
    if(level >= 0){
      this.canvas.start_animation(level);
    }else{
      this.canvas.pause_animation(-level);
    }
  }


  // ------------------------------ Defaults -----------------------------------
  // toc (table of contents):
  // 1. Background colors
  // 2. Record Videos
  // 3. Reset Camera
  // 4. Camera Position
  // 5. display anchor
  // 6. toggle side panel
  // 7. reset side panel position
  // 8. coronal, axial, sagittal position (depth)
  // 9. Electrode visibility in side canvas
  // 10. subject code
  // 11. surface type


  // 1. Background colors
  c_background(){
    const initial_bgcolor = "#ffffff",
          folder_name = CONSTANTS.FOLDERS['background-color'];

    this.gui.add_item('Background Color', initial_bgcolor, {is_color : true, folder_name: folder_name})
      .onChange((v) => {

        // calculate inversed color for text
        const inversedColor = invertColor(v);

        this.canvas.background_color = v;
        this.canvas.foreground_color = inversedColor;

        // Set renderer background to be v
        this.canvas.main_renderer.setClearColor(v);
        this.canvas.side_renderer.setClearColor(v);

        // this.el_text.style.color=inversedColor;
        // this.el_text2.style.color=inversedColor;
        // this.el.style.backgroundColor = v;

        // force re-render
        this._update_canvas(0);
      });
  }


  // 2. Record Videos
  c_recorder(){
    const folder_name = CONSTANTS.FOLDERS[ 'video-recorder' ];
    this.gui.add_item('Record Video', false, {folder_name: folder_name })
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

  }

  // 3. Reset Camera
  c_reset_camera(){
    const folder_name = CONSTANTS.FOLDERS[ 'reset-main-camera' ];
    this.gui.add_item('Reset', () => {
      // Center camera first.
      this.canvas.handle_resize( undefined, undefined, false, true );
      this.canvas.reset_controls();
      this.canvas.controls.enabled = true;
    }, {folder_name: folder_name});
  }

  // 4. Camera Position
  c_main_camera_position(){
    const folder_name = CONSTANTS.FOLDERS[ 'main-camera-position' ];
    const camera_pos = this.gui.add_item('Camera Position', '[free rotate]', {
      args : ['[free rotate]', '[lock]', 'right', 'left', 'anterior', 'posterior', 'superior', 'inferior'],
      folder_name : folder_name
    }).onChange((v) => {

      if( v === '[lock]' ){
        this.canvas.controls.enabled = false;
        return( null );
      }
      this.canvas.controls.enabled = true;

      switch (v) {
        case 'right':
          this.canvas.main_camera.position.set( 500, 0, 0 );
          this.canvas.main_camera.up.set( 0, 0, 1 );
          break;
        case 'left':
          this.canvas.main_camera.position.set( -500, 0, 0 );
          this.canvas.main_camera.up.set( 0, 0, 1 );
          break;
        case 'anterior':
          this.canvas.main_camera.position.set( 0, 500, 0 );
          this.canvas.main_camera.up.set( 0, 0, 1 );
          break;
        case 'posterior':
          this.canvas.main_camera.position.set( 0, -500, 0 );
          this.canvas.main_camera.up.set( 0, 0, 1 );
          break;
        case 'superior':
          this.canvas.main_camera.position.set( 0, 0, 500 );
          this.canvas.main_camera.up.set( 0, 1, 0 );
          break;
        case 'inferior':
          this.canvas.main_camera.position.set( 0, 0, -500 );
          this.canvas.main_camera.up.set( 0, -1, 0 );
          break;
      }

      camera_pos.__select.value = '[free rotate]';

      this._update_canvas();
    });
  }

  // 5. display anchor
  c_toggle_anchor(){
    const folder_name = CONSTANTS.FOLDERS[ 'toggle-helpper' ];
    this.gui.add_item('Display Helpers', false, { folder_name: folder_name })
      .onChange((v) => {
        this.canvas.set_cube_anchor_visibility(v);
      });
  }

  // 6. toggle side panel
  c_toggle_side_panel(){
    const folder_name = CONSTANTS.FOLDERS[ 'toggle-side-panels' ];
    const _v = this.settings.side_display || false;
    const show_side = this.gui.add_item('Show Panels', _v, {folder_name: folder_name})
      .onChange((v) => {
        if( v ){
          this.canvas.enable_side_cameras();
        }else{
          this.canvas.disable_side_cameras();
        }
      });


    if( _v ){
      this.canvas.enable_side_cameras();
    }else{
      this.canvas.disable_side_cameras();
    }


  }



  // 7. reset side panel position
  c_reset_side_panel(){
    const folder_name = CONSTANTS.FOLDERS[ 'reset-side-panels' ],
          zoom_level = this.settings.side_canvas_zoom,
          side_width = this.settings.side_canvas_width,
          side_shift = this.settings.side_canvas_shift;
    this.gui.add_item('Reset Position', () => {
      this.canvas.reset_side_canvas( zoom_level, side_width, side_shift );
    }, {folder_name: folder_name});

    // reset first
    this.canvas.reset_side_canvas( zoom_level, side_width, side_shift );
  }

  // 8. coronal, axial, sagittal position (depth)
  c_side_depth(){
    const folder_name = CONSTANTS.FOLDERS[ 'side-three-planes' ];

    // side plane
    const _controller_coronal = this.gui
      .add_item('Coronal (P - A)', 0, {folder_name: folder_name})
      .min(-128).max(128).step(1).onChange((v) => {
        this.canvas.set_coronal_depth( v );
      });
    const _controller_axial = this.gui
      .add_item('Axial (I - S)', 0, {folder_name: folder_name})
      .min(-128).max(128).step(1).onChange((v) => {
        this.canvas.set_axial_depth( v );
      });
    const _controller_sagittal = this.gui
      .add_item('Sagittal (L - R)', 0, {folder_name: folder_name})
      .min(-128).max(128).step(1).onChange((v) => {
        this.canvas.set_sagittal_depth( v );
      });
    [ _controller_coronal, _controller_axial, _controller_sagittal ].forEach((_c) => {
      _c.domElement.addEventListener('mousewheel', (evt) => {
        if( evt.altKey ){
          evt.preventDefault();
          const current_val = _c.getValue();
          _c.setValue( current_val + evt.deltaY );
        }
      });
    });

    this.canvas.set_side_depth = (c, a, s) => {
      if( typeof c === 'number' ){
        _controller_coronal.setValue( c );
      }
      if( typeof a === 'number' ){
        _controller_axial.setValue( a || 0 );
      }
      if( typeof s === 'number' ){
        _controller_sagittal.setValue( s || 0 );
      }
    };

    const overlay_coronal = this.gui.add_item('Overlay Coronal', false, {folder_name: 'Side Canvas'})
      .onChange((v) => {
        this.canvas.set_side_visibility('coronal', v);
      });

    const overlay_axial = this.gui.add_item('Overlay Axial', false, {folder_name: 'Side Canvas'})
      .onChange((v) => {
        this.canvas.set_side_visibility('axial', v);
      });

    const overlay_sagittal = this.gui.add_item('Overlay Sagittal', false, {folder_name: 'Side Canvas'})
      .onChange((v) => {
        this.canvas.set_side_visibility('sagittal', v);
      });

    // register overlay keyboard shortcuts
    this.canvas.add_keyboard_callabck( CONSTANTS.KEY_OVERLAY_CORONAL, (evt) => {
      if( has_meta_keys( evt.event, true, false, false ) ){
        const _v = overlay_coronal.getValue();
        overlay_coronal.setValue( !_v );
      }
    }, 'overlay_coronal');

    this.canvas.add_keyboard_callabck( CONSTANTS.KEY_MOVE_CORONAL, (evt) => {
      const _v = _controller_coronal.getValue();
      if( has_meta_keys( evt.event, true, false, false ) ){
        _controller_coronal.setValue( _v - 1 );
      }else if( has_meta_keys( evt.event, false, false, false ) ){
        _controller_coronal.setValue( _v + 1 );
      }
    }, 'move_coronal');


    this.canvas.add_keyboard_callabck( CONSTANTS.KEY_OVERLAY_AXIAL, (evt) => {
      if( has_meta_keys( evt.event, true, false, false ) ){
        const _v = overlay_axial.getValue();
        overlay_axial.setValue( !_v );
      }
    }, 'overlay_axial');

    this.canvas.add_keyboard_callabck( CONSTANTS.KEY_MOVE_AXIAL, (evt) => {
      const _v = _controller_axial.getValue();
      if( has_meta_keys( evt.event, true, false, false ) ){
        _controller_axial.setValue( _v - 1 );
      }else if( has_meta_keys( evt.event, false, false, false ) ){
        _controller_axial.setValue( _v + 1 );
      }
    }, 'move_axial');

    this.canvas.add_keyboard_callabck( CONSTANTS.KEY_OVERLAY_SAGITTAL, (evt) => {
      if( has_meta_keys( evt.event, true, false, false ) ){
        const _v = overlay_sagittal.getValue();
        overlay_sagittal.setValue( !_v );
      }
    }, 'overlay_sagittal');

    this.canvas.add_keyboard_callabck( CONSTANTS.KEY_MOVE_SAGITTAL, (evt) => {
      const _v = _controller_sagittal.getValue();
      if( has_meta_keys( evt.event, true, false, false ) ){
        _controller_sagittal.setValue( _v - 1 );
      }else if( has_meta_keys( evt.event, false, false, false ) ){
        _controller_sagittal.setValue( _v + 1 );
      }
    }, 'move_sagittal');
  }

  // 9. Electrode visibility in side canvas
  c_side_electrode_dist(){
    const folder_name = CONSTANTS.FOLDERS[ 'side-electrode-dist' ];
    // show electrodes trimmed
    this.gui.add_item('Dist. Threshold', 2, { folder_name: folder_name })
      .min(0).max(64).step(0.1)
      .onChange((v) => {
        this.canvas.trim_electrodes( v );
        this._update_canvas();
      });
    this.canvas.trim_electrodes( 2 );
  }

  // 10. subject code
  c_subject2(){
    // Get subjects
    const folder_name = CONSTANTS.FOLDERS[ 'subject-selector' ],
          subject_ids = this.canvas.subject_codes;

    if( subject_ids.length > 0 ){
      let _s = this.canvas.state_data.get( 'target_subject' ) || subject_ids[0];
      this.gui.add_item('Subject', _s, {
        folder_name : folder_name,
        args : subject_ids
      }).onChange((v) => {
        this.canvas.switch_subject( v );
      });

      this.canvas.switch_subject();
    }else{
      // controller center
      this.canvas.update_control_center( this.settings.control_center );
    }

  }

  // 11. surface type
  c_surface_type2(){

    const folder_name = CONSTANTS.FOLDERS[ 'surface-selector' ],
    _s = this.canvas.state_data.get( 'surface_type' ) || 'pial',
          _c = this.canvas.get_surface_types();

    if( _c.length === 0 ){
      return(null);
    }
    const surf_type = this.gui.add_item('Surface Type', _s, {
        args : _c,
        folder_name : folder_name
      }).onChange((v) => {
        this.canvas.switch_subject( '/', {
          'surface_type': v
        });
      });

    this.canvas.add_keyboard_callabck( CONSTANTS.KEY_CYCLE_SURFACE, (evt) => {
      if( has_meta_keys( evt.event, false, false, false ) ){
        let current_idx = (_c.indexOf( surf_type.getValue() ) + 1) % _c.length;
        if( current_idx >= 0 ){
          surf_type.setValue( _c[ current_idx ] );
        }
      }
    }, 'gui_surf_type2');
  }

  // 12. Hemisphere material/transparency
  c_hemisphere_material(){

    const folder_name = CONSTANTS.FOLDERS[ 'hemisphere-material' ],
          options = ['normal', 'wireframe', 'hidden'];

    const lh_ctrl = this.gui.add_item('Left Hemisphere', 'normal', { args : options, folder_name : folder_name })
      .onChange((v) => {
        this.canvas.switch_subject( '/', { 'material_type_left': v });
      });

    const rh_ctrl = this.gui.add_item('Right Hemisphere', 'normal', { args : options, folder_name : folder_name })
      .onChange((v) => {
        this.canvas.switch_subject( '/', { 'material_type_right': v });
      });

    const lh_trans = this.gui.add_item('Left Opacity', 1.0, { folder_name : folder_name })
    .min( 0.1 ).max( 1 ).step( 0.1 )
      .onChange((v) => {
        this.canvas.switch_subject( '/', { 'surface_opacity_left': v });
      });

    const rh_trans = this.gui.add_item('Right Opacity', 1.0, { folder_name : folder_name })
    .min( 0.1 ).max( 1 ).step( 0.1 )
      .onChange((v) => {
        this.canvas.switch_subject( '/', { 'surface_opacity_right': v });
      });

    // add keyboard shortcut
    this.canvas.add_keyboard_callabck( CONSTANTS.KEY_CYCLE_LEFT, (evt) => {
      if( has_meta_keys( evt.event, true, false, false ) ){
        let current_opacity = lh_trans.getValue() - 0.3;
        if( current_opacity < 0 ){ current_opacity = 1; }
        lh_trans.setValue( current_opacity );
      }else if( has_meta_keys( evt.event, false, false, false ) ){
        let current_idx = (options.indexOf( lh_ctrl.getValue() ) + 1) % options.length;
        if( current_idx >= 0 ){
          lh_ctrl.setValue( options[ current_idx ] );
        }
      }
    }, 'gui_left_cycle');

    this.canvas.add_keyboard_callabck( CONSTANTS.KEY_CYCLE_RIGHT, (evt) => {
      if( has_meta_keys( evt.event, true, false, false ) ){
        let current_opacity = rh_trans.getValue() - 0.3;
        if( current_opacity < 0 ){ current_opacity = 1; }
        rh_trans.setValue( current_opacity );
      }else if( has_meta_keys( evt.event, false, false, false ) ){
        let current_idx = (options.indexOf( rh_ctrl.getValue() ) + 1) % options.length;
        if( current_idx >= 0 ){
          rh_ctrl.setValue( options[ current_idx ] );
        }
      }
    }, 'gui_right_cycle');
  }

  // 13. electrode visibility, highlight, groups
  set_electrodes_visibility( v ){
    if( !this._controller_electrodes ){
      return(false);
    }
    if( this._ani_status ){
      this._ani_status.setValue( false );
    }

    // render electrode colors by subjects
    this.canvas.subject_codes.forEach((subject_code, ii) => {
      to_array( this.canvas.electrodes.get( subject_code ) ).forEach((e) => {
        this._electrode_visibility( e , ii , v );
      });
    });

    this._update_canvas();
    return(true);
  }
  c_electrodes(){
    const folder_name = CONSTANTS.FOLDERS[ 'electrode-style' ];
    const show_inactives = this.settings.show_inactive_electrodes;
    const vis_types = ['all visible', 'hide inactives', 'hidden'];

    // please check if el is electrode before dumpping into this function
    this._electrode_visibility = (el, ii, v) => {
      if( !is_electrode( el ) ){
        return(null);
      }
      switch (v) {
        case 'hidden':
          // el is invisible
          el.visible = false;
          break;
        case 'hide inactives':
          if( el.material.isMeshLambertMaterial ){
            el.visible = false;
          }else{
            el.visible = true;
          }
          break;
        default:
          el.visible = true;
      }
    };

    this._controller_electrodes = this.gui.add_item('Electrodes', show_inactives? 'all visible': 'hide inactives', {
      args : vis_types,
      folder_name : folder_name
    }).onChange((v) => {
      this.set_electrodes_visibility( v );
    });

    // Add shortcuts
    this.canvas.add_keyboard_callabck( CONSTANTS.KEY_CYCLE_ELEC_VISIBILITY, (evt) => {
      if( has_meta_keys( evt.event, false, false, false ) ){
        let current_idx = (vis_types.indexOf( this._controller_electrodes.getValue() ) + 1) % vis_types.length;
        if( current_idx >= 0 ){
          this._controller_electrodes.setValue( vis_types[ current_idx ] );
        }
      }
    }, 'gui_c_electrodes');

  }


  // 14. electrode mapping
  c_map_template(){
    const folder_name = CONSTANTS.FOLDERS[ 'electrode-mapping' ];
    const subject_codes = ['[no mapping]', ...this.canvas.subject_codes];

    const do_mapping = this.gui.add_item('Map Electrodes', false, { folder_name : folder_name })
      .onChange((v) => {
        this.canvas.switch_subject( '/', { 'map_template': v });
      });

    this.gui.add_item('Surface', 'std.141', {
      args : ['std.141', 'mni305', 'no mapping'],
      folder_name : folder_name })
      .onChange((v) => {
        this.canvas.switch_subject( '/', { 'map_type_surface': v });
      });

    this.gui.add_item('Volume', 'mni305', {
      args : ['mni305', 'no mapping'],
      folder_name : folder_name })
      .onChange((v) => {
        this.canvas.switch_subject( '/', { 'map_type_volume': v });
      });

    // need to check if this is multiple subject case
    if( this.canvas.shared_data.get(".multiple_subjects") ){
      // Do mapping by default
      do_mapping.setValue( true );
      // and open gui
      this.gui.open_folder( folder_name );
    }

  }

  // 15. animation, play/pause, speed, clips...
  set_animation_time(v){
    if(this._ani_time){
      if(typeof(v) !== 'number'){
        v = this.animation_time[0];
      }
      this._ani_time.setValue( v );
    }
  }
  get_animation_params(){
    if(this._ani_time && this._ani_speed && this._ani_status){
      return({
        play : this._ani_status.getValue(),
        time : this._ani_time.getValue(),
        speed : this._ani_speed.getValue(),
        min : this.animation_time[0],
        max : this.animation_time[1]
      });
    }else{
      return({
        play : false,
        time : 0,
        speed : 0,
        min : 0,
        max : 0
      });
    }
  }
  c_animation(){

    // Check if animation is needed
    if( to_array( this.settings.color_maps ).length === 0 ){
      return(false);
    }

    // Animation is needed
    const step = 0.001,
          folder_name = CONSTANTS.FOLDERS[ 'animation' ];

    let names = Object.keys( this.settings.color_maps ),
        initial = this.settings.default_colormap;

    // Make sure the initial value exists, and [No Color] is included in the option
    names = [...new Set(['[No Color]', ...names])];

    if( !initial || !names.includes( initial ) || initial.startsWith('[') ){
      initial = undefined;
      names.forEach((_n) => {
        if( !initial && !_n.startsWith('[') ){
          initial = _n;
        }
      });
    }

    if( !initial ){
      initial = '[No Color]';
    }


    // Link functions to canvas (this is legacy code and I don't want to change it unless we rewrite the animation code)
    this.canvas.animation_controls.set_time = ( v ) => {
      this.set_animation_time( v );
    };
    this.canvas.animation_controls.get_params = () => { return( this.get_animation_params() ); };

    // Defines when clip name is changed (variable changed)
    const _ani_name_onchange = (v) => {
      // Generate animations
      this.canvas.generate_animation_clips( v, true, (cmap) => {
        if( !cmap ){
          legend_visible.setValue(false);
          if( v === '[No Color]' ){
            this.canvas.electrodes.forEach((_d) => {
              for( let _kk in _d ){
                _d[ _kk ].visible = true;
              }
            });
          }
        }else{
          this._ani_time.min( cmap.time_range[0] ).max( cmap.time_range[1] );
          // min = cmap.time_range[0];
          // max = cmap.time_range[1];
          this.animation_time[0] = cmap.time_range[0];
          this.animation_time[1] = cmap.time_range[1];
          this.set_animation_time( this.animation_time[0] );
          legend_visible.setValue(true);

          // If inactive electrodes are hidden, re-calculate visibility
          if( this._controller_electrodes ){
            this.set_electrodes_visibility( this._controller_electrodes.getValue() );
          }
          // reset color-range
          val_range.setValue(',');
          if( cmap.value_type === 'continuous' ){
            this.gui.show_item(['Value Range'], folder_name);
          }else{
            this.gui.hide_item(['Value Range'], folder_name);
          }

        }
        this._update_canvas();
      });
    };

    const ani_name = this.gui.add_item('Clip Name', initial, { folder_name : folder_name, args : names })
      .onChange((v) => { _ani_name_onchange( v ); });
    const val_range = this.gui.add_item('Value Range', ',', { folder_name : folder_name })
      .onChange((v) => {
        let ss = v;
        if( v.match(/[^0-9,-.]/) ){
          // illegal chars
          ss = Array.from(v).map((s) => {
            return( '0123456789.,-'.indexOf(s) === -1 ? '' : s );
          }).join('');
        }
        let vr = ss.split(',');
        if( vr.length === 2 ){
          vr[0] = parseFloat( vr[0] );
          vr[1] = parseFloat( vr[1] );
        }
        if( !isNaN( vr[0] ) && !isNaN( vr[1] ) ){
          // Set cmap value range
          this.canvas.switch_colormap( undefined, vr );
          // reset animation tracks
          this.canvas.generate_animation_clips( ani_name.getValue() , true );
        }

      });


    this._ani_status = this.gui.add_item('Play/Pause', false, { folder_name : folder_name });
    this._ani_status.onChange((v) => { if(v){ this._update_canvas(2); }else{ this._update_canvas(-2); } });

    this._ani_speed = this.gui.add_item('Speed', 1, {
      args : { 'x 0.1' : 0.1, 'x 0.2': 0.2, 'x 0.5': 0.5, 'x 1': 1, 'x 2':2, 'x 5':5},
      folder_name : folder_name
    });

    this.gui.add_item('Time', this.animation_time[0], { folder_name : folder_name })
        .min(this.animation_time[0]).max(this.animation_time[1]).step(step).onChange((v) => {this._update_canvas()});
    this._ani_time = this.gui.get_controller('Time', folder_name);

    this._ani_time.domElement.addEventListener('mousewheel', (evt) => {
      if( evt.altKey ){
        evt.preventDefault();
        const current_val = this._ani_time.getValue();
        this._ani_time.setValue( current_val + Math.sign( evt.deltaY ) * step );
      }
    });

    // Add keyboard shortcut
    this.canvas.add_keyboard_callabck( CONSTANTS.KEY_TOGGLE_ANIMATION, (evt) => {
      if( has_meta_keys( evt.event, false, false, false ) ){
        const is_playing = this._ani_status.getValue();
        this._ani_status.setValue( !is_playing );
      }
    }, 'gui_toggle_animation');

    this.canvas.add_keyboard_callabck( CONSTANTS.KEY_CYCLE_ANIMATION, (evt) => {
      if( has_meta_keys( evt.event, false, false, false ) ){
        let current_idx = (names.indexOf( ani_name.getValue() ) + 1) % names.length;
        if( current_idx >= 0 ){
          ani_name.setValue( names[ current_idx ] );
        }
      }
    }, 'gui_cycle_animation');


    let render_legend = this.settings.show_legend;
    const legend_visible = this.gui.add_item('Show Legend', true, {folder_name: folder_name })
      .onChange((v) => {
        this.canvas.render_legend = v;
        this._update_canvas(0);
      });
    this.canvas.render_legend = render_legend;

    _ani_name_onchange( initial );

    this.gui.open_folder( folder_name );

  }

  // 16.




  // -------------------------- New version --------------------------




  c_electrode_localization(folder_name = 'Electrode Localization (Beta)'){

    this.canvas.electrodes.set( '__localization__', [] );

    /** UI:
     * 1. edit mode (checkbox)
     * 2. electrode number (positive integer)
     * 3. electrode location (string)
     * 4. electrode label
     * 5. Surface or Depth
    */
    // function to get electrode info and update dat.GUI
    // idx is from 0 - (electrode count -1)
    const switch_electrode = ( v ) => {

      let _el = get_electrode( v );
      if( !_el ){
        // use default settings
        elec_position_r.setValue( 0 );
        elec_position_a.setValue( 0 );
        elec_position_s.setValue( 0 );
        // elec_label.setValue('');
      }else{
        elec_position_r.setValue( _el.position.x );
        elec_position_a.setValue( _el.position.y );
        elec_position_s.setValue( _el.position.z );
        // elec_label.setValue( _el.userData.construct_params.custom_info || '' );

        let electrode_is_surface = _el.userData.construct_params.is_surface_electrode === true;
        elec_surface.setValue( electrode_is_surface ? 'Surface' : 'Depth' );

        this.canvas.focus_object( _el );
      }
    };
    const get_electrode = (el_num) => {
      const group = this.canvas.electrodes.get('__localization__');
      if( !group ){
        return( undefined );
      }

      return( group[ `__localization__, ${el_num === undefined? Math.max( 1, Math.round( elec_number.getValue() ) ) : el_num} - ` ] );
    };

    const edit_mode = this.gui.add_item( 'Editing Mode', 'disabled', {
      folder_name: folder_name,
      args: ['disabled', 'new electrodes', 'modification']
    } )
      .onChange( (v) => {
        this.canvas.edit_mode = (v !== 'disabled');
        this.edit_mode = v;
        this.gui.hide_item([ 'Remove Electrode', 'Number', 'Sub Label', 'Position-[R]', 'Position-[A]',
                             'Position-[S]', 'Group Label', 'Electrode type' ], folder_name);
        if( v === 'new electrodes' ){
          this.gui.show_item([ 'Number', 'Electrode type' ], folder_name);
          new_electrode();
        }else if( v === 'modification' ){
          this.gui.show_item([ 'Remove Electrode', 'Sub Label', 'Position-[R]', 'Position-[A]',
                             'Position-[S]', 'Group Label' ], folder_name);
        }
      } );

    const elec_number = this.gui.add_item( 'Number', 1, { folder_name: folder_name} ).min( 1 ).step( 1 )
      .onChange( (v) => {
        if( this.canvas.edit_mode ){
          v = Math.max( Math.round( v ) , 1 );
          switch_electrode( v );
          this._update_canvas();

          // send electrode information to shiny
          this.shiny.loc_electrode_info( true );
        }
      } );

    // const st = canvas.get_surface_types().concat( canvas.get_volume_types() );
    const elec_surface = this.gui.add_item( 'Electrode type', 'Surface', {
      folder_name: folder_name, args: ['Surface', 'Depth']
    } ).onChange((v) => {
      if( this.canvas.edit_mode ){
        let el = get_electrode();
        if( el ){
          el.userData.construct_params.is_surface_electrode = (v === 'Surface');
        }
        if( v === 'Depth' ){
          this.gui.get_controller('Overlay Coronal', 'Side Canvas').setValue( true );
          this.gui.get_controller('Overlay Axial', 'Side Canvas').setValue( true );
          this.gui.get_controller('Overlay Sagittal', 'Side Canvas').setValue( true );
          this.gui.get_controller('Left Hemisphere', 'Geometry').setValue( 'hidden' );
          this.gui.get_controller('Right Hemisphere', 'Geometry').setValue( 'hidden' );
        }else if ( v === 'Surface' ){
          this.gui.get_controller('Left Hemisphere', 'Geometry').setValue( 'normal' );
          this.gui.get_controller('Right Hemisphere', 'Geometry').setValue( 'normal' );
        }
      }
    });

    const elec_position_r = this.gui.add_item( 'Position-[R]', 0, { folder_name: folder_name} )
      .min(-128).max(128).step(0.01).onChange((v) => {
        if( this.canvas.edit_mode !== true ){ return( null ); }
        const el = get_electrode();
        if( el ){
          el.position.x = v;
          el.userData.construct_params.position[0] = v;
          el.userData.construct_params.vertex_number = -1;
          el.userData.construct_params._distance_to_surf = -1;
          el.userData.construct_params.hemisphere = 'NA';
          this.shiny.loc_electrode_info( true );
        }
        this._update_canvas();
      });
    const elec_position_a = this.gui.add_item( 'Position-[A]', 0, { folder_name: folder_name} )
      .min(-128).max(128).step(0.01).onChange((v) => {
        if( this.canvas.edit_mode !== true ){ return( null ); }
        const el = get_electrode();
        if( el ){
          el.position.y = v;
          el.userData.construct_params.position[1] = v;
          el.userData.construct_params.vertex_number = -1;
          el.userData.construct_params._distance_to_surf = -1;
          el.userData.construct_params.hemisphere = 'NA';
          this.shiny.loc_electrode_info( true );
        }
        this._update_canvas();
      });
    const elec_position_s = this.gui.add_item( 'Position-[S]', 0, { folder_name: folder_name} )
      .min(-128).max(128).step(0.01).onChange((v) => {
        if( this.canvas.edit_mode !== true ){ return( null ); }
        const el = get_electrode();
        if( el ){
          el.position.z = v;
          el.userData.construct_params.position[2] = v;
          el.userData.construct_params.vertex_number = -1;
          el.userData.construct_params._distance_to_surf = -1;
          el.userData.construct_params.hemisphere = 'NA';
          this.shiny.loc_electrode_info( true );
        }
        this._update_canvas();
      });


    const elec_group_label = this.gui.add_item( 'Group Label', '', { folder_name: folder_name} )
      .onChange((v) => {
        elec_sub_label.setValue( 0 );
      });
    const elec_sub_label = this.gui.add_item( 'Sub Label', 0, { folder_name: folder_name} ).min(0).step(1);

    const new_electrode = () => {
      let next_elnum = 1;
      to_array( this.canvas.electrodes.get("__localization__") ).forEach((el) => {
        let el_num = el.userData.electrode_number || 1;
        if( next_elnum <= el_num ){
          next_elnum = el_num + 1;
        }
      });
      elec_number.setValue( next_elnum );
      this._update_canvas();
    };

    this.gui.hide_item([ 'Remove Electrode', 'Number', 'Position', 'Sub Label', 'Position-[R]',
        'Position-[A]', 'Position-[S]', 'Group Label', 'Electrode type' ], folder_name);


    // callback 1: focus electrode
    this.canvas.add_mouse_callback(
      (evt) => {
        // If single click, focus on electrode
        if( evt.action === 'click' && this.canvas.group.has( '__electrode_editor__' ) ){
          return({ pass  : true, type  : this.canvas.group.get( '__electrode_editor__' ).children });
        }
        return({ pass: false });
      },
      ( res, evt ) => {
        if( !res.target_object ){ return(null); }
        this.canvas.focus_object( res.target_object );
        this._update_canvas();

        if( this.edit_mode === 'modification' ){
          const _n = res.target_object.userData.electrode_number || 0;
          if( _n > 0 ){
            elec_number.setValue( _n );
          }

        }
      },
      'electrode_editor_focus'
    );

    // callback 2: double click to add electrode
    this.canvas.add_mouse_callback(
      (evt) => {
        // If double click + new electrodes
        if( evt.action === 'dblclick' && this.edit_mode === 'new electrodes' ){
          const is_surface = elec_surface.getValue() === 'Surface',
                current_subject = this.canvas.state_data.get("target_subject");
          if( !current_subject ){
            return({pass : false});
          }

          // If Surface, we only focus on the surfaces
          let search_objects = [],
              meta;
          let lh_name, rh_name;
          if( is_surface ){
            let surfs = this.canvas.surfaces.get( current_subject );

            // Check if pial-outer-smoothed is loaded
            lh_name = `FreeSurfer Left Hemisphere - pial-outer-smoothed (${ current_subject })`;
            rh_name = `FreeSurfer Right Hemisphere - pial-outer-smoothed (${ current_subject })`;
            if( !surfs.hasOwnProperty( lh_name ) ){
              lh_name = `Standard 141 Left Hemisphere - pial-outer-smoothed (${ current_subject })`;
              rh_name = `Standard 141 Right Hemisphere - pial-outer-smoothed (${ current_subject })`;
            }
            if( surfs.hasOwnProperty( lh_name ) && surfs.hasOwnProperty( rh_name ) && !surfs[ lh_name ].visible ){
              // outer pial exists
              // Check lh and rh visibility
              const _lh = this.gui.get_controller('Left Hemisphere');
              if( !(_lh && _lh.getValue && _lh.getValue() === 'hidden') ){
                surfs[ lh_name ].visible = true;
              }
              const _rh = this.gui.get_controller('Right Hemisphere');
              if( !(_rh && _rh.getValue && _rh.getValue() === 'hidden') ){
                surfs[ rh_name ].visible = true;
              }
              meta = {
                lh_name: lh_name,
                rh_name: rh_name,
                current_subject: current_subject
              };
            }else{
              lh_name = undefined;
              rh_name = undefined;
            }

            search_objects = to_array( this.canvas.surfaces.get( current_subject ) );
          }else{
            search_objects = to_array(
              get_or_default( this.canvas.volumes, current_subject, {})[`T1 (${current_subject})`]
            );
          }

          return({
            pass  : true,
            type  : search_objects,
            meta  : meta
          });
        }

        return({ pass: false });
      },
      ( res, evt ) => {
        if( res.meta && res.meta.current_subject ){
          let surfs = this.canvas.surfaces.get( res.meta.current_subject );
          if( res.meta.lh_name ){
            surfs[ res.meta.lh_name ].visible = false;
            surfs[ res.meta.rh_name ].visible = false;
          }
        }
        if( res.first_item ){
          // get current electrode
          let current_electrode = Math.max(1, Math.round( elec_number.getValue() )),
              // label = elec_label.getValue(),
              label = '',
              position = res.first_item.point.toArray(),
              is_surface_electrode = elec_surface.getValue() === 'Surface';

          const surface_type = get_or_default( this.canvas.state_data, 'surface_type', 'pial');
          add_electrode(this.canvas, current_electrode, `__localization__, ${current_electrode} - ` ,
                                position, surface_type, label, is_surface_electrode, 1);

          new_electrode();
        }
        this.shiny.loc_electrode_info();
        this._update_canvas();
      },
      'electrode_editor_add_electrodes'
    );

    // callback 3: double click to add label
    this.canvas.add_mouse_callback(
      (evt) => {
        if( evt.action === 'dblclick' &&
            this.edit_mode === 'modification' &&
            this.canvas.group.has( '__electrode_editor__' ) )
        {
          return({ pass  : true, type : this.canvas.group.get( '__electrode_editor__' ).children });
        }
        // Default, do nothing
        return({ pass: false });
      },
      ( res, evt ) => {
        if( !res.target_object ){ return(null); }
        const group_label = elec_group_label.getValue();
        const sub_number = elec_sub_label.getValue() + 1;

        res.target_object.userData.construct_params.custom_info = group_label + sub_number;

        elec_sub_label.setValue( sub_number );
        this.shiny.loc_electrode_info();
        this._update_canvas();
      },
      'electrode_editor_labels'
    );

    this.canvas.add_keyboard_callabck( CONSTANTS.KEY_CYCLE_REMOVE_EDITOR, (evt) => {
      if( this.canvas.edit_mode && has_meta_keys( evt.event, true, false, false ) ){
        const el = get_electrode();
        if( el && el.userData.construct_params.is_electrode ){
          el.parent.remove( el );
          const group = this.canvas.electrodes.get('__localization__');
          delete group[ el.userData.construct_params.name ];
          this.shiny.loc_electrode_info();
          this._update_canvas();
        }
      }
    });


    this.canvas.add_keyboard_callabck( CONSTANTS.KEY_CYCLE_ELEC_EDITOR, (evt) => {
      if( this.canvas.edit_mode ){
        let delta = -1;
        if( has_meta_keys( evt.event, true, false, false ) ){
          delta = 1;
        }
        // last
        let el_num = Math.round( elec_number.getValue() + delta );
        el_num = Math.max( 1, el_num );
        elec_number.setValue( el_num );
        this._update_canvas();
      }
    }, 'edit-gui_cycle_electrodes');


    this.canvas.add_keyboard_callabck( CONSTANTS.KEY_CYCLE_SURFTYPE_EDITOR, (evt) => {
      if( this.canvas.edit_mode ){
        const is_ecog = elec_surface.getValue() === 'Surface';
        elec_surface.setValue( is_ecog ? 'Depth' : 'Surface' );
        this._update_canvas();
      }
    }, 'edit-gui_cycle_surftype');

    this.canvas.add_keyboard_callabck( CONSTANTS.KEY_NEW_ELECTRODE_EDITOR, (evt) => {
      if( this.canvas.edit_mode ){
        new_electrode();
      }
    }, 'edit-gui_new_electrodes');
/*
    this.canvas.add_keyboard_callabck( CONSTANTS.KEY_LABEL_FOCUS_EDITOR, (evt) => {
      if( this.canvas.edit_mode ){
        elec_label.domElement.children[0].click();
      }
    }, 'edit-gui_edit_label');*/

    // close other folders
    this.gui.folders["Main Canvas"].close();
    this.gui.folders["Side Canvas"].close();
    this.gui.folders[ folder_name ].open();

    // hide 3 planes
    edit_mode.setValue( 'new electrodes' );

    this._has_localization = true;

  }

  c_export_electrodes(folder_name = 'Default'){
    this.gui.add_item('Download Electrodes', () => {
      this.canvas.download_electrodes('csv');
    });
  }

  c_ct_visibility(){
    const folder_name = 'CT Overlay';
    this.gui.add_item('Align CT to T1', false, { folder_name: folder_name })
      .onChange((v) => {
        this.canvas._show_ct = v;
        this.canvas.switch_subject();
      });
    const ct_thred = this.gui.add_item('CT threshold', 0.8, { folder_name: folder_name })
      .min(0.3).max(1).step(0.01)
      .onChange((v) => {
        this.canvas.switch_subject('/', { ct_threshold : v });
      });

    const n_elec = this.gui.add_item('Number of Elecs', 100, { folder_name: folder_name })
      .min(1).step(1);
    this.gui.add_item('Guess Electrodes', () => {
      const thred = ct_thred.getValue() * 255;
      const n_electrodes = Math.ceil(n_elec.getValue());
      const current_subject = this.canvas.state_data.get("target_subject") || '';
      const ct_cube = this.canvas.mesh.get(`ct.aligned.t1 (${current_subject})`);
      if( !ct_cube || ct_cube.userData.construct_params.type !== 'datacube2' ){
        alert(`Cannot find aligned CT (${current_subject})`);
        return(null);
      }

      this.shiny.to_shiny({
        threshold: thred,
        current_subject : current_subject,
        n_electrodes : n_electrodes
      }, 'ct_threshold', true);

      /*


      const dset = ct_cube.material.uniforms.u_data.value.image,
            dat = dset.data,
            _w = dset.width,
            _h = dset.height,
            _d = dset.depth;

      // Get data
      let xyz = [];
      for(let _z = 0; _z < _d; _z++ ){
        for(let _y = 0; _y < _h; _y++ ){
          for(let _x = 0; _x < _w; _x++ ){
            if( dat[_x + _w * (_y + _h * _z)] >= thred ){
              xyz.push( [ _x, _y, _z ] );
            }
          }
        }
      }
      window.xyz = xyz;
      */


    }, { folder_name: folder_name });


    this.gui.folders[ folder_name ].open();

  }

}




class THREEBRAIN_CONTROL{
  constructor(args = {}, DEBUG = false){
    this.params = {};
    this.folders = {};
    this.ctrls = {};
    this._gui = new dat.GUI(args);
    // this._gui.remember( this.params );
    this._gui.__closeButton.addEventListener('click', (e) => {
      if( typeof this.__on_closed === 'function' ){
        this.__on_closed( e );
      }
    });

    this.domElement = this._gui.domElement;
    this.DEBUG = DEBUG;

    this.add_folder('Default');
    this.open_folder('Default');
  }


  set closed( is_closed ){
    this._gui.closed = is_closed;
  }
  get closed(){
    return( this._gui.closed );
  }

  close(){
    this._gui.close();
    if( typeof this.__on_closed === 'function' ){
      this.__on_closed( undefined );
    }
  }


  // function to
  set_closeHandler( h ){
    if( typeof h === 'function' ){
      this.__on_closed = h;
    }
  }


  // Add folder
  add_folder(name){
    if(this.folders[name] === undefined){
      this.folders[name] = this._gui.addFolder(name);
    }
    return(this.folders[name]);
  }

  // open/close folder
  open_folder(name){
    if(this.folders[name] !== undefined){
      this.folders[name].open();
    }
  }
  close_folder(name){
    if(this.folders[name] !== undefined){
      this.folders[name].close();
    }
  }

  get_controller(name, folder_name = 'Default'){
    let fname = folder_name;
    let folder = this.folders[fname];

    if(folder && folder.__controllers){
      for(let ii in folder.__controllers){
        if(folder.__controllers[ii].property === name){
          return(folder.__controllers[ii]);
        }
      }
    }

    if( folder_name === 'Default' && typeof this.ctrls[name] === 'string' ){
      fname = this.ctrls[name];
      folder = this.folders[fname];

      if(folder && folder.__controllers){
        for(let ii in folder.__controllers){
          if(folder.__controllers[ii].property === name){
            return(folder.__controllers[ii]);
          }
        }
      }
    }


    const re = {};
    re.onChange = (callback) => {};
    re.setValue = (v) => {};

    return( re );
  }

  hide_item(name, folder_name = 'Default'){
    to_array( name ).forEach((_n) => {
      let c = this.get_controller(_n, folder_name);
      if( c.__li ){ c.__li.style.display='none'; }
    });

  }

  show_item(name, folder_name = 'Default'){
    to_array( name ).forEach((_n) => {
      let c = this.get_controller(_n, folder_name);
      if( c.__li ){ c.__li.style.display='block'; }
    });
  }


  // Add item
  add_item(name, value, options = {}){
    let folder_name = options.folder_name || 'Default',
        args = options.args,
        is_color = options.is_color || false;

    if(this.params[name] !== undefined){
      return(undefined);
    }
    this.params[name] = value;
    let folder = this.add_folder(folder_name);

    this.ctrls[name] = folder_name;

    if(is_color){
      return(folder.addColor(this.params, name));
    }else{
      if( args ){
        return(folder.add(this.params, name, args));
      }else{
        return(folder.add(this.params, name));
      }
    }


    return(undefined);
  }



}




export { THREEBRAIN_PRESETS, THREEBRAIN_CONTROL };

//window.THREEBRAIN_PRESETS = THREEBRAIN_PRESETS;
//window.THREEBRAIN_CONTROL = THREEBRAIN_CONTROL;
