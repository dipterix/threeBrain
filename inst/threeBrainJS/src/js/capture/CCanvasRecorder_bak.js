import { CCFrameEncoder } from './CCFrameEncoder.js';
import * as download from 'downloadjs';
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

  	this.canvas = document.createElement('canvas');
  	// this.canvas.height = settings.main_height || 608;
  	this.ratio = settings.pixel_ratio || 1;
  	this.sidebar_width = (settings.sidebar_width || 0) * this.ratio;
  	// this.canvas.width = (settings.main_width || 1080) + this.sidebar_width;
  	this.context = this.canvas.getContext("2d");

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

  set_dim( canvas ){
    if( this.canvas.width  != canvas.width + this.sidebar_width ){
      this.canvas.width = canvas.width + this.sidebar_width;
      this.canvas.innerWidth = this.canvas.width / this.ratio;
    }
    if( this.canvas.height != canvas.height ){
      this.canvas.height = canvas.height;
      this.canvas.innerHeight = this.canvas.height / this.ratio;
    }
  }

  start( canvas ){
    this.dispose();
    this.set_dim( canvas );
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

  add( canvas, addInfo = '', background = '#ffffff', foreground = '#000000' ) {
    this.set_dim( canvas );
    this.context = this.canvas.getContext('2d');
    this.context.fillStyle = background;
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    //resize
    this.context.drawImage(canvas, this.sidebar_width, 0);

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
  }
}


// CCWebMEncoder.prototype = Object.create( CCFrameEncoder.prototype );

export { CCanvasRecorder };
