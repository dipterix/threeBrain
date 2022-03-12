import { CONSTANTS } from '../constants.js';
import { has_meta_keys } from '../utils.js';

// 11. surface type
// 12. Hemisphere material/transparency
// surface color

function register_controls_surface( THREEBRAIN_PRESETS ){


  THREEBRAIN_PRESETS.prototype.get_surface_ctype = function(){
    const _c = this.gui.get_controller( 'Surface Color' );
    if( _c.isfake ){ return( "none" ); }
    return( _c.getValue() );
  };

  THREEBRAIN_PRESETS.prototype.c_surface_type2 = function(){

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


  };

  THREEBRAIN_PRESETS.prototype.c_hemisphere_material = function(){

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
  };

  THREEBRAIN_PRESETS.prototype.c_surface_color = function(){
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

    this.canvas.state_data.set("surface_color_type", col);
    this.gui.add_item('Surface Color', col, {args : options, folder_name : folder_name })
      .onChange((v) => {

        switch (v) {
          case "sync from voxels":
            this.gui.show_item(['Sigma', 'Blend Factor'], folder_name);
            this.gui.hide_item(['Decay', 'Range Limit'], folder_name);
            break;

          case "sync from electrodes":
            this.gui.show_item(['Decay', 'Range Limit', 'Blend Factor'], folder_name);
            this.gui.hide_item(['Sigma'], folder_name);
            break;

          case "vertices":
            this.gui.show_item(['Blend Factor'], folder_name);
            this.gui.hide_item(['Sigma', 'Decay', 'Range Limit'], folder_name);
            break;

          default:
            // none
            v = "none";
            this.gui.hide_item(['Blend Factor', 'Sigma', 'Decay', 'Range Limit'], folder_name);
        }

        this.canvas.state_data.set("surface_color_type", v);
        this.fire_change({ 'surface_color_type' : v });
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
        // this.set_surface_ctype( true, { 'blend' : v } );
        this.canvas.state_data.set("surface_color_blend", v);
        this._update_canvas();
      });
      this.canvas.state_data.set("surface_color_blend", 0.4);

    // ---------- for voxel-color ---------------

    const map_delta = this.gui.add_item("Sigma", 3.0, { folder_name : folder_name })
      .min( 0 ).max( 10 )
      .onChange((v) => {
        if( v !== undefined ){
          if( v < 0 ){ v = 0; }
          // this.set_surface_ctype( true, { 'sigma' : v } );
          this.canvas.state_data.set("surface_color_sigma", v);
          this._update_canvas();
        }
      });
    this.canvas.state_data.set("surface_color_sigma", 3.0);

    // ---------- for electrode maps ------------
    this.gui.add_item("Decay", 0.15, { folder_name : folder_name })
      .min( 0.05 ).max( 1 ).step( 0.05 )
      .onChange((v) => {
        if( v !== undefined ){
          if( v < 0.05 ){ v = 0.05; }
          // this.set_surface_ctype( true, { 'decay' : v } );
          this.canvas.state_data.set("surface_color_decay", v);
          this._update_canvas();
        }
      });
    this.canvas.state_data.set("surface_color_decay", 0.15);

    this.gui.add_item("Range Limit", 10.0, { folder_name : folder_name })
      .min( 1.0 ).max( 30.0 ).step( 1.0 )
      .onChange((v) => {
        if( v !== undefined ){
          if( v < 1.0 ){ v = 1.0; }
          // this.set_surface_ctype( true, { 'radius' : v } );
          this.canvas.state_data.set("surface_color_radius", v);
          this._update_canvas();
        }
      });
    this.canvas.state_data.set("surface_color_radius", 10.0);

    // 'elec_decay'        : { value : 2.0 },
    // 'blend_factor'      : { value : 0.4 }


    this.gui.hide_item(['Blend Factor', 'Sigma', 'Decay', 'Range Limit'], folder_name);
  };

  return( THREEBRAIN_PRESETS );

}

export { register_controls_surface };
