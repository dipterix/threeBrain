import { invertColor } from '../utils.js';
import { CONSTANTS } from '../constants.js';

// 1. Background colors

function register_controls_background( THREEBRAIN_PRESETS ){

  THREEBRAIN_PRESETS.prototype.c_background = function(){
    const initial_bgcolor = this.settings.background || "#ffffff",
          folder_name = CONSTANTS.FOLDERS['background-color'];

    this.gui.add_item('Background Color', '#FFFFFF', {is_color : true, folder_name: folder_name})
      .onChange((v) => {

        // calculate inversed color for text
        const inversedColor = invertColor(v);

        this.canvas.background_color = v;
        this.canvas.foreground_color = inversedColor;

        // Set renderer background to be v
        this.canvas.main_renderer.setClearColor(v);
        this.canvas.el.style.backgroundColor = v;

        this.fire_change({ 'background' : v });

        // force re-render
        this._update_canvas(0);

        this.canvas.sideCanvasList.coronal.setBackground(v);
        this.canvas.sideCanvasList.axial.setBackground(v);
        this.canvas.sideCanvasList.sagittal.setBackground(v);

        // this.el_text.style.color=inversedColor;
        // this.el_text2.style.color=inversedColor;
        // this.el.style.backgroundColor = v;
      })
      .setValue( initial_bgcolor );

  }

  return( THREEBRAIN_PRESETS );

}

export { register_controls_background };
