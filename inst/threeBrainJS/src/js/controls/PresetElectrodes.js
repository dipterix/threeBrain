import { is_electrode } from '../geometry/sphere.js';
import { to_array } from '../utils.js';
import { CONSTANTS } from '../core/constants.js';
import { set_visibility } from '../utils.js';

// 13. electrode visibility, highlight, groups
// 14. electrode mapping
// 16. Highlight selected electrodes and info

function registerPresetElectrodes( ViewerControlCenter ){

  ViewerControlCenter.prototype.updateElectrodeVisibility = function( visibleString ){
    if( typeof visibleString !== "string" ) {
      const controller = this.gui.getController( 'Visibility', CONSTANTS.FOLDERS[ 'electrode-style' ]);
      if( controller.isfake ) { return; }
      visibleString = controller.getValue();
    }

    this.enablePlayback( false );

    // render electrode colors by subjects
    this.canvas.subject_codes.forEach((subject_code, ii) => {
      to_array( this.canvas.electrodes.get( subject_code ) ).forEach((el) => {
        if( !is_electrode( el ) ){ return; }
        switch ( visibleString ) {
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
      });
    });
    this.canvas.set_state('electrode_visibility', visibleString );

    // this.fire_change({ 'electrode_visibility' : visibleString });
    this.broadcast();
    this.canvas.needsUpdate = true;
    return(true);
  };

  ViewerControlCenter.prototype.updateElectrodeText = function(args){
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

    // this.fire_change({ 'electrode_label' : electrode_label });
    this.broadcast();
    this.canvas.needsUpdate = true;
    return(true);
  };

  ViewerControlCenter.prototype.addPreset_electrodes = function(){
    const folderName = CONSTANTS.FOLDERS[ 'electrode-style' ];
    const showInactives = this.settings.show_inactive_electrodes;
    const visibleChoices = ['all visible', 'hide inactives', 'hidden'];
    const initialSelection = showInactives? 'all visible': 'hide inactives';

    const controllerElectrodeVisiblility = this.gui
      .addController( 'Visibility', initialSelection,
                      { args : visibleChoices, folderName : folderName } )
      .onChange(( v ) => {
        this.updateElectrodeVisibility( v );
        this.broadcast();
        this.canvas.needsUpdate = true;
      });
    controllerElectrodeVisiblility.setValue( initialSelection );
    this.bindKeyboard({
      codes     : CONSTANTS.KEY_CYCLE_ELEC_VISIBILITY,
      shiftKey  : false,
      ctrlKey   : false,
      altKey    : false,
      metaKey   : false,
      tooltip   : {
        key     : CONSTANTS.TOOLTIPS.KEY_CYCLE_ELEC_VISIBILITY,
        name    : 'Visibility',
        folderName : folderName,
      },
      callback  : ( event ) => {
        let selectedIndex = ( visibleChoices.indexOf( controllerElectrodeVisiblility.getValue() ) + 1) % visibleChoices.length;
        if( selectedIndex >= 0 ){
          controllerElectrodeVisiblility.setValue( visibleChoices[ selectedIndex ] );
        }
      }
    });

    this.canvas.set_state('electrode_label', { scale : 2, visible : false });
    this.gui
      .addController('Text Scale', 1.5, { folderName : folderName })
      .min( 1 ).max( 6 ).decimals( 1 )
      .onChange((v) => {
        this.updateElectrodeText({ scale : v });
      });

    const controllerElectrodeTextVisible = this.gui
      .addController('Text Visibility', false, { folderName : folderName })
      .onChange((v) => {
        this.updateElectrodeText({ visible : v });
      });
    this.bindKeyboard({
      codes     : CONSTANTS.KEY_TOGGLE_ELEC_LABEL_VISIBILITY,
      shiftKey  : true,
      ctrlKey   : false,
      altKey    : false,
      metaKey   : false,
      tooltip   : {
        key     : CONSTANTS.TOOLTIPS.KEY_TOGGLE_ELEC_LABEL_VISIBILITY,
        name    : 'Text Visibility',
        folderName : folderName,
      },
      callback  : ( event ) => {
        const v = controllerElectrodeTextVisible.getValue();
        controllerElectrodeTextVisible.setValue( !v );
      }
    });

  };

  ViewerControlCenter.prototype.addPreset_map_template = function(){
    const folderName = CONSTANTS.FOLDERS[ 'electrode-mapping' ];
    const controllerMapElectrodes = this.gui
      .addController('Map Electrodes', false, { folderName : folderName })
      .onChange((v) => {
        this.canvas.switch_subject( '/', { 'map_template': v });
        if( v ){
          this.gui.showControllers( [ 'Surface Mapping' , 'Volume Mapping' ] , folderName );
        } else {
          this.gui.hideControllers( [ 'Surface Mapping' , 'Volume Mapping' ], folderName );
        }
        this.broadcast();
        this.canvas.needsUpdate = true;
      });

    this.gui.addController('Surface Mapping', 'std.141',
                            { args : ['std.141', 'mni305', 'no mapping'], folderName : folderName })
      .onChange((v) => {
        this.canvas.switch_subject( '/', { 'map_type_surface': v });
        this.broadcast();
        this.canvas.needsUpdate = true;
      });

    this.gui.addController('Volume Mapping', 'mni305',
                            { args : ['mni305', 'no mapping'], folderName : folderName })
      .onChange((v) => {
        this.canvas.switch_subject( '/', { 'map_type_volume': v });
        this.broadcast();
        this.canvas.needsUpdate = true;
      });

    // hide mapping options
    this.gui.hideControllers( [ 'Surface Mapping', 'Volume Mapping' ] , folderName );

    // need to check if this is multiple subject case
    if( this.canvas.shared_data.get( ".multiple_subjects" ) ){
      // Do mapping by default
      controllerMapElectrodes.setValue( true );
      // and open gui
      // this.gui.openFolder( folderName );
    }

  };

  ViewerControlCenter.prototype.addPreset_display_highlights = function(){
    const folderName = CONSTANTS.FOLDERS['highlight-selection'] || 'Data Visualization';

    this.gui.addController('Highlight Box', true, { folderName : folderName })
      .onChange((v) => {
        this.canvas.set_state( 'highlight_disabled', !v );
        this.canvas.focus_object( this.canvas.object_chosen );
        this.broadcast();
        this.canvas.needsUpdate = true;
      });

    this.gui.addController('Info Text', true, { folderName : folderName })
      .onChange((v) => {
        this.canvas.set_state( 'info_text_disabled', !v );
        this.broadcast();
        this.canvas.needsUpdate = true;
      });
  };

  return( ViewerControlCenter );

}

export { registerPresetElectrodes };
