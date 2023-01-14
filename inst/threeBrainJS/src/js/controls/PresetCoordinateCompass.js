import { CONSTANTS } from '../core/constants.js';

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
        this.broadcast();
      });
  };

  return( ViewerControlCenter );

}

export { registerPresetCoordinateCompass };
