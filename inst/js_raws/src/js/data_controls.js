import { THREE } from './threeplugins.js';
import * as dat from './libs/dat.gui.module.js';
import { invertColor, to_array, get_or_default } from './utils.js';
import { CONSTANTS } from './constants.js';
import { CCanvasRecorder } from './capture/CCanvasRecorder.js';
// Some presets for gui and canvas


function is_electrode(e) {
  if(e && e.isMesh && e.userData.construct_params && e.userData.construct_params.is_electrode){
    return(true);
  }else{
    return(false);
  }
}

function has_meta_keys( event, shift = true, ctrl = true, alt = true){
  if( shift && event.shiftKey ){
    return(true);
  }
  if( ctrl && event.ctrlKey ){
    return(true);
  }
  if( alt && event.altKey ){
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
  constructor(canvas, gui, settings){
    this.canvas = canvas;
    this.gui = gui;
    this.settings = settings;

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
    this.gui.add_item('Show Panels', true, {folder_name: folder_name})
      .onChange((v) => {
        if( v ){
          this.canvas.enable_side_cameras();
        }else{
          this.canvas.disable_side_cameras();
        }
      });
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

    this.canvas.add_keyboard_callabck( CONSTANTS.KEY_OVERLAY_AXIAL, (evt) => {
      if( has_meta_keys( evt.event, true, false, false ) ){
        const _v = overlay_axial.getValue();
        overlay_axial.setValue( !_v );
      }
    }, 'overlay_axial');

    this.canvas.add_keyboard_callabck( CONSTANTS.KEY_OVERLAY_SAGITTAL, (evt) => {
      if( has_meta_keys( evt.event, true, false, false ) ){
        const _v = overlay_sagittal.getValue();
        overlay_sagittal.setValue( !_v );
      }
    }, 'overlay_sagittal');
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
      if( !has_meta_keys( evt.event, true, true, true ) ){
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
      }else if( !has_meta_keys( evt.event, true, true, true ) ){
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
      }else if( !has_meta_keys( evt.event, true, true, true ) ){
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
      if( !has_meta_keys( evt.event, true, true, true ) ){
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
          if( this._controller_electrodes){
            this.set_electrodes_visibility( this._controller_electrodes.getValue() );
          }
        }
        this._update_canvas();
      });
    };

    const ani_name = this.gui.add_item('Clip Name', initial, { folder_name : folder_name, args : names })
      .onChange((v) => { _ani_name_onchange( v ); });


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
      if( !has_meta_keys( evt.event, true, true, true ) ){
        const is_playing = this._ani_status.getValue();
        this._ani_status.setValue( !is_playing );
      }
    }, 'gui_toggle_animation');

    this.canvas.add_keyboard_callabck( CONSTANTS.KEY_CYCLE_ANIMATION, (evt) => {
      if( !has_meta_keys( evt.event, true, true, true ) ){
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
     * 5. ECoG or iEEG
    */
    // function to get electrode info and update dat.GUI
    // idx is from 0 - (electrode count -1)
    const switch_electrode = ( v ) => {

      let _el = get_electrode( v );
      if( !_el ){
        // use default settings
        elec_position.setValue('0, 0, 0');
        elec_label.setValue('');
      }else{
        elec_position.setValue(`${_el.position.x.toFixed(2)}, ${_el.position.y.toFixed(2)}, ${_el.position.z.toFixed(2)}`);
        elec_label.setValue( _el.userData.construct_params.custom_info || '' );

        let electrode_is_surface = _el.userData.construct_params.is_surface_electrode === true;
        elec_surface.setValue( electrode_is_surface ? 'ECoG' : 'Stereo-iEEG' );

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

    const edit_mode = this.gui.add_item( 'Editing Mode', false, { folder_name: folder_name} )
      .onChange( (v) => {
        this.canvas.edit_mode = v;
        if( v ){
          this.gui.show_item([ 'Previous', 'Number', 'Position', 'Label', 'Next', 'object type' ], folder_name);
        }else{
          this.gui.hide_item([ 'Previous', 'Number', 'Position', 'Label', 'Next', 'object type' ], folder_name);
        }
      } );

    const elec_number = this.gui.add_item( 'Number', 1, { folder_name: folder_name} ).min( 1 ).step( 1 )
      .onChange( (v) => {
        if( this.canvas.edit_mode ){
          v = Math.max( Math.round( v ) , 1 );
          switch_electrode( v );
          this._update_canvas();
        }
      } );

    // const st = canvas.get_surface_types().concat( canvas.get_volume_types() );
    const elec_surface = this.gui.add_item( 'object type', 'ECoG', {
      folder_name: folder_name, args: ['ECoG', 'Stereo-iEEG']
    } ).onChange((v) => {
      if( this.canvas.edit_mode ){
        let el = get_electrode();
        if( el ){
          el.userData.construct_params.is_surface_electrode = (v === 'ECoG');
        }
        if( v === 'Stereo-iEEG' ){
          this.gui.get_controller('Overlay Coronal', 'Side Canvas').setValue( true );
          this.gui.get_controller('Overlay Axial', 'Side Canvas').setValue( true );
          this.gui.get_controller('Overlay Sagittal', 'Side Canvas').setValue( true );
          this.gui.get_controller('Left Hemisphere', 'Geometry').setValue( 'hidden' );
          this.gui.get_controller('Right Hemisphere', 'Geometry').setValue( 'hidden' );
        }else if ( v === 'ECoG' ){
          this.gui.get_controller('Left Hemisphere', 'Geometry').setValue( 'normal' );
          this.gui.get_controller('Right Hemisphere', 'Geometry').setValue( 'normal' );
        }
      }
    });

    const elec_position = this.gui.add_item( 'Position', '0, 0, 0', { folder_name: folder_name} )
      .onChange((v) => {
        if( this.canvas.edit_mode ){
          let pos = v.split(',').map((s) => {return(parseFloat(s.trim()))});
          if( pos.length === 3 ){
            let el = get_electrode();
            if( el ){

              el.position.fromArray( pos );
              el.userData.construct_params.position = pos;
            }
          }
          this._update_canvas();
        }

      } );

    const elec_label = this.gui.add_item( 'Label', '', { folder_name: folder_name} )
      .onChange((v) => {
        if( this.canvas.edit_mode ){
          let el = get_electrode();
          if( el ){
            el.userData.construct_params.custom_info = v;
          }
          this._update_canvas();
        }
      } );

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

    this.gui.hide_item([ 'Previous', 'Number', 'Position', 'Label', 'Next', 'object type' ], folder_name);

    this.canvas.add_mouse_callback(
      (evt) => {
        if( this.canvas.edit_mode ){
          if( evt.action === 'dblclick' ){
            const is_surface = elec_surface.getValue() === 'ECoG',
                  current_subject = this.canvas.state_data.get("target_subject");
            if( !current_subject ){
              return({pass : false});
            }

            // If ECoG, we only focus on the surfaces
            let search_objects = [];
            if( is_surface ){
              search_objects = to_array( this.canvas.surfaces.get( current_subject ) );
            }else{
              search_objects = to_array(
                get_or_default( this.canvas.volumes, current_subject, {})[`brain.finalsurfs (${current_subject})`]
              );
            }

            return({
              pass  : true,
              type  : search_objects
            });
          }else if( evt.action === 'click' ){
            if( this.canvas.group.has( '__electrode_editor__' ) ){
              return({
                pass  : true,
                type  : this.canvas.group.get( '__electrode_editor__' ).children
              });
            }

          }
        }
        return({ pass: false });
      },
      ( res, evt ) => {
        if( evt.action === 'click' ){
          this.canvas.focus_object( res.target_object );
          if( res.target_object && res.target_object.isMesh &&
              typeof res.target_object.userData.electrode_number === 'number' ){
            elec_number.setValue( res.target_object.userData.electrode_number );
          }
        }else if( evt.action === 'dblclick' ){
          if( res.first_item ){
            // get current electrode
            let current_electrode = Math.max(1, Math.round( elec_number.getValue() )),
                label = elec_label.getValue(),
                position = res.first_item.point.toArray(),
                is_surface_electrode = elec_surface.getValue() === 'ECoG';

            add_electrode(this.canvas, current_electrode, `__localization__, ${current_electrode} - ` ,
                                  position, 'NA', label, is_surface_electrode);

            new_electrode();
          }
        }

        this._update_canvas();
      },
      'electrode_editor'
    );


    this.canvas.add_keyboard_callabck( CONSTANTS.KEY_CYCLE_ELEC_EDITOR, (evt) => {
      if( this.canvas.edit_mode ){
        let delta = 1;
        if( has_meta_keys( evt.event, true, false, false ) ){
          delta = -1;
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
        const is_ecog = elec_surface.getValue() === 'ECoG';
        elec_surface.setValue( is_ecog ? 'Stereo-iEEG' : 'ECoG' );
        this._update_canvas();
      }
    }, 'edit-gui_cycle_surftype');

    this.canvas.add_keyboard_callabck( CONSTANTS.KEY_NEW_ELECTRODE_EDITOR, (evt) => {
      if( this.canvas.edit_mode ){
        new_electrode();
      }
    }, 'edit-gui_new_electrodes');

    this.canvas.add_keyboard_callabck( CONSTANTS.KEY_LABEL_FOCUS_EDITOR, (evt) => {
      if( this.canvas.edit_mode ){
        elec_label.domElement.children[0].click();
      }
    }, 'edit-gui_edit_label');
  }

  c_export_electrodes(folder_name = 'Default'){
    this.gui.add_item('Download Electrodes', () => {
      this.canvas.download_electrodes('csv');
    });
  }

  c_ct_visibility(){
    this.gui.add_item('Align CT to T1', false, { folder_name: 'Default' })
      .onChange((v) => {
        this.canvas._show_ct = v;
        this.canvas.switch_subject();
      });
    this.gui.add_item('CT threshold', 0.8, { folder_name: 'Default' })
      .min(0.3).max(1).step(0.01)
      .onChange((v) => {
        this.canvas.switch_subject('/', { ct_threshold : v });
      });
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
    if( folder_name === 'Default' && typeof this.ctrls[name] === 'string' ){
      fname = this.ctrls[name];
    }
    let folder = this.folders[fname];

    if(folder && folder.__controllers){
      for(var ii in folder.__controllers){
        if(folder.__controllers[ii].property === name){
          return(folder.__controllers[ii]);
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
      if(args !== null && args !== undefined){
        return(folder.add(this.params, name, args));
      }else{
        return(folder.add(this.params, name));
      }
    }


    return(undefined);
  }



}


function add_electrode (canvas, number, name, position, surface_type = 'NA',
                        custom_info = '', is_surface_electrode = false,
                        group_name = '__electrode_editor__',
                        subject_code = '__localization__', radius = 2) {
  let _el;

  if( !canvas.group.has(group_name) ){
    canvas.add_group( {
      name : group_name, layer : 0, position : [0,0,0],
      disable_trans_mat: false, group_data: null,
      parent_group: null, subject_code: subject_code, trans_mat: null
    } );
  }

  // Check if electrode has been added, if so, remove it
  try {
    _el = canvas.electrodes.get( subject_code )[ name ];
    _el.parent.remove( _el );
  } catch (e) {}


  const g = { "name":name, "type":"sphere", "time_stamp":[], "position":position,
          "value":null, "clickable":true, "layer":0,
          "group":{"group_name":group_name,"group_layer":0,"group_position":[0,0,0]},
          "use_cache":false, "custom_info":custom_info,
          "subject_code":subject_code, "radius":radius,
          "width_segments":10,"height_segments":6,
          "is_electrode":true,
          "is_surface_electrode": is_surface_electrode || (surface_type !== 'NA'),
          "use_template":false,
          "surface_type": surface_type,
          "hemisphere":null,"vertex_number":-1,"sub_cortical":true,"search_geoms":null};

  canvas.add_object( g );

  _el = canvas.electrodes.get( subject_code )[ name ];
  _el.userData.electrode_number = number;
  return( _el );
}

export { THREEBRAIN_PRESETS, THREEBRAIN_CONTROL };

//window.THREEBRAIN_PRESETS = THREEBRAIN_PRESETS;
//window.THREEBRAIN_CONTROL = THREEBRAIN_CONTROL;
