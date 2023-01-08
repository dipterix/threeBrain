// 1. Background colors
import { registerPresetBackground } from '../controls/PresetBackground.js';

// 2. Record Videos
import { register_controls_record } from '../controls/record.js';

// 3. Reset Camera
// 4. Camera Position
import { registerPresetMainCamera } from '../controls/PresetMainCamera.js';

// 5. display axis anchor
import { registerPresetCoordinateCompass } from '../controls/PresetCoordinateCompass.js';

// 6. toggle side panel
// 7. reset side panel position
// 8. coronal, axial, sagittal position (depth)
// 9. Electrode visibility in side canvas
import { registerPresetSliceOverlay } from '../controls/PresetSliceOverlay.js';

// 10. subject code
import { registerPresetSwitchSubject } from '../controls/PresetSwitchSubject.js';


// 11. surface type
// 12. Hemisphere material/transparency
// surface color
import { registerPresetSurface } from '../controls/PresetSurface.js';

// 13. electrode visibility, highlight, groups
// 14. electrode mapping
// 15. Highlight selected electrodes and info
import { registerPresetElectrodes } from '../controls/PresetElectrodes.js';

// 16. animation, play/pause, speed, clips...
import { registerPresetElectrodeAnimation } from '../controls/PresetElectrodeAnimation.js';

// 17. Voxel color type
import { registerPresetRaymarchingVoxels } from '../controls/PresetRaymarchingVoxels.js';

// 18. Electrode localization
import { register_controls_localization } from '../controls/localization.js';


class ViewerControlCenter{

  /**
   * Initialization, defines canvas (viewer), gui controller (viewer), and settings (initial values)
   */
  constructor(canvas, gui, settings, shiny){
    this.canvas = canvas;
    this.gui = gui;
    this.settings = settings;
    this.shiny = shiny;

    this.electrode_regexp = RegExp('^electrodes-(.+)$');

    this.cache = {};

    this.__localize_electrode_list = [];

    this.animParameters = this.canvas.animParameters;

    this.canvas.bind( 'update_data_gui_controllers', 'switch_subject',
      (evt) => {
        this.update();
      }, this.canvas.main_canvas );

    this._animOnTimeChange = () => {
      // update time controller
      if( this.ctrlAnimTime !== undefined ) {
        this.ctrlAnimTime.updateDisplay();
      }
    };
    this.animParameters._eventDispatcher.addEventListener( "animation.time.onChange", this._animOnTimeChange )
  }

  enablePlayback ( enable = true ) {
    if( !this.ctrlAnimPlay ) { return; }
    this.ctrlAnimPlay.setValue( enable );
  }


  // update gui controllers
  update(){
    this.updateDataCube2Types();
    // this.set_surface_ctype( true );
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
    this.canvas.dispatch_event( "canvas.controllers.onChange", {
      data: args,
      priority: priority
    });
  }

  c_syncviewer(){
    if( this.shiny.shiny_mode ){
      const folder_name = CONSTANTS.FOLDERS['sync-viewers'];
      this.gui.add_item('Send to Other Viewers', () => {
        this.fire_change({ 'sync' : this.shiny.uuid }, 'event' );
      }, {folder_name: folder_name });
    }
  }


}

ViewerControlCenter = registerPresetBackground( ViewerControlCenter );
ViewerControlCenter = register_controls_record( ViewerControlCenter );
ViewerControlCenter = registerPresetMainCamera( ViewerControlCenter );
ViewerControlCenter = registerPresetCoordinateCompass( ViewerControlCenter );
ViewerControlCenter = registerPresetSliceOverlay( ViewerControlCenter );
ViewerControlCenter = registerPresetSwitchSubject( ViewerControlCenter );
ViewerControlCenter = registerPresetSurface( ViewerControlCenter );
ViewerControlCenter = registerPresetElectrodes( ViewerControlCenter );
ViewerControlCenter = registerPresetElectrodeAnimation( ViewerControlCenter );
ViewerControlCenter = registerPresetRaymarchingVoxels( ViewerControlCenter );
ViewerControlCenter = register_controls_localization( ViewerControlCenter );

export { ViewerControlCenter };
