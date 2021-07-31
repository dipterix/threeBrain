import { CONSTANTS } from '../constants.js';
import { CCanvasRecorder } from '../capture/CCanvasRecorder.js';

// 2. Record Videos

function register_controls_record( THREEBRAIN_PRESETS ){

  THREEBRAIN_PRESETS.prototype.c_recorder = function(){
    const folder_name = CONSTANTS.FOLDERS[ 'video-recorder' ];
    this.gui.add_item('Record Video', false, {folder_name: folder_name })
      .onChange((v) =>{

        if(v){
          // create capture object
          if( !this.canvas.capturer ){
            this.canvas.capturer = new CCanvasRecorder({
              canvas: this.canvas.domElement,
              // FPS = 15
              framerate: 24,
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
          }

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
      /* const img = this.canvas.domElement.toDataURL('image/png');
      const _d = new Date().toJSON();

      download(img, `[rave-brain] ${_d}.png`, 'image/png'); */
      const _d = new Date().toJSON();
      const doc = this.canvas.mapToPDF();
      doc.save(`[rave-brain] ${_d}.pdf`);
    }, {folder_name: folder_name });

  };

  return( THREEBRAIN_PRESETS );

}

export { register_controls_record };
