import { CONSTANTS } from '../constants.js';

// 10. subject code

function register_controls_subject( THREEBRAIN_PRESETS ){

  THREEBRAIN_PRESETS.prototype.c_subject2 = function(){
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

  return( THREEBRAIN_PRESETS );

}

export { register_controls_subject };
