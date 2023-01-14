import { CCFrameEncoder } from './CCFrameEncoder.js';
import * as download from 'downloadjs';
// import { ArrayBufferDataStream, BlobBuffer, WebMWriter } from './webm-writer-0.2.0.js';


/*

	WebM Encoder

*/

class CCWebMEncoder extends CCFrameEncoder{
  constructor( settings ){

    super( settings );

    this.canvas = document.createElement( 'canvas' );
  	if( this.canvas.toDataURL( 'image/webp' ).substr(5,10) !== 'image/webp' ){
  		console.log( "WebP not supported - try another export format" );
  	}

  	this.quality = ( settings.quality / 100 ) || 0.4;

  	this.extension = '.webm';
  	this.mimeType = 'video/webm';
  	this.baseFilename = this.filename;
    this.framerate = settings.framerate;

  	this.frames = 0;
  	this.part = 1;

    this.videoWriter = new window.WebMWriter({
      quality: this.quality,
      fileWriter: null,
      fd: null,
      frameRate: this.framerate
    });

  }

  stop(){
    this.recording = false;
  }

  start( canvas ){
    this.dispose();
  }

  save( callback ) {
    if( !callback ){
      callback = (blob) => {
        console.log('Start to download...');
        download( blob, this.filename + this.extension, this.mineType );
      };
    }
    try {
      this.videoWriter.complete().then(callback);
    } catch (e) {
      console.warn(e);
    }

  }

  dispose( canvas ) {
    this.canvas = document.createElement("canvas");
    this.height = undefined;
  	this.frames = 0;
    this.videoWriter = new window.WebMWriter({
      quality: this.quality,
      fileWriter: null,
      fd: null,
      frameRate: this.framerate
    });

  }

  add( canvas ) {
    try {
      if(!this.height || !this.context){
        this.height = parseInt(1080 / canvas.width * canvas.height);
        this.canvas.width = '1080';
        this.canvas.height = String(this.height);
        this.context = this.canvas.getContext("2d");
      }
      //resize
      this.context.drawImage(canvas, 0, 0, 1080, this.height);

      const datauri = this.canvas.toDataURL('image/webp', {quality: this.quality});

      this.videoWriter.addFrame(datauri, 1080, this.height, true);


    	if( this.settings.autoSaveTime > 0 && ( this.frames / this.settings.framerate ) >= this.settings.autoSaveTime ) {
    		this.save( function( blob ) {
    			this.filename = this.baseFilename + '-part-' + pad( this.part );
    			download( blob, this.filename + this.extension, this.mimeType );
    			this.dispose();
    			this.part++;
    			this.filename = this.baseFilename + '-part-' + pad( this.part );
    			this.step();
    		}.bind( this ) );
    	} else {
        this.frames++;
    		this.step();
    	}
    } catch (e) {
      console.warn(e);
    }


  }
}


export { CCWebMEncoder };
