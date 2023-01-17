import { NiftiImage } from '../formats/NIfTIImage.js';
import { MGHImage } from '../formats/MGHImage.js';
import { FreeSurferMesh } from '../formats/FreeSurferMesh.js';
import { FreeSurferNodeValues } from '../formats/FreeSurferNodeValues.js';


class CanvasFileLoader {

  constructor( canvas ) {
    this.canvas = canvas;
    this.cache = this.canvas.cache;
    this.use_cache = this.canvas.use_cache;
    this.loadingFiles = {};
  }

  read( url, itemName ) {
    const urlLowerCase = url.toLowerCase();
    let item = this.loadingFiles[ url ];

    if( item !== undefined ) {
      return item;
    }

    if( urlLowerCase.endsWith("nii") || urlLowerCase.endsWith("nii.gz") ) {
      item = this.readBinary( url, "nii", itemName );
    } else if ( urlLowerCase.endsWith("mgh") || urlLowerCase.endsWith("mgz") ) {
      item = this.readBinary( url, "mgh", itemName );
    } else if (
      urlLowerCase.endsWith("pial") || urlLowerCase.endsWith("pial.t1") ||
      urlLowerCase.endsWith("white") || urlLowerCase.endsWith("sphere") ||
      urlLowerCase.endsWith("smoothwm")
    ) {
      item = this.readBinary( url, "fsSurf", itemName );
    } else if (
      urlLowerCase.endsWith("sulc") || urlLowerCase.endsWith("curv")
    ) {
      item = this.readBinary( url, "fsCurv", itemName );
    } else {
      item = this.readJSON( url );
    }
    this.loadingFiles[ url ] = item;
    return item;
  }

  readBinary( url, type, itemName ) {
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
              e.currentItem = itemName;
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
    if( !item || item.data !== undefined ) {
      return ;
    }

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
    return item.data;
  }
  _onLoad = ( evt, callback ) => {
    this.canvas.debugVerbose( `File ${evt.currentFile} (type: ${evt.currentType}) has been loaded. Parsing the blobs...` );

    if( this.use_cache && !this.cache.check_item( evt.currentFile ) ) {
      this.cache.set_item( evt.currentFile, evt.target.result );
    }

    // this.canvas.needsUpdate = true;
    if( typeof callback === "function" ) {
      callback( evt.target.result );
    }
  }

}


export { CanvasFileLoader };
