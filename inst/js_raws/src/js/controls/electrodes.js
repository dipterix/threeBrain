import { is_electrode } from '../geometry/sphere.js';
import { to_array, has_meta_keys } from '../utils.js';
import { CONSTANTS } from '../constants.js';
import { set_visibility } from '../utils.js';

// 13. electrode visibility, highlight, groups
// 14. electrode mapping
// 16. Highlight selected electrodes and info

function register_controls_electrodes( THREEBRAIN_PRESETS ){

  THREEBRAIN_PRESETS.prototype.set_electrodes_visibility = function( v ){
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
    this.canvas.set_state('electrode_visibility', v);

    this._update_canvas();
    this.fire_change({ 'electrode_visibility' : v });
    return(true);
  };

  THREEBRAIN_PRESETS.prototype.set_electrodes_label = function(args){
    if(typeof args !== "object" || !args) { return; }

    let change_scale = false, scale = 0,
        change_visible = false, visible = false;

    if(typeof args.scale === "number" && args.scale > 0) {
      change_scale = true;
      scale = args.scale;
    }
    if( args.visible !== undefined ) {
      change_visible = true;
      visible = args.visible ? true: false;
    }

    if(!change_scale && !change_visible) { return; }

    // render electrode colors by subjects
    this.canvas.subject_codes.forEach((subject_code, ii) => {
      to_array( this.canvas.electrodes.get( subject_code ) ).forEach((e) => {
        if(e.isMesh && e.userData.instance && e.userData.instance.isElectrode ) {
          if( change_visible ) {
            e.userData.instance.set_label_visible( visible );
          }
          if( change_scale ) {
            e.userData.instance.set_label_scale ( scale )
          }
        }
      });
    });

    const electrode_label = this.canvas.get_state('electrode_label', {});

    if( change_scale ) {
      electrode_label.scale = scale;
    }
    if( change_visible ) {
      electrode_label.visible = visible;
    }
    this.canvas.set_state('electrode_label', electrode_label);

    this._update_canvas();
    this.fire_change({ 'electrode_label' : electrode_label });
    return(true);
  };

  THREEBRAIN_PRESETS.prototype.c_electrodes = function(){
    const folder_name = CONSTANTS.FOLDERS[ 'electrode-style' ];
    const show_inactives = this.settings.show_inactive_electrodes;
    const vis_types = ['all visible', 'hide inactives', 'hidden'];
    const initial_value = show_inactives? 'all visible': 'hide inactives';

    this.canvas.set_state('electrode_visibility', initial_value);

    // please check if el is electrode before dumpping into this function
    this._electrode_visibility = (el, ii, v) => {
      if( !is_electrode( el ) ){
        return(null);
      }
      switch (v) {
        case 'hidden':
          // el is invisible
          // el.visible = false;
          set_visibility( el, false );
          break;
        case 'hide inactives':
          if( el.material.isMeshLambertMaterial ){
            // el.visible = false;
            set_visibility( el, false );
          }else{
            // el.visible = true;
            set_visibility( el, true );
          }
          break;
        default:
          // el.visible = true;
          set_visibility( el, true );
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

    this.canvas.set_state('electrode_label', {
      scale : 2,
      visible : true
    });
    this.gui.add_item('Text Scale', 1.5,
      {folder_name : folder_name })
      .min(1).max(6)
      .onChange((v) => {
        this.set_electrodes_label({
          scale : v
        });
        this.fire_change();
      });

    const electrode_label_visible = this.gui.add_item('Text Visibility', false,
      {folder_name : folder_name })
      .onChange((v) => {
        this.set_electrodes_label({
          visible : v
        });
        this.fire_change();
      });

    this.canvas.add_keyboard_callabck( CONSTANTS.KEY_TOGGLE_ELEC_LABEL_VISIBILITY, (evt) => {
      if( has_meta_keys( evt.event, true, false, false ) ){
        const v = electrode_label_visible.getValue();
        electrode_label_visible.setValue( !v );
      }
    }, 'gui_c_electrode_labels');

  };

  THREEBRAIN_PRESETS.prototype.c_map_template = function(){
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
      // this.gui.open_folder( folder_name );
    }

  };

  THREEBRAIN_PRESETS.prototype.c_display_highlights = function(){
    const folder_name = CONSTANTS.FOLDERS['highlight-selection'] || 'Data Visualization';
    this.gui.add_item('Highlight Box', true, { folder_name : folder_name })
      .onChange((v) => {
        this.canvas.set_state( 'highlight_disabled', !v );
        this.canvas.focus_object( this.canvas.object_chosen );
        this.fire_change();
        this._update_canvas(0);
      });

    this.gui.add_item('Info Text', true, { folder_name : folder_name })
      .onChange((v) => {
        this.canvas.set_state( 'info_text_disabled', !v );
        this.fire_change();
        this._update_canvas(0);
      });
  };

  return( THREEBRAIN_PRESETS );

}

export { register_controls_electrodes };
