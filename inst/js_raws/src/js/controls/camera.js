import { Vector3 } from 'three';
import { CONSTANTS } from '../constants.js';

// 3. Reset Camera
// 4. Camera Position

function register_controls_camera( THREEBRAIN_PRESETS ){

  THREEBRAIN_PRESETS.prototype.c_reset_camera = function(){
    const folder_name = CONSTANTS.FOLDERS[ 'reset-main-camera' ];
    this.gui.add_item('Reset', () => {
      // Center camera first.
      this.canvas.handle_resize( undefined, undefined, false, true );
  		this.canvas.trackball.reset();
  		this.canvas.mainCamera.reset();
      this.canvas.trackball.enabled = true;
      this.canvas.start_animation(0);
    }, {folder_name: folder_name});
  };

  THREEBRAIN_PRESETS.prototype.c_main_camera_position = function(){
    const folder_name = CONSTANTS.FOLDERS[ 'main-camera-position' ];
    const camera_pos = this.gui.add_item('Camera Position', '[free rotate]', {
      args : ['[free rotate]', '[lock]', 'right', 'left', 'anterior', 'posterior', 'superior', 'inferior'],
      folder_name : folder_name
    }).onChange((v) => {

      if( v === '[free rotate]' ) {
        this.canvas.trackball.enabled = true;
        return;
      }
      if( v === '[lock]' ){
        this.canvas.trackball.enabled = false;
        return;
      }
      this.canvas.trackball.enabled = true;
      this.canvas.mainCamera.setPosition2( v );
      camera_pos.__select.value = '[free rotate]';

      this._update_canvas();
    });
    /**
     * initialize camera position. This requires `__reset_flag` from Canvas
     * If __reset_flag=false, this means we are in shiny_mode and the widget
     * has already been loaded once
     */

    if( this.canvas.__reset_flag ){
      const inital_camera_pos = new Vector3().fromArray(
        this.settings.camera_pos
      );
      inital_camera_pos.forceZUp = true;
      this.canvas.mainCamera.setPosition( inital_camera_pos );
    }

    this._update_canvas();
  }

  return( THREEBRAIN_PRESETS );

}

export { register_controls_camera };
