import { CONSTANTS } from '../constants.js';

// 5. display axis anchor

function registerPresetCoordinateCompass( ViewerControlCenter ){

  ViewerControlCenter.prototype.addPreset_compass = function(){
    const folderName = CONSTANTS.FOLDERS[ 'toggle-helpper' ];
    this.gui.addController('Display Coordinates', true, { folderName : folderName })
      .onChange((v) => {

        if( this.canvas.compass ) {
          this.canvas.compass.set_visibility( v );
        }
        this._update_canvas();
        this.fire_change();
      });
  };

  return( ViewerControlCenter );

}

export { registerPresetCoordinateCompass };
