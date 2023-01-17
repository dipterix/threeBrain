import { NiftiImage } from '../formats/NIfTIImage.js';
import { MGHImage } from '../formats/MGHImage.js';

class CanvasFileLoader {

  constructor( canvas ) {
    this.canvas = canvas;
    this.cache = this.canvas.cache;
    this.use_cache = this.canvas.use_cache;
    this.fileReader = new FileReader();
    this._currentFile = "";
    this._currentType = "json";
    this._currentCallback = null;
    this._idle = true;

    this.fileReader.addEventListener("loadstart", e => {
      this._idle = false;
      this._onLoadStart(e);
    });
    this.fileReader.addEventListener("loadend", e => {
      // this._idle = true;
    });
    this.fileReader.addEventListener("load", e => {
      e.currentFile = this._currentFile;
      e.currentType = this._currentType;
      this._onLoad(e, this._currentCallback);
      this._idle = true;
    });

  }

  _ensureIdle( callback ) {
    return new Promise((resolve) => {
      const checkIdle = () => {
        if( this._idle ) {
          this._idle  = false;
          resolve( callback() );
        } else {
          setTimeout(checkIdle, 10);
        }
      }
      checkIdle();
    });
  }

  read( url ) {
    const urlLowerCase = url.toLowerCase();
    if( urlLowerCase.endsWith("nii") || urlLowerCase.endsWith("nii.gz") ) {
      return this.readNIFTI( url );
    } else if ( urlLowerCase.endsWith("mgh") || urlLowerCase.endsWith("mgz") ) {
      return this.readMGH( url );
    } else {
      return this.readJSON( url );
    }
  }

  readNIFTI( url ) {
    return new Promise((resolve) => {
      if( this.cache.check_item( url ) ){
        resolve( this.cache.get_item( url ) );
      } else {
        fetch(url).then( r => r.blob() ).then( blob => {
          this._ensureIdle(() => {
            this._currentFile = url;
            this._currentType = "nii";
            this._currentCallback = resolve;
            this.fileReader.readAsArrayBuffer( blob );
          });
        });
      }
    });
  }
  readMGH( url ) {
    return new Promise((resolve) => {
      if( this.cache.check_item( url ) ){
        resolve( this.cache.get_item( url ) );
      } else {
        fetch(url).then( r => r.blob() ).then( blob => {
          this._ensureIdle(() => {
            this._currentFile = url;
            this._currentType = "mgh";
            this._currentCallback = resolve;
            this.fileReader.readAsArrayBuffer( blob );
          });
        });
      }
    });
  }
  readJSON( url ) {
    return new Promise((resolve) => {
      if( this.cache.check_item( url ) ){
        resolve( this.cache.get_item( url ) );
      } else {
        fetch(url).then( r => r.blob() ).then( blob => {
          this._ensureIdle(() => {
            this._currentFile = url;
            this._currentType = "json";
            this._currentCallback = resolve;
            this.fileReader.readAsText( blob );
          })
        });
      }
    });

  }

  _onLoadStart( evt ) {
    this.canvas.debugVerbose( 'Loading start!' );
  }
  _onLoad( evt, callback ) {
    this.canvas.debugVerbose( `File ${evt.currentFile} (type: ${evt.currentType}) has been loaded. Parsing the blobs...` );

    let v;
    switch (evt.currentType) {
      case 'json':
        v = JSON.parse( evt.target.result );
        break;
      case 'nii':
        v = {
          "volume_data" : new NiftiImage( evt.target.result )
        };
        break;
      case 'mgh':
        v = {
          "volume_data" : new MGHImage( evt.target.result )
        };
        break;
      default:
        // code
    }

    if( v !== undefined && this.use_cache ) {
      // store to cache
      this.cache.set_item( evt.currentFile, v );
    }

    this.canvas.start_animation(0);
    if( typeof callback === "function" ) {
      callback(v);
    }
  }

}


export { CanvasFileLoader };
