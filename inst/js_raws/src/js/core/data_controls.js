// 1. Background colors
import { register_controls_background } from '../controls/background.js';

// 2. Record Videos
import { register_controls_record } from '../controls/record.js';

// 3. Reset Camera
// 4. Camera Position
import { register_controls_camera } from '../controls/camera.js';

// 5. display axis anchor
import { register_controls_axis } from '../controls/axis.js';

// 6. toggle side panel
// 7. reset side panel position
// 8. coronal, axial, sagittal position (depth)
// 9. Electrode visibility in side canvas
import { register_controls_side_canvas } from '../controls/side_canvas.js';

// 10. subject code
import { register_controls_subject } from '../controls/subject.js';


// 11. surface type
// 12. Hemisphere material/transparency
// surface color
import { register_controls_surface } from '../controls/surface.js';

// 13. electrode visibility, highlight, groups
// 14. electrode mapping
// 15. Highlight selected electrodes and info
import { register_controls_electrodes } from '../controls/electrodes.js';

// 16. animation, play/pause, speed, clips...
import { register_controls_animation } from '../controls/animation.js';

// 17. Voxel color type
import { register_controls_voxels } from '../controls/voxels.js';

// 18. Electrode localization
import { register_controls_localization } from '../controls/localization.js';


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

  c_syncviewer(){
    if( this.shiny.shiny_mode ){
      const folder_name = CONSTANTS.FOLDERS['sync-viewers'];
      this.gui.add_item('Send to Other Viewers', () => {
        this.fire_change({ 'sync' : this.shiny.uuid }, 'event' );
      }, {folder_name: folder_name });
    }
  }


}

THREEBRAIN_PRESETS = register_controls_background( THREEBRAIN_PRESETS );
THREEBRAIN_PRESETS = register_controls_record( THREEBRAIN_PRESETS );
THREEBRAIN_PRESETS = register_controls_camera( THREEBRAIN_PRESETS );
THREEBRAIN_PRESETS = register_controls_axis( THREEBRAIN_PRESETS );
THREEBRAIN_PRESETS = register_controls_side_canvas( THREEBRAIN_PRESETS );
THREEBRAIN_PRESETS = register_controls_subject( THREEBRAIN_PRESETS );
THREEBRAIN_PRESETS = register_controls_surface( THREEBRAIN_PRESETS );
THREEBRAIN_PRESETS = register_controls_electrodes( THREEBRAIN_PRESETS );
THREEBRAIN_PRESETS = register_controls_animation( THREEBRAIN_PRESETS );
THREEBRAIN_PRESETS = register_controls_voxels( THREEBRAIN_PRESETS );
THREEBRAIN_PRESETS = register_controls_localization( THREEBRAIN_PRESETS );

export { THREEBRAIN_PRESETS };
