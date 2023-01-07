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
      this.canvas.reset_controls();
      this.canvas.controls.enabled = true;
    }, {folder_name: folder_name});
  };

  THREEBRAIN_PRESETS.prototype.c_main_camera_position = function(){
    const folder_name = CONSTANTS.FOLDERS[ 'main-camera-position' ];
    const camera_pos = this.gui.add_item('Camera Position', '[free rotate]', {
      args : ['[free rotate]', '[lock]', 'right', 'left', 'anterior', 'posterior', 'superior', 'inferior'],
      folder_name : folder_name
    }).onChange((v) => {

      if( v === '[lock]' ){
        this.canvas.controls.enabled = false;
        return( null );
      }
      this.canvas.controls.enabled = true;

      switch (v) {
        case 'right':
          this.canvas.main_camera.position.set( 500, 0, 0 );
          this.canvas.main_camera.up.set( 0, 0, 1 );
          break;
        case 'left':
          this.canvas.main_camera.position.set( -500, 0, 0 );
          this.canvas.main_camera.up.set( 0, 0, 1 );
          break;
        case 'anterior':
          this.canvas.main_camera.position.set( 0, 500, 0 );
          this.canvas.main_camera.up.set( 0, 0, 1 );
          break;
        case 'posterior':
          this.canvas.main_camera.position.set( 0, -500, 0 );
          this.canvas.main_camera.up.set( 0, 0, 1 );
          break;
        case 'superior':
          this.canvas.main_camera.position.set( 0, 0, 500 );
          this.canvas.main_camera.up.set( 0, 1, 0 );
          break;
        case 'inferior':
          this.canvas.main_camera.position.set( 0, 0, -500 );
          this.canvas.main_camera.up.set( 0, 1, 0 );
          break;
      }

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
      if (inital_camera_pos.length() > 0){
        this.canvas.main_camera.position.set(
          inital_camera_pos.x,
          inital_camera_pos.y,
          inital_camera_pos.z
        ).normalize().multiplyScalar(500);
        if( inital_camera_pos.x !== 0 || inital_camera_pos.y !== 0 ){
          this.canvas.main_camera.up.set( 0, 0, 1 );
        } else {
          this.canvas.main_camera.up.set( 0, 1, 0 );
        }
      }
    }

    this._update_canvas();
  }

  return( THREEBRAIN_PRESETS );

}

export { register_controls_camera };
