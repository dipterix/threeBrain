import { CONSTANTS } from '../core/constants.js';

// 10. subject code

function registerPresetSwitchSubject( ViewerControlCenter ){

  ViewerControlCenter.prototype.addPreset_subject2 = function(){
    // Get subjects
    const folderName = CONSTANTS.FOLDERS[ 'subject-selector' ],
          subjectIDs = this.canvas.subject_codes;

    // Important: set trackball focusing target
    if( subjectIDs.length > 0 ){
      let targetSubject = this.canvas.get_state( 'target_subject' ) || subjectIDs[0];
      this.gui
        .addController('Subject', "/", { folderName : folderName, args : subjectIDs })
        .onChange((v) => {
          this.canvas.switch_subject( v );
          this.broadcast();
          this.canvas.needsUpdate = true;
        })
        .setValue( targetSubject );
    }else{
      // controller center
      const controlCenter = this.settings.control_center;
      this.canvas.trackball.lookAt({
        x : controlCenter[0],
        y : controlCenter[1],
        z : controlCenter[2],
        remember : true
      });
    }
  }
  return( ViewerControlCenter );

}

export { registerPresetSwitchSubject };
