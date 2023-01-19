import { CONSTANTS } from '../core/constants.js';
import { CCanvasRecorder } from '../capture/CCanvasRecorder.js';
import { PDFContext } from '../core/context.js';

// 2. Record Videos

function registerPresetRecorder( ViewerControlCenter ){

  ViewerControlCenter.prototype.addPreset_recorder = function(){
    const folder_name = CONSTANTS.FOLDERS[ 'video-recorder' ];
    this.gui.addController('Record', false, {folder_name: folder_name })
      .onChange((v) =>{

        if(v){
          // create capture object
          if( this.canvas.capturer ){
            this.canvas.capturer.dispose();
          }

          const videoFormats = {};
          videoFormats[ "video/mp4" ] = "mp4";   // safari
          videoFormats[ "video/webm;codecs=vp8" ] = "webm"; // firefox
          videoFormats[ "video/webm" ] = "webm";  // default
          let format, mimeType;
          for( mimeType in videoFormats ) {
            format = videoFormats[ mimeType ];
            if( MediaRecorder.isTypeSupported( mimeType ) ) {
              break;
            }
          }


          this.canvas.capturer = new CCanvasRecorder({
            canvas: this.canvas.domElement,
            // FPS = 25
            framerate: 60,
            // Capture as webm
            format: format,
            mimeType: mimeType,
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

    this.gui.addController('Screenshot', () => {

      const _d = new Date().toJSON();
      // const doc = this.canvas.mapToPDF();
      const results = this.canvas.incrementTime(),
            _width = this.canvas.domElement.width,
            _height = this.canvas.domElement.height;
      const pdf_wrapper = new PDFContext( this.canvas.domElement );

      pdf_wrapper.set_font_color( this.canvas.foreground_color );

      // Clear the whole canvas
      // copy the main_renderer context
      pdf_wrapper.background_color = this.canvas.background_color;
      pdf_wrapper.draw_image( this.canvas.main_renderer.domElement, 0, 0, _width, _height );

      // Draw timestamp on the bottom right corner
      // this.canvas._draw_ani( results, 0, 0, _width, _height, pdf_wrapper );

      // Draw focused target information on the top right corner
      // this.canvas._draw_focused_info( results, 0, 0, _width, _height, pdf_wrapper, true );

      // Draw legend on the right side
      // this.canvas._draw_legend( results, 0, 0, _width, _height, pdf_wrapper );

      // try {
      //   this.canvas._draw_video( results, _width, _height, pdf_wrapper );
      // } catch (e) {}


      pdf_wrapper.context.save(`[threeBrain] ${_d}.pdf`);
    }, {folder_name: folder_name });

  };

  return( ViewerControlCenter );

}

export { registerPresetRecorder };
