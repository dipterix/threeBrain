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
  THREEBRAIN_PRESETS.prototype.set_surface_ctype = function(
    t, params = {}
  ){

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
  };

  return( THREEBRAIN_PRESETS );

}

export { register_controls_surface };
