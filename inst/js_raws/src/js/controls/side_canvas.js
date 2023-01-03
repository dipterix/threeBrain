import { has_meta_keys } from '../utils.js';
import { CONSTANTS } from '../constants.js';
import { Vector3 } from '../../build/three.module.js';

// 6. toggle side panel
// 7. reset side panel position
// 8. coronal, axial, sagittal position (depth)
// 9. Electrode visibility in side canvas

function register_controls_side_canvas( THREEBRAIN_PRESETS ){

  THREEBRAIN_PRESETS.prototype.c_toggle_side_panel = function(){
    const folder_name = CONSTANTS.FOLDERS[ 'toggle-side-panels' ];
    const _v = this.settings.side_display || false;

    const show_side = this.gui.add_item('Show Panels', _v, {folder_name: folder_name})
      .onChange((v) => {
        if( v ){
          this.canvas.enableSideCanvas();
        }else{
          this.canvas.disableSideCanvas();
        }
        this.fire_change({ 'side_display' : v });
      });


    if( _v ){
      this.canvas.enableSideCanvas();
    }else{
      this.canvas.disableSideCanvas();
    }
    this.fire_change({ 'side_display' : _v });

  };

  THREEBRAIN_PRESETS.prototype.c_reset_side_panel = function(){
    const folder_name = CONSTANTS.FOLDERS[ 'reset-side-panels' ],
          zoom_level = this.settings.side_canvas_zoom,
          side_width = this.settings.side_canvas_width,
          side_shift = this.settings.side_canvas_shift;
    this.gui.add_item('Reset Position', () => {
      this.canvas.resetSideCanvas( zoom_level, side_width, side_shift );
    }, {folder_name: folder_name});

    // reset first
    this.canvas._side_width = side_width;
    this.canvas.resetSideCanvas( zoom_level, side_width, side_shift );
  }

  THREEBRAIN_PRESETS.prototype.c_side_depth = function(){
    const folder_name = CONSTANTS.FOLDERS[ 'side-three-planes' ];

    const _calculate_intersection_coord = () => {
      console.debug('Recalculate MNI305 for plane intersections');
      // MNI 305 position of the intersection
      const ints_z = this.canvas.get_state( 'axial_depth' ) || 0,
            ints_y = this.canvas.get_state( 'coronal_depth' ) || 0,
            ints_x = this.canvas.get_state( 'sagittal_depth' ) || 0;
      const point = new Vector3().set(ints_x, ints_y, ints_z);
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

  THREEBRAIN_PRESETS.prototype.c_side_electrode_dist = function(){
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

  return( THREEBRAIN_PRESETS );

}

export { register_controls_side_canvas };
