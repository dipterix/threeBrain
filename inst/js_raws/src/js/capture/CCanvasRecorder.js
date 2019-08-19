import { CCFrameEncoder } from './CCFrameEncoder.js';
import { download } from '../download.js';
// import { ArrayBufferDataStream, BlobBuffer, WebMWriter } from './webm-writer-0.2.0.js';


/*
	WebM Encoder
*/

class CCanvasRecorder extends CCFrameEncoder{
  constructor( settings ){
    super( settings );
  	this.extension = '.webm';
  	this.mimeType = 'video/webm;codecs=vp8,opus';
  	this.baseFilename = this.filename;
    this.framerate = settings.framerate;
  	this.chunks = [];

  	this.canvas = settings.canvas;

  	// Create stream object
    this.stream = this.canvas.captureStream( this.framerate );

    // create a recorder fed with our canvas' stream
    this.recorder = new MediaRecorder(this.stream, {mimeType : 'video/webm;codecs=vp8,opus'});

    // save the chunks
    this.recorder.ondataavailable = (e) => {
      this.chunks.push(e.data);
    };

    // On stop, save data
    this.recorder.onstop = (e) => {
      this.save((blob) => {
        console.log('Start to download...');
        download( blob, this.filename + this.extension );
      });
      this.chunks.length = 0;
    };
  }

  stop(){
    if(this.recorder && this.recorder.state === 'recording'){
      this.recorder.stop();
    }
  }

  start(){
    this.dispose();
    this.recorder.start();
  }

  save( callback = null ) {
    if( !callback ){
      return(null);
    }

    if( this.chunks.length > 0 ){
      let result = new Blob(this.chunks);
      callback( result );
    }

  }

  dispose() {
    if(this.recorder){
      this.stop();
    }
    this.chunks.length = 0;
  }

  add() {
    /*
    // , addInfo = '', background = '#ffffff', foreground = '#000000'

    // Add additional messages
    if( addInfo && addInfo !== '' ){
      // Add additional information
      const font_size = this.ratio * 20;
      this.context.font = `${font_size}px Georgia`;
      this.context.fillStyle = foreground;
      const ss = addInfo.split('\n');
      for (let ii in ss ){
        this.context.fillText(ss[ii], 10, 50 + 1.4 * font_size * ii);
      }

    }
    */
  }
}


// CCWebMEncoder.prototype = Object.create( CCFrameEncoder.prototype );

export { CCanvasRecorder };
