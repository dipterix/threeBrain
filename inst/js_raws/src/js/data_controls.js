import { THREE } from './threeplugins.js';
import * as dat from './libs/dat.gui.module.js';
import { add_electrode2, add_electrode, is_electrode } from './geometry/sphere.js';
import { invertColor, to_array, get_or_default, to_dict } from './utils.js';
import { CONSTANTS } from './constants.js';
import { CCanvasRecorder } from './capture/CCanvasRecorder.js';
import * as download from 'downloadjs';
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

    this.cache = {};

    this.canvas.bind( 'update_data_gui_controllers', 'switch_subject',
      (evt) => {
        this.update_self();
      }, this.canvas.el );

  }

  // update gui controllers
  update_self(){
    this.update_voxel_type();
    this.set_surface_ctype( true );

    if( typeof(this._calculate_intersection_coord) === 'function' ){
      this._calculate_intersection_coord();
    }

    this._update_canvas();
  }

  /**
   * wrapper for this.canvas.start_animation and pause_animation
   */
  _update_canvas(level = 0){
    if(level >= 0){
      this.canvas.start_animation(level);
    }else{
      this.canvas.pause_animation(-level);
    }
  }

  fire_change( args, priority = "deferred" ){

    // fire gui.params first
    this.shiny.to_shiny2('controllers', this.gui.params, "deferred");

    if( typeof args === 'object' ){
      for(let k in args){
        // this.parameters[k] = args[k];

        this.shiny.to_shiny2(k, args[k], priority);
      }
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
  // 12. Hemisphere material/transparency
  // 13. electrode visibility, highlight, groups
  // 14. electrode mapping
  // 15. animation, play/pause, speed, clips...
  // 16. Highlight selected electrodes and info
  // 17. Voxel color type

  // 1. Background colors
  c_background(){
    const initial_bgcolor = this.settings.background || "#ffffff",
          folder_name = CONSTANTS.FOLDERS['background-color'];

    this.gui.add_item('Background Color', '#FFFFFF', {is_color : true, folder_name: folder_name})
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
        this.canvas.el.style.backgroundColor = v;

        this.fire_change({ 'background' : v });

        // force re-render
        this._update_canvas(0);
      })
      .setValue( initial_bgcolor );

  }

  c_syncviewer(){
    if( this.shiny.shiny_mode ){
      const folder_name = CONSTANTS.FOLDERS['sync-viewers'];
      this.gui.add_item('Send to Other Viewers', () => {
        this.fire_change({ 'sync' : this.shiny.uuid }, 'event' );
      }, {folder_name: folder_name });
    }
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

    this.gui.add_item('Screenshot', () => {
      /* const img = this.canvas.domElement.toDataURL('image/png');
      const _d = new Date().toJSON();

      download(img, `[rave-brain] ${_d}.png`, 'image/png'); */
      const _d = new Date().toJSON();
      const doc = this.canvas.mapToPDF();
      doc.save(`[rave-brain] ${_d}.pdf`);
    }, {folder_name: folder_name });

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
          this.canvas.main_camera.up.set( 0, 1, 0 );
          break;
      }

      camera_pos.__select.value = '[free rotate]';

      this._update_canvas();
    });
    /**
     * initialize camera position. This requires `__reset_flag` from Canvas
     * If __reset_flag=false, this means we are in shiny_mode and the widget
     * has already been loaded once
     */

    if( this.canvas.__reset_flag ){
      const inital_camera_pos = new THREE.Vector3().fromArray(
        this.settings.camera_pos
      );
      if (inital_camera_pos.length() > 0){
        this.canvas.main_camera.position.set(
          inital_camera_pos.x,
          inital_camera_pos.y,
          inital_camera_pos.z
        ).normalize().multiplyScalar(500);
        if( inital_camera_pos.x !== 0 || inital_camera_pos.y !== 0 ){
          this.canvas.main_camera.up.set( 0, 0, 1 );
        } else {
          this.canvas.main_camera.up.set( 0, 1, 0 );
        }
      }
    }

    this._update_canvas();
  }

  // 5. display anchor
  c_toggle_anchor(){
    const folder_name = CONSTANTS.FOLDERS[ 'toggle-helpper' ];
    this.gui.add_item('Display Coordinates', false, { folder_name: folder_name })
      .onChange((v) => {
        this.canvas.set_cube_anchor_visibility(v);
        this.fire_change();
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
        this.fire_change({ 'side_display' : v });
      });


    if( _v ){
      this.canvas.enable_side_cameras();
    }else{
      this.canvas.disable_side_cameras();
    }
    this.fire_change({ 'side_display' : _v });

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
    this.canvas._side_width = side_width;
    this.canvas.reset_side_canvas( zoom_level, side_width, side_shift );
  }

  // 8. coronal, axial, sagittal position (depth)
  c_side_depth(){
    const folder_name = CONSTANTS.FOLDERS[ 'side-three-planes' ];

    const _calculate_intersection_coord = () => {
      console.debug('Recalculate MNI305 for plane intersections');
      // MNI 305 position of the intersection
      const ints_z = this.canvas.state_data.get( 'axial_posz' ) || 0,
            ints_y = this.canvas.state_data.get( 'coronal_posy' ) || 0,
            ints_x = this.canvas.state_data.get( 'sagittal_posx' ) || 0;
      const point = new THREE.Vector3().set(ints_x, ints_y, ints_z);
      this.canvas.calculate_mni305( point );
      // set controller
      _controller_mni305.setValue(`${point.x.toFixed(1)}, ${point.y.toFixed(1)}, ${point.z.toFixed(1)}`);
    };
    this._calculate_intersection_coord = _calculate_intersection_coord;

    /*this.canvas.bind( 'c_side_depth_subject_changed', 'switch_subject', (e) => {
		  _calculate_intersection_coord();
		}, this.canvas.el);*/

    // side plane
    const _controller_coronal = this.gui
      .add_item('Coronal (P - A)', 0, {folder_name: folder_name})
      .min(-128).max(128).step(1).onChange((v) => {
        this.canvas.set_coronal_depth( v );
        this.fire_change({ 'coronal_depth' : v });
        _calculate_intersection_coord();
      });
    this.gui.add_tooltip( CONSTANTS.TOOLTIPS.KEY_MOVE_CORONAL, 'Coronal (P - A)', folder_name);

    const _controller_axial = this.gui
      .add_item('Axial (I - S)', 0, {folder_name: folder_name})
      .min(-128).max(128).step(1).onChange((v) => {
        this.canvas.set_axial_depth( v );
        this.fire_change({ 'axial_depth' : v });
        _calculate_intersection_coord();
      });
    this.gui.add_tooltip( CONSTANTS.TOOLTIPS.KEY_MOVE_AXIAL, 'Axial (I - S)', folder_name);

    const _controller_sagittal = this.gui
      .add_item('Sagittal (L - R)', 0, {folder_name: folder_name})
      .min(-128).max(128).step(1).onChange((v) => {
        this.canvas.set_sagittal_depth( v );
        this.fire_change({ 'sagittal_depth' : v });
        _calculate_intersection_coord();
      });
    this.gui.add_tooltip( CONSTANTS.TOOLTIPS.KEY_MOVE_SAGITTAL, 'Sagittal (L - R)', folder_name);

    const _controller_mni305 = this.gui
      .add_item('Intersect MNI305', "NaN, NaN, NaN", {folder_name: folder_name});

    this.fire_change({ 'coronal_depth' : 0 });
    this.fire_change({ 'axial_depth' : 0 });
    this.fire_change({ 'sagittal_depth' : 0 });

    [ _controller_coronal, _controller_axial, _controller_sagittal ].forEach((_c, ii) => {

      this.canvas.bind( `dat_gui_side_controller_${ii}_mousewheel`, 'mousewheel',
        (evt) => {
          if( evt.altKey ){
            evt.preventDefault();
            const current_val = _c.getValue();
            _c.setValue( current_val + evt.deltaY );
          }
        }, _c.domElement );

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

    const overlay_coronal = this.gui.add_item('Overlay Coronal', false,
      {folder_name: folder_name})
      .onChange((v) => {
        this.canvas.set_side_visibility('coronal', v);
        this.fire_change({ 'coronal_visibility' : v });
      });
    this.gui.add_tooltip( CONSTANTS.TOOLTIPS.KEY_OVERLAY_CORONAL, 'Overlay Coronal', folder_name);

    const overlay_axial = this.gui.add_item('Overlay Axial', false,
      {folder_name: folder_name})
      .onChange((v) => {
        this.canvas.set_side_visibility('axial', v);
        this.fire_change({ 'axial_visibility' : v });
      });
    this.gui.add_tooltip( CONSTANTS.TOOLTIPS.KEY_OVERLAY_AXIAL, 'Overlay Axial', folder_name);

    const overlay_sagittal = this.gui.add_item('Overlay Sagittal', false,
      {folder_name: folder_name})
      .onChange((v) => {
        this.canvas.set_side_visibility('sagittal', v);
        this.fire_change({ 'sagittal_visibility' : v });
      });
    this.gui.add_tooltip( CONSTANTS.TOOLTIPS.KEY_OVERLAY_SAGITTAL, 'Overlay Sagittal', folder_name);

    this.fire_change({ 'coronal_visibility' : false });
    this.fire_change({ 'axial_visibility' : false });
    this.fire_change({ 'sagittal_visibility' : false });

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
        this.fire_change();
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
        this.fire_change();
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
          _c = this.canvas.get_surface_types(),
          _mty = this.canvas.state_data.get( 'surface_material_type' ) || 'MeshPhongMaterial',
          _mtyc = ['MeshPhongMaterial', 'MeshLambertMaterial'];

    if( _c.length === 0 ){
      return(null);
    }
    const surf_type = this.gui.add_item('Surface Type', _s, {args : _c, folder_name : folder_name })
      .onChange((v) => {
        this.canvas.switch_subject( '/', {
          'surface_type': v
        });
        this.fire_change({ 'surface_type' : v });
      });
    this.fire_change({ 'surface_type' : _s });
    this.gui.add_tooltip( CONSTANTS.TOOLTIPS.KEY_CYCLE_SURFACE, 'Surface Type', folder_name);

    this.canvas.add_keyboard_callabck( CONSTANTS.KEY_CYCLE_SURFACE, (evt) => {
      if( has_meta_keys( evt.event, false, false, false ) ){
        let current_idx = (_c.indexOf( surf_type.getValue() ) + 1) % _c.length;
        if( current_idx >= 0 ){
          surf_type.setValue( _c[ current_idx ] );
        }
      }
    }, 'gui_surf_type2');


    const surf_material = this.gui.add_item('Surface Material', _mty, {
      args : _mtyc, folder_name : folder_name })
      .onChange((v) => {
        this.canvas.state_data.set( 'surface_material_type', v );
        this.fire_change({ 'surface_material' : v });
        this._update_canvas();
      });
    this.fire_change({ 'surface_material' : _mty });
    this.gui.add_tooltip( CONSTANTS.TOOLTIPS.KEY_CYCLE_MATERIAL, 'Surface Material', folder_name);


    this.canvas.add_keyboard_callabck( CONSTANTS.KEY_CYCLE_MATERIAL, (evt) => {
      if( has_meta_keys( evt.event, true, false, false ) ){
        let current_idx = (_mtyc.indexOf( surf_material.getValue() ) + 1) % _mtyc.length;
        if( current_idx >= 0 ){
          surf_material.setValue( _mtyc[ current_idx ] );
        }
      }
    }, 'gui_surf_material');


  }

  // 12. Hemisphere material/transparency
  c_hemisphere_material(){

    const folder_name = CONSTANTS.FOLDERS[ 'hemisphere-material' ],
          options = ['normal', 'wireframe', 'hidden'];

    const lh_ctrl = this.gui.add_item('Left Hemisphere', 'normal',{ args : options, folder_name : folder_name })
      .onChange((v) => {
        this.canvas.switch_subject( '/', { 'material_type_left': v });
        this.fire_change();
      });
    this.gui.add_tooltip( CONSTANTS.TOOLTIPS.KEY_CYCLE_LEFT, 'Left Hemisphere', folder_name);

    const rh_ctrl = this.gui.add_item('Right Hemisphere', 'normal',{ args : options, folder_name : folder_name })
      .onChange((v) => {
        this.canvas.switch_subject( '/', { 'material_type_right': v });
        this.fire_change();
      });
    this.gui.add_tooltip( CONSTANTS.TOOLTIPS.KEY_CYCLE_RIGHT, 'Right Hemisphere', folder_name);

    const lh_trans = this.gui.add_item('Left Opacity', 1.0, { folder_name : folder_name })
    .min( 0.1 ).max( 1 ).step( 0.1 )
      .onChange((v) => {
        this.canvas.switch_subject( '/', { 'surface_opacity_left': v });
        this.fire_change();
      });
    this.gui.add_tooltip( '⇧' + CONSTANTS.TOOLTIPS.KEY_CYCLE_LEFT, 'Left Opacity', folder_name);

    const rh_trans = this.gui.add_item('Right Opacity', 1.0, { folder_name : folder_name })
    .min( 0.1 ).max( 1 ).step( 0.1 )
      .onChange((v) => {
        this.canvas.switch_subject( '/', { 'surface_opacity_right': v });
        this.fire_change();
      });
    this.gui.add_tooltip( '⇧' + CONSTANTS.TOOLTIPS.KEY_CYCLE_RIGHT, 'Right Opacity', folder_name);

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

  get_surface_ctype(){
    const _c = this.gui.get_controller( 'Surface Color' );
    if( _c.isfake ){ return( "none" ); }
    return( _c.getValue() );
  }
  set_surface_ctype( t, params = {} ){

    if( !this._surface_ctype_map ){ return; }
    if (t === undefined){ return; }
    let ctype = t,
        sigma = params.sigma,
        blend = params.blend,
        decay = params.decay,
        radius = params.radius;

    if( t === true ){
      // refresh
      ctype = this._current_surface_ctype;
    }
    if( !ctype ){ ctype = "vertices"; }
    this._current_surface_ctype = ctype;

    let _c;
    if( sigma === undefined ){
      _c = this.gui.get_controller( 'Sigma' );
      if( _c.isfake ){ sigma = 3.0; } else { sigma = _c.getValue(); }
    }
    if( blend === undefined ){
      _c = this.gui.get_controller( 'Blend Factor' );
      if( _c.isfake ){ blend = 0.4; } else { blend = _c.getValue(); }
    }
    if( decay === undefined ){
      _c = this.gui.get_controller( 'Decay' );
      if( _c.isfake ){ decay = 0.15; } else { decay = _c.getValue(); }
    }
    if( radius === undefined ){
      _c = this.gui.get_controller( 'Range Limit' );
      if( _c.isfake ){ radius = 10.0; } else { radius = _c.getValue(); }
    }

    let col_code = this._surface_ctype_map[ ctype ];
    if( col_code === undefined ){
      col_code = CONSTANTS.VERTEX_COLOR;
      this._current_surface_ctype = "vertices";
    }
    let f = (el) => {
      if( !(el.isFreeMesh && el._material_options) ){ return; }
      el._material_options.which_map.value = col_code;
      el._material_options.blend_factor.value = blend;
      el._material_options.elec_decay.value = decay;
      el._material_options.elec_radius.value = radius;

      if( el.object.visible && col_code === CONSTANTS.VOXEL_COLOR ){
        // need to get current active datacube2
        const inst = this.current_voxel_type();
        if( inst ){
          el._set_color_from_datacube2(inst, sigma);
        } else {
          el._material_options.which_map.value = CONSTANTS.DEFAULT_COLOR;
        }
      }
    };


    this.canvas.threebrain_instances.forEach( f );

    this._update_canvas();
    this.fire_change({ 'surface_color_type' : this._current_surface_ctype });

  }

  c_surface_color(){
    const folder_name = CONSTANTS.FOLDERS[ 'surface-selector' ],
          maps = {
            'vertices' : CONSTANTS.VERTEX_COLOR,
            'sync from voxels' : CONSTANTS.VOXEL_COLOR,
            'sync from electrodes' : CONSTANTS.ELECTRODE_COLOR,
            'none' : CONSTANTS.DEFAULT_COLOR
          },
          options = Object.keys( maps );
    this._surface_ctype_map = maps;
    let col = 'vertices';

    this.gui.add_item('Surface Color', col, {args : options, folder_name : folder_name })
      .onChange((v) => {
        this.gui.hide_item(['Blend Factor', 'Sigma', 'Decay', 'Range Limit'], folder_name);
        const last_ctype = this._current_surface_ctype;
        this.canvas.__hide_voxels = false;
        this.set_surface_ctype( v );

        if( this._current_surface_ctype !== "none" ){
          this.gui.show_item(['Blend Factor'], folder_name);
        }

        if( this._current_surface_ctype === "sync from voxels" ){
          this.gui.show_item(['Sigma'], folder_name);
          this.canvas.__hide_voxels = true;
        } else {
          if( last_ctype === "sync from voxels" ) {
            // leaving, have to set voxels to none
            this.canvas.__hide_voxels = true;
          }
          if( this._current_surface_ctype === "sync from electrodes" ){
            this.gui.show_item(['Decay', 'Range Limit'], folder_name);
          }
        }
        this._update_canvas();
      });

    this.canvas.add_keyboard_callabck( CONSTANTS.KEY_CYCLE_SURFACE_COLOR, (evt) => {
      if( has_meta_keys( evt.event, false, false, false ) ){
        // options
        const _c = this.gui.get_controller( "Surface Color" );

        let current_idx = (options.indexOf( _c.getValue() ) + 1) % options.length;
        if( current_idx >= 0 ){
          _c.setValue( options[ current_idx ] );
        }
      }
    }, 'gui_surf_color_type');
    this.gui.add_tooltip( CONSTANTS.TOOLTIPS.KEY_CYCLE_SURFACE_COLOR, 'Surface Color', folder_name);

    const blend_factor = this.gui.add_item(
      "Blend Factor", 0.4, { folder_name : folder_name })
      .min( 0 ).max( 1 )
      .onChange((v) => {
        if( typeof(v) != "number" ){
          v = 0.4;
        } else if( v < 0 ){
          v = 0;
        } else if (v > 1){
          v = 1;
        }
        this.set_surface_ctype( true, { 'blend' : v } );
        this._update_canvas();
      })

    // ---------- for voxel-color ---------------

    const map_delta = this.gui.add_item("Sigma", 3.0, { folder_name : folder_name })
      .min( 0 ).max( 10 )
      .onChange((v) => {
        if( v !== undefined ){
          if( v < 0 ){ v = 0; }
          this.set_surface_ctype( true, { 'sigma' : v } );
          this._update_canvas();
        }
      });

    // ---------- for electrode maps ------------
    this.gui.add_item("Decay", 0.15, { folder_name : folder_name })
      .min( 0.05 ).max( 1 ).step( 0.05 )
      .onChange((v) => {
        if( v !== undefined ){
          if( v < 0.05 ){ v = 0.05; }
          this.set_surface_ctype( true, { 'decay' : v } );
          this._update_canvas();
        }
      });

    this.gui.add_item("Range Limit", 10.0, { folder_name : folder_name })
      .min( 1.0 ).max( 30.0 ).step( 1.0 )
      .onChange((v) => {
        if( v !== undefined ){
          if( v < 1.0 ){ v = 1.0; }
          this.set_surface_ctype( true, { 'radius' : v } );
          this._update_canvas();
        }
      });

    // 'elec_decay'        : { value : 2.0 },
    // 'blend_factor'      : { value : 0.4 }


    this.gui.hide_item(['Blend Factor', 'Sigma', 'Decay', 'Range Limit'], folder_name);
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
    this.canvas.state_data.set('electrode_visibility', v);

    this._update_canvas();
    this.fire_change({ 'electrode_visibility' : v });
    return(true);
  }
  c_electrodes(){
    const folder_name = CONSTANTS.FOLDERS[ 'electrode-style' ];
    const show_inactives = this.settings.show_inactive_electrodes;
    const vis_types = ['all visible', 'hide inactives', 'hidden'];
    const initial_value = show_inactives? 'all visible': 'hide inactives';

    this.canvas.state_data.set('electrode_visibility', initial_value);

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


    this._controller_electrodes = this.gui.add_item('Visibility', initial_value,
      {args : vis_types, folder_name : folder_name })
      .onChange((v) => {
        this.set_electrodes_visibility( v );
        this.fire_change();
      });
    this.gui.add_tooltip( CONSTANTS.TOOLTIPS.KEY_CYCLE_ELEC_VISIBILITY, 'Visibility', folder_name);

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
        if( v ){
          this.gui.show_item(['Surface Mapping', 'Volume Mapping'], folder_name);
        } else {
          this.gui.hide_item(['Surface Mapping', 'Volume Mapping'], folder_name);
        }
        this.fire_change();
      });

    this.gui.add_item('Surface Mapping', 'std.141', {
      args : ['std.141', 'mni305', 'no mapping'],
      folder_name : folder_name })
      .onChange((v) => {
        this.canvas.switch_subject( '/', { 'map_type_surface': v });
        this.fire_change();
      });

    this.gui.add_item('Volume Mapping', 'mni305', {
      args : ['mni305', 'no mapping'],
      folder_name : folder_name })
      .onChange((v) => {
        this.canvas.switch_subject( '/', { 'map_type_volume': v });
        this.fire_change();
      });

    // hide mapping options
    this.gui.hide_item(['Surface Mapping', 'Volume Mapping'], folder_name);

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
      this.__current_time = v;
      this._ani_time.setValue( v );
    }
  }
  get_animation_params(){
    if(this._ani_time && this._ani_speed && this._ani_status){
      return({
        play : this._ani_status.getValue(),
        time : this.__current_time || 0, //this._ani_time.getValue(),
        speed : this._ani_speed.getValue(),
        min : this.animation_time[0],
        max : this.animation_time[1],
        display : this._ani_name.getValue(),
        threshold : this._thres_name.getValue()
      });
    }else{
      return({
        play : false,
        time : 0,
        speed : 0,
        min : 0,
        max : 0,
        display : '[None]',
        threshold : '[None]'
      });
    }
  }

  add_clip( clip_name, focus_ui = false ){
    if( (typeof clip_name !== 'string') || this._animation_names.includes(clip_name) ){ return; }
    if( !this._ani_name || !this._thres_name ){ return; }
    let el = document.createElement('option');
    el.setAttribute('value', clip_name);
    el.innerHTML = clip_name;
    this._ani_name.__select.appendChild( el );

    el = document.createElement('option');
    el.setAttribute('value', clip_name);
    el.innerHTML = clip_name;
    this._thres_name.__select.appendChild( el );
    this._animation_names.push( clip_name );

    if( focus_ui ){
      // This needs to be done in the next round (after dom op)
      setTimeout(() => { this._ani_name.setValue( clip_name ); }, 100);
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

    let cnames = Object.keys( this.settings.color_maps ),
        names = ['[None]'],
        initial = this.settings.default_colormap;

    // Make sure the initial value exists, and [None] is included in the option
    cnames.forEach(n => {
      if( n === 'Subject' && cnames.includes('[Subject]') ){
        return;
      }
      names.push( n );
    });
    this._animation_names = names;

    if( !initial || !names.includes( initial ) || initial.startsWith('[') ){
      initial = undefined;
      names.forEach((_n) => {
        if( !initial && !_n.startsWith('[') ){
          initial = _n;
        }
      });
    }

    if( !initial ){
      initial = '[None]';
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

        // update time_range
        if( this.canvas.__min_t === undefined ) {
          this.canvas.update_time_range();
        }
        this._ani_time.min( this.canvas.__min_t ).max( this.canvas.__max_t );
        this.animation_time[0] = this.canvas.__min_t;
        this.animation_time[1] = this.canvas.__max_t;

        if( !cmap ){
          legend_visible.setValue(false);
          if( v === '[None]' ){
            this.canvas.electrodes.forEach((_d) => {
              for( let _kk in _d ){
                _d[ _kk ].visible = true;
              }
            });
          }
        }else{
          this.set_animation_time( this.animation_time[0] );
          legend_visible.setValue(true);

          // If inactive electrodes are hidden, re-calculate visibility
          if( this._controller_electrodes ){
            this.set_electrodes_visibility( this._controller_electrodes.getValue() );
          }
          // reset color-range
          if( cmap.value_type === 'continuous' ){

            val_range.setValue( this.__display_range_continuous || '' );

            /*
             val_range.setValue(
               `${cmap.lut.minV.toPrecision(5)},${cmap.lut.maxV.toPrecision(5)}`
             );
            */
            this.gui.show_item(['Display Range'], folder_name);
          }else{
            val_range.setValue(',');
            this.gui.hide_item(['Display Range'], folder_name);
          }

        }
        this._update_canvas();
      });
      this.canvas.state_data.set('display_variable', v);
      this.fire_change({ 'clip_name' : v, 'display_data' : v });
    };

    const _thres_name_onchange = (v) => {
      const cmap = this.canvas.color_maps.get(v);
      if(!cmap){
        // this is not a value we can refer to
        thres_range.setValue('');
        this.canvas.state_data.set('threshold_active', false);
        return;
      }

      const previous_type = this.canvas.state_data.get('threshold_type');
      const previous_value = this.canvas.state_data.get('threshold_type');

      // set flags to canvas
      this.canvas.state_data.set('threshold_active', true);
      this.canvas.state_data.set('threshold_variable', v);

      if(cmap.value_type === 'continuous'){
        this.canvas.state_data.set('threshold_type', 'continuous');
        this.gui.show_item('Threshold Method');

        if( previous_type !== 'continuous' ){
          thres_range.setValue( this.__threshold_values_continuous || '' );
        }

      }else{
        // '' means no threshold
        this.canvas.state_data.set('threshold_type', 'discrete');
        thres_range.setValue(cmap.value_names.join('|'));
        this.gui.hide_item('Threshold Method');
      }
    };

    const ani_name = this.gui.add_item('Display Data', initial, { folder_name : folder_name, args : names })
      .onChange((v) => {
        _ani_name_onchange( v );
        this.fire_change();
        this._update_canvas();
      });
    this.gui.add_tooltip( CONSTANTS.TOOLTIPS.KEY_CYCLE_ANIMATION, 'Display Data', folder_name);

    this._ani_name = ani_name;
    const val_range = this.gui.add_item('Display Range', '', { folder_name : folder_name })
      .onChange((v) => {
        let ss = v;
        v = v.split(',').map(x => {
          return( parseFloat(x) );
        }).filter(x => {
          return( !isNaN(x) );
        });


        if( v.length > 0 && !(v.length === 1 && v[0] === 0) ){
          let v1 = v[0], v2 = Math.abs(v[0]);
          if( v.length == 1 ){
            v1 = -v2;
          }else{
            v2 = v[1];
          }

          // Set cmap value range
          this.__display_range_continuous = ss;
          this.canvas.switch_colormap( undefined, [v1, v2] );
          // reset animation tracks

        } else {
          const cmap = this.canvas.switch_colormap();
          if( cmap && cmap.value_type === 'continuous' ){
            this.__display_range_continuous = '';
            this.canvas.switch_colormap( undefined, [
              cmap.value_range[0],
              cmap.value_range[1]
            ] );
          }

        }
        /*
        if( v.match(/[^0-9,-.eE~]/) ){
          // illegal chars
          ss = Array.from(v).map((s) => {
            return( '0123456789.,-eE~'.indexOf(s) === -1 ? '' : s );
          }).join('');
        }
        let vr = ss.split(/[,~]/);
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
        */
        this.canvas.generate_animation_clips( ani_name.getValue() , true );
        this.fire_change();
        this._update_canvas();

      });

    const thres_name = this.gui.add_item('Threshold Data', '[None]', { folder_name : folder_name, args : names })
      .onChange((v) => {
        _thres_name_onchange( v );
        this.fire_change();
        this._update_canvas();
      });
    this._thres_name = thres_name;

    const thres_range = this.gui.add_item('Threshold Range', '', { folder_name : folder_name })
      .onChange((v) => {
        const is_continuous = get_or_default(this.canvas.state_data, 'threshold_type', 'discrete') == 'continuous';
        let candidates = v.split(/[\|,]/).map((x) => { return(x.trim()); });

        if(is_continuous){
          candidates = candidates.map(x => { return(parseFloat(x)); })
                                 .filter(x => { return(!isNaN(x)); });
          /*
          candidates = candidates.map((x) => {
            let s = Array.from(x).map((s) => {
              return( '0123456789.,-eE~'.indexOf(s) === -1 ? '' : s );
            }).join('').split(/[,~]/);
            if( s.length === 2 ){
              s[0] = parseFloat( s[0] );
              s[1] = parseFloat( s[1] );
            }else{
              return([]);
            }
            if( isNaN( s[0] ) || isNaN( s[1] ) ){
              return([]);
            }
            return(s);
          });
          */
          this.__threshold_values_continuous = v;
        }
        // set flag

        this.canvas.state_data.set('threshold_values', candidates);
        this.fire_change();
        this._update_canvas();
      });

    const thres_method = this.gui.add_item('Threshold Method', '|v| >= T1', { folder_name : folder_name, args : CONSTANTS.THRESHOLD_OPERATORS })
      .onChange((v) => {
        const is_continuous = get_or_default(this.canvas.state_data, 'threshold_type', 'discrete') == 'continuous';
        if( is_continuous ){
          const op = CONSTANTS.THRESHOLD_OPERATORS.indexOf(v);
          if( op > -1 ){
            this.canvas.state_data.set('threshold_method', op);
            this.fire_change();
            this._update_canvas();
          }
        }else{
          // TODO: handle discrete data
        }
      });
    this.canvas.state_data.set('threshold_method', 2);

    this._ani_status = this.gui.add_item( 'Play/Pause', false,
                                          { folder_name : folder_name },
                                          CONSTANTS.TOOLTIPS.KEY_TOGGLE_ANIMATION );
    this.gui.add_tooltip( CONSTANTS.TOOLTIPS.KEY_TOGGLE_ANIMATION, 'Play/Pause', folder_name);

    this._ani_status.onChange((v) => { if(v){ this._update_canvas(2); }else{ this._update_canvas(-2); } });

    this._ani_speed = this.gui.add_item('Speed', 1, {
      args : { 'x 0.01' : 0.01, 'x 0.05' : 0.05, 'x 0.1' : 0.1, 'x 0.2': 0.2, 'x 0.5': 0.5, 'x 1': 1, 'x 2':2, 'x 5':5},
      folder_name : folder_name
    });

    this.gui.add_item( 'Time', this.animation_time[0], { folder_name : folder_name })
        .min(this.animation_time[0]).max(this.animation_time[1]).step(step).onChange((v) => {
          if(typeof this.__current_time !== 'number' ||
             Math.abs(this.__current_time - v) >= 0.001){
            this.__current_time = v;
          }
          this._update_canvas();
        });
    this._ani_time = this.gui.get_controller('Time', folder_name);

    this.canvas.bind( `dat_gui_ani_time_mousewheel`, 'mousewheel',
      (evt) => {
        if( evt.altKey ){
          evt.preventDefault();
          const current_val = this._ani_time.getValue();
          this._ani_time.setValue( current_val + Math.sign( evt.deltaY ) * step );
        }
      }, this._ani_time.domElement );

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
        this.fire_change();
      });

    let render_timestamp = this.settings.render_timestamp || false;
    const timestamp_visible = this.gui.add_item('Show Time', render_timestamp, {folder_name: folder_name })
      .onChange((v) => {
        this.canvas.render_timestamp = v;
        this.fire_change({ 'render_timestamp' : v });
        this._update_canvas(0);
      });


    this.canvas.render_legend = render_legend;
    this.canvas.render_timestamp = render_timestamp;

    this.fire_change({ 'render_timestamp' : render_timestamp });

    _ani_name_onchange( initial );

    this.gui.open_folder( folder_name );

  }

  // 16. Highlight selected electrodes and info
  c_display_highlights(){
    const folder_name = CONSTANTS.FOLDERS['highlight-selection'] || 'Data Visualization';
    this.gui.add_item('Highlight Box', true, { folder_name : folder_name })
      .onChange((v) => {
        this.canvas.state_data.set( 'highlight_disabled', !v );
        this.canvas.focus_object( this.canvas.object_chosen );
        this.fire_change();
        this._update_canvas(0);
      });

    this.gui.add_item('Info Text', true, { folder_name : folder_name })
      .onChange((v) => {
        this.canvas.state_data.set( 'info_text_disabled', !v );
        this.fire_change();
        this._update_canvas(0);
      });
  }

  // 17. Voxel color type
  update_voxel_type(){
    let c, v, flag;

    if( this._ctl_voxel_type_options ){
      c = this.gui.get_controller("Voxel Type");
      if( !c.isfake ){

        let atlases = this.canvas.get_atlas_types();
        atlases.push("none");
        if( this._ctl_voxel_type_options.length !== atlases.length ){
          flag = true;
        } else {
          flag = false;
          this._ctl_voxel_type_options.forEach((v, ii) => {
            if( atlases[ii] !== v ){
              flag = true;
            }
          })
        }
        if( flag ){
          flag = this.gui.alter_item("Voxel Type", atlases, () => {
            this._ctl_voxel_type_options = atlases;
          })
        }
      }
    }
  }

  current_voxel_type(){
    const atlas_type = this.canvas.state_data.get("atlas_type") || "none",
          sub = this.canvas.state_data.get("target_subject") || "none",
          inst = this.canvas.threebrain_instances.get(`Atlas - ${atlas_type} (${sub})`);
    if( inst && inst.isDataCube2 ){
      return( inst );
    }
    return;
  }

  c_voxel(){
    const folder_name = CONSTANTS.FOLDERS['atlas'] || 'Volume Settings',
          lut = this.canvas.global_data('__global_data__.VolumeColorLUT'),
          lut_map = lut.map,
          lut_alpha = lut.mapAlpha,
          lut_type = lut.mapDataType;
          // _atype = this.canvas.state_data.get( 'atlas_type' ) || 'none';  //_s
    this._ctl_voxel_type_options = ['none'];
    this._ctl_voxel_type_callback = (v) => {
      if( v ){
        if( this._current_surface_ctype !== "sync from voxels" ){
          this.canvas.__hide_voxels = false;
        }
        this.canvas.switch_subject( '/', {
          'atlas_type': v
        });
        this.fire_change({ 'atlas_type' : v });
      }
    }

    this.gui.add_item('Voxel Type', 'none', {args : ['none'], folder_name : folder_name })
      .onChange( this._ctl_voxel_type_callback );

    this.fire_change({ 'atlas_type' : 'none', 'atlas_enabled' : false});
    this.gui.add_tooltip( CONSTANTS.TOOLTIPS.KEY_CYCLE_ATLAS, 'Voxel Type', folder_name);

    // register key callbacks
    this.canvas.add_keyboard_callabck( CONSTANTS.KEY_CYCLE_ATLAS, (evt) => {
      if( has_meta_keys( evt.event, false, false, false ) ){
        // have to update dynamically because it could change
        const ctl = this.gui.get_controller("Voxel Type");
        const _c = this._ctl_voxel_type_options;
        let current_idx = (_c.indexOf( ctl.getValue() ) + 1) % _c.length;
        if( current_idx >= 0 ){
          ctl.setValue( _c[ current_idx ] );
        }
      }
    }, 'gui_atlas_type');

    // If color map supports alpha, add override option
    const atlas_alpha = this.gui.add_item('Voxel Opacity', 0.0, { folder_name : folder_name })
      .min(0).max(1).step(0.01)
      .onChange((v) => {
        const inst = this.current_voxel_type(),
              opa = v < 0.001 ? -1 : v;
        // mesh.material.uniforms.alpha.value = opa;
        if( inst && inst.isDataCube2 ){
          inst.object.material.uniforms.alpha.value = opa;
          if( opa < 0 ){
            inst._set_palette();
            inst.object.material.uniforms.cmap.value.needsUpdate = true;
          }
        }
        this._update_canvas();
        this.fire_change({ 'atlas_alpha' : opa });
      });

    // this.gui.hide_item("Voxel Opacity")

    //.add_item('Intersect MNI305', "NaN, NaN, NaN", {folder_name: folder_name});
    if( lut_type === "continuous" ){

      const cmap_array = Object.values(lut_map);
      const voxel_value_range = to_array( lut.mapValueRange );
      const voxel_minmax = (l, u) => {
        const inst = this.current_voxel_type();
        if( inst && inst.isDataCube2 ){

          // might be large?
          new Promise( () => {

            let tmp;
            const candidates = cmap_array.filter((e) => {
              tmp = parseFloat(e.Label);
              if(isNaN(tmp)){ return(false); }
              if( tmp >= l && tmp <= u ){ return(true); }
              return(false);
            }).map( (e) => {
              return(e.ColorID);
            });

            inst._set_palette( candidates );

            inst.object.material.uniforms.cmap.value.needsUpdate = true;
            this._update_canvas();
          });

        }
      }
      if(cmap_array.length > 0){
        let vmin = voxel_value_range[0],
            vmax = voxel_value_range[1];
        this.gui.add_item('Voxel Min', vmin, { folder_name : folder_name })
          .min(vmin).max(vmax).step((vmax - vmin) / cmap_array.length)
          .onChange((v) => {
            vmin = v;
            voxel_minmax(vmin, vmax);
          });

        this.gui.add_item('Voxel Max', vmax, { folder_name : folder_name })
          .min(vmin).max(vmax).step((vmax - vmin) / cmap_array.length)
          .onChange((v) => {
            vmax = v;
            voxel_minmax(vmin, vmax);
          });
      }

    } else {
      const atlas_thred_text = this.gui.add_item('Voxel Label', "0", { folder_name : folder_name })
      .onChange((v) => {

        if(typeof(v) !== "string"){ return; }

        const inst = this.current_voxel_type();
        if( inst && inst.isDataCube2 ){

          // might be large?
          new Promise( () => {
            const candidates = v.split(",")
              .map((v) => {return parseInt(v)})
              .filter((v) => {return !isNaN(v)});
            inst._set_palette( candidates );
            inst.object.material.uniforms.cmap.value.needsUpdate = true;
            this._update_canvas();
          });

        }


      });
    }
  }


  // -------------------------- New version --------------------------

  c_localization(){
    const folder_name = CONSTANTS.FOLDERS['localization'] || 'Electrode Localization';
    const edit_mode = this.gui.add_item( 'Edit Mode', "disabled", {
      folder_name: folder_name,
      args: ['disabled', 'CT/volume', 'MRI slice']
    });
    const elect_loc = this.gui.add_item( 'Pointer Position', "", {
      folder_name: folder_name
    });

    const electrodes = [];

    const pos = [0,0,0];

    const electrode_from_ct = () => {
      const inst = this.current_voxel_type();
      if( !inst ){ return; }
      this.canvas.set_raycaster();
      const res = THREE.raycast_volume(
        this.canvas.mouse_raycaster.ray.origin,
        this.canvas.mouse_raycaster.ray.direction,
        new THREE.Vector3().fromArray( inst._cube_dim ),
        new THREE.Vector3().set(
          inst._margin_length.xLength,
          inst._margin_length.yLength,
          inst._margin_length.zLength,
        ),
        inst._color_texture.image.data,
        2
      );
      pos[0] = res[3];
      pos[1] = res[4];
      pos[2] = res[5];

      return ( pos );
    };
    const electrode_from_slice = ( scode ) => {
      if( !this.canvas._has_datacube_registered ){ return; }
      const l = canvas.volumes.get(scode);
      const k = Object.keys(l);
      if( !k.length ) { return; }
      const planes = l[k[0]];
      if(!Array.isArray(planes) || planes.length != 3){ return; }

      this.canvas.set_raycaster();
      this.canvas.mouse_raycaster.layers.set( CONSTANTS.LAYER_SYS_MAIN_CAMERA_8 );

      const items = this.canvas.mouse_raycaster.intersectObjects( planes );

      if( !items.length ){ return; }

      const p = items[0].point;
      pos[0] = p.x;
      pos[1] = p.y;
      pos[2] = p.z;
      return( pos );
    };
    const electrode_pos = () => {
      const mode = edit_mode.getValue();
      const scode = this.canvas.state_data.get("target_subject");
      if( !mode || !scode || scode === "" ){ return; }
      switch(mode){
        case "CT/volume":
          return( electrode_from_ct() );
          break;
        case "MRI slice":
          return( electrode_from_slice( scode ) );
          break;
        default:
          return;
      }
    };

    // add canvas update
    this.canvas._custom_updates.set("localization_update", () => {
      const electrode_position = electrode_pos();
      if( !Array.isArray(electrode_position) || electrode_position.length != 3 ){
        elect_loc.setValue("");
      } else {
        elect_loc.setValue(
          electrode_position.map((e) => {
            return(e.toFixed(2))
          }).join(", ")
        );
      }

    });

    // bind dblclick
    this.canvas.bind( 'localization_dblclick', 'dblclick',
      (event) => {
        const scode = this.canvas.state_data.get("target_subject");
        const electrode_position = electrode_pos();

        if( !Array.isArray(electrode_position) || electrode_position.length != 3 ){ return; }
        const num = electrodes.length + 1,
              group_name = `group_Electrodes (${scode})`;

        const el = add_electrode2(
          {
            "name": `${scode}, ${num} - NEW_ELECTRODE`,
            "type": "sphere",
            "time_stamp": [],
            "position": electrode_position,
            "value": null,
            "clickable": true,
            "layer": 0,
            "group":{
              "group_name": group_name,
              "group_layer": 0,
              "group_position":[0,0,0]
            },
            "use_cache":false,
            "custom_info": "",
            "subject_code": scode,
            "radius": 1.5,
            "width_segments": 10,
            "height_segments": 6,
            "is_electrode":true,
            "is_surface_electrode": false,
            "use_template":false,
            "surface_type": 'pial',
            "hemisphere": null,
            "vertex_number": -1,
            "sub_cortical": true,
            "search_geoms": null
          },
          this.canvas
        );
        electrodes.push( el );

      }, this.canvas.main_canvas, false );

    // open folder
    this.gui.open_folder( folder_name );
  }


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

    // const st = this.canvas.get_surface_types().concat( this.canvas.get_volume_types() );
    const elec_surface = this.gui.add_item( 'Electrode type', 'Surface', {
      folder_name: folder_name, args: ['Surface', 'Depth']
    } ).onChange((v) => {
      if( this.canvas.edit_mode ){
        let el = get_electrode();
        if( el ){
          el.userData.construct_params.is_surface_electrode = (v === 'Surface');
        }
        if( v === 'Depth' ){
          this.gui.get_controller('Overlay Coronal', 'Volume Settings').setValue( true );
          this.gui.get_controller('Overlay Axial', 'Volume Settings').setValue( true );
          this.gui.get_controller('Overlay Sagittal', 'Volume Settings').setValue( true );
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
    this.gui.folders["Default"].close();
    this.gui.folders["Volume Settings"].close();
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
    const _close_f = (e) => {
      if( typeof this.__on_closed === 'function' ){
        this.__on_closed( e );
      }
    };
    this._gui.__closeButton.addEventListener('click', _close_f);

    this.dispose = () => {
      this._gui.__closeButton.removeEventListener('click', _close_f);
    };

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
      this.__on_closed( true );
    }
  }

  open(){
    this._gui.open();
    if( typeof this.__on_closed === 'function' ){
      this.__on_closed( false );
    }
  }


  // function to
  set_closeHandler( h ){
    if( typeof h === 'function' ){
      this.__on_closed = h;
    }
  }

  // remember from args
  remember( args ){

    const keys = [
      "Background Color", "Camera Position", "Display Coordinates", "Show Panels", "Coronal (P - A)",
      "Axial (I - S)", "Sagittal (L - R)", "Overlay Coronal", "Overlay Axial", "Overlay Sagittal",
      "Dist. Threshold", "Surface Type", "Surface Material", "Left Hemisphere", "Right Hemisphere",
      "Left Opacity", "Right Opacity",
      "Map Electrodes", "Surface Mapping", "Volume Mapping", "Visibility", "Display Data",
      "Display Range", "Threshold Data", "Threshold Range", "Threshold Method",
      "Show Legend", "Show Time", "Highlight Box", "Info Text",
      "Voxel Type", "Voxel Label", "Voxel Opacity", 'Voxel Min', 'Voxel Max',
      'Surface Color', 'Blend Factor', 'Sigma', 'Decay', 'Range Limit'
    ];
    const args_dict = to_dict( args );


    keys.forEach((k) => {
      if( args_dict[k] !== undefined ){
        console.debug("Setting " + k);
        this.get_controller(k).setValue( args_dict[k] );
      }
    });

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
    re.isfake = true;

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
  add_item(name, value, options = {}, tooltip = null){
    let folder_name = options.folder_name || 'Default',
        args = options.args,
        is_color = options.is_color || false;

    if(this.params[name] !== undefined){
      return(undefined);
    }
    this.params[name] = value;
    let folder = this.add_folder(folder_name);

    this.ctrls[name] = folder_name;

    let _c;
    if(is_color){
      _c = folder.addColor(this.params, name);
    }else{
      if( args ){
        _c = folder.add(this.params, name, args);
      }else{
        _c = folder.add(this.params, name);
      }
    }

    return(_c);
  }

  alter_item(name, options, onSucceed = null, folder_name = 'Default'){
    let c = this.get_controller(name, folder_name);
    if( c.getValue && c.options ){
      console.debug("Altering controller: " + name);
      // will unlink listeners
      const v = c.getValue(),
            o = to_array( options ),
            callback = c.__onChange;
      if( !o.includes(v) && o.length > 0 ){
        v = o[0];
      }
      c.options( options );

      c = this.get_controller(name, folder_name);
      c.__onChange = undefined;
      c.setValue( v );
      c.__onChange = callback;
      if( typeof(onSucceed) === 'function' ){
        onSucceed();
      }
      return( true );
    }
    return( false );
  }

  add_tooltip( tooltip, name, folder ){
    const _c = this.get_controller( name, folder );
    if( _c.__li ){
      _c.__li.setAttribute('viewer-tooltip', tooltip);
    }
  }


}




export { THREEBRAIN_PRESETS, THREEBRAIN_CONTROL };

//window.THREEBRAIN_PRESETS = THREEBRAIN_PRESETS;
//window.THREEBRAIN_CONTROL = THREEBRAIN_CONTROL;
