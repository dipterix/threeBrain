import { CONSTANTS } from '../constants.js';
import { CCanvasRecorder } from '../capture/CCanvasRecorder.js';
import { PDFContext } from '../core/context.js';

// 2. Record Videos

function register_controls_record( THREEBRAIN_PRESETS ){

  THREEBRAIN_PRESETS.prototype.c_recorder = function(){
    const folder_name = CONSTANTS.FOLDERS[ 'video-recorder' ];
    this.gui.add_item('Record (Chrome-only)', false, {folder_name: folder_name })
      .onChange((v) =>{

        if(v){
          // create capture object
          if( this.canvas.capturer ){
            this.canvas.capturer.dispose();
          }
          this.canvas.capturer = new CCanvasRecorder({
            canvas: this.canvas.domElement,
            // FPS = 25
            framerate: 25,
            // Capture as webm
            format: 'webm',
            // workersPath: 'lib/',
            // verbose results?
            verbose: true,
            autoSaveTime : 0,
            main_width: this.canvas.main_renderer.domElement.width,
            main_height: this.canvas.main_renderer.domElement.height,
            sidebar_width: 300,
            pixel_ratio : this.canvas.main_renderer.domElement.width / this.canvas.main_renderer.domElement.clientWidth
          });

          this.canvas.capturer.baseFilename = this.canvas.capturer.filename = new Date().toGMTString();
          this.canvas.capturer.start();
          this.canvas.capturer_recording = true;
          // Force render a frame
          // Canvas might not render
          // this.canvas.start_animation(0);
        }else{
          this.canvas.capturer_recording = false;
          if(this.canvas.capturer){
            this.canvas.capturer.stop();
            this.canvas.capturer.save();
            // this.canvas.capturer.incoming = false;
          }
        }


      });

    this.gui.add_item('Screenshot', () => {

      const _d = new Date().toJSON();
      // const doc = this.canvas.mapToPDF();
      const results = this.canvas.inc_time(),
            _width = this.canvas.domElement.width,
            _height = this.canvas.domElement.height;
      const pdf_wrapper = new PDFContext( this.canvas.domElement );

      pdf_wrapper.set_font_color( this.canvas.foreground_color );

      // Clear the whole canvas
      // copy the main_renderer context
      pdf_wrapper.background_color = this.canvas.background_color;
      pdf_wrapper.draw_image( this.canvas.main_renderer.domElement, 0, 0, _width, _height );

      // Draw timestamp on the bottom right corner
      this.canvas._draw_ani( results, 0, 0, _width, _height, pdf_wrapper );

      // Draw focused target information on the top right corner
      this.canvas._draw_focused_info( results, 0, 0, _width, _height, pdf_wrapper, true );

      // Draw legend on the right side
      this.canvas._draw_legend( results, 0, 0, _width, _height, pdf_wrapper );

      try {
        this.canvas._draw_video( results, _width, _height, pdf_wrapper );
      } catch (e) {}


      pdf_wrapper.context.save(`[rave-brain] ${_d}.pdf`);
    }, {folder_name: folder_name });

  };

  return( THREEBRAIN_PRESETS );

}

export { register_controls_record };
