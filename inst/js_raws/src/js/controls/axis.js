import { CONSTANTS } from '../constants.js';

// 5. display axis anchor

function register_controls_axis( THREEBRAIN_PRESETS ){

  THREEBRAIN_PRESETS.prototype.c_toggle_anchor = function(){
    const folder_name = CONSTANTS.FOLDERS[ 'toggle-helpper' ];
    this.gui.add_item('Display Coordinates', false, { folder_name: folder_name })
      .onChange((v) => {
        this.canvas.set_cube_anchor_visibility(v);
        this.fire_change();
      });
  };

  return( THREEBRAIN_PRESETS );

}

export { register_controls_axis };
