import { invertColor } from '../utils.js';
import { CONSTANTS } from '../constants.js';

// 1. Background colors

function registerPresetBackground( ViewerControlCenter ){

  ViewerControlCenter.prototype.addPreset_background = function(){
    const initialValue = this.settings.background || "#ffffff",
          folderName = CONSTANTS.FOLDERS['background-color'];

    const controller = this.gui.addController(
      'Background Color', '#FFFFFF',
      { isColor : true, folderName: folderName }
    )
      .onChange((v) => { this.canvas.setBackground({ color : v }); })
      .setValue( initialValue );

    // bind driver
    this.canvas.bind(
      "canvasDriveBackgound",
      "canvas.drive.background",
      ( event ) => {
        // { color : 0xfff }
        controller.setValue( event.detail.color )
      }
    );
  }

  return( ViewerControlCenter );

}

export { registerPresetBackground };
