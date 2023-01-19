import { NiftiImage } from '../formats/NIfTIImage.js';
import { MGHImage } from '../formats/MGHImage.js';
import { FreeSurferMesh } from '../formats/FreeSurferMesh.js';
import { FreeSurferNodeValues } from '../formats/FreeSurferNodeValues.js';


class CanvasFileLoader {

  constructor( canvas, useCache = true ) {
    this.canvas = canvas;
    this.cache = this.canvas.cache;
    this.useCache = this.canvas.use_cache && useCache;
    this.loadingFiles = {};
  }

  dispose() {
    for( let url in this.loadingFiles ) {
      const item = this.loadingFiles[ url ];
      if(
        typeof item === "object" &&
        typeof item.data === "object"
      ) {
        if(
          typeof item.data._originalData_ === "object" &&
          item.data._originalData_ !== null &&
          typeof item.data._originalData_.dispose === "function"
        ) {
          item.data._originalData_.dispose();
          delete item.data._originalData_;
        }
        delete item.data;
      }
      delete this.loadingFiles[ url ];
    }
  }

  read( url ) {
    const urlLowerCase = url.toLowerCase();
    let item = this.loadingFiles[ url ];

    if( item !== undefined ) {
      return item;
    }

    if( urlLowerCase.endsWith("nii") || urlLowerCase.endsWith("nii.gz") ) {
      item = this.readBinary( url, "nii" );
    } else if ( urlLowerCase.endsWith("mgh") || urlLowerCase.endsWith("mgz") ) {
      item = this.readBinary( url, "mgh" );
    } else if (
      urlLowerCase.endsWith("pial") || urlLowerCase.endsWith("pial.t1") ||
      urlLowerCase.endsWith("white") || urlLowerCase.endsWith("sphere") ||
      urlLowerCase.endsWith("smoothwm")
    ) {
      item = this.readBinary( url, "fsSurf" );
    } else if (
      urlLowerCase.endsWith("sulc") || urlLowerCase.endsWith("curv")
    ) {
      item = this.readBinary( url, "fsCurv" );
    } else {
      item = this.readJSON( url );
    }
    this.loadingFiles[ url ] = item;
    return item;
  }

  readBinary( url, type ) {
    const fileReader = new FileReader();
    fileReader.addEventListener( "loadstart", this._onLoadStart );
    fileReader.addEventListener( "error", e => { resolve(); })

    return {
      reader : fileReader,
      type : type,
      promise : new Promise((resolve) => {
        if( this.cache.check_item( url ) ){
          resolve( this.cache.get_item( url ) );
        } else {
          fetch(url).then( r => r.blob() ).then( blob => {
            fileReader.addEventListener( "load", (e) => {
              e.currentFile = url;
              e.currentType = type;
              this._onLoad( e );
              resolve( e.target.result );
            });
            fileReader.readAsArrayBuffer( blob );
          });
        }
      })
    };
  }
  readJSON( url ) {
    const fileReader = new FileReader();

    return {
      reader : fileReader,
      type : "json",
      promise : new Promise((resolve) => {
        if( this.cache.check_item( url ) ){
          resolve( this.cache.get_item( url ) );
        } else {
          fetch(url).then( r => r.blob() ).then( blob => {

            fileReader.addEventListener( "loadstart", this._onLoadStart );
            fileReader.addEventListener( "load", (e) => {
              e.currentFile = url;
              e.currentType = "json";
              this._onLoad( e );
              resolve( e.target.result );
            });
            fileReader.addEventListener( "error", e => { resolve(); })
            fileReader.readAsText( blob );

          });
        }
      })
    };

  }

  _onLoadStart = ( evt ) => {
    this.canvas.debugVerbose( 'Loading start!' );
  }

  parse( url ) {
    const item = this.loadingFiles[ url ];
    if( item === undefined ) { return; }
    if( item.data !== undefined ) { return item.data; }

    const buffer = item.reader.result,
          type   = item.type;
    if( !buffer ) { return; }

    item.data = {};
    switch ( type ) {
      case 'json':
        item.data = JSON.parse( buffer );
        break;
      case 'nii':
        item.data._originalData_ = new NiftiImage( buffer );
        break;
      case 'mgh':
        item.data._originalData_ = new MGHImage( buffer );
        break;
      case 'fsSurf':
        item.data._originalData_ = new FreeSurferMesh( buffer );
        break;
      case 'fsCurv':
        item.data._originalData_ = new FreeSurferNodeValues( buffer );
        break;
      default:
        // code
    }
    if( item.data ) {
      delete item.reader;
      delete item.promise;
    }
    return item.data;
  }
  _onLoad = ( evt, callback ) => {
    this.canvas.debugVerbose( `File ${evt.currentFile} (type: ${evt.currentType}) has been loaded. Parsing the blobs...` );

    if( this.useCache && !this.cache.check_item( evt.currentFile ) ) {
      this.cache.set_item( evt.currentFile, evt.target.result );
    }

    // this.canvas.needsUpdate = true;
    if( typeof callback === "function" ) {
      callback( evt.target.result );
    }
  }

}


export { CanvasFileLoader };
