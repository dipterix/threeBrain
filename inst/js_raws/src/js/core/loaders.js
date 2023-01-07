import nifti from 'nifti-reader-js';
import { Matrix4 } from 'three';

class NiftiImage {
  constructor ( data ) {
    // parse nifti
    if (nifti.isCompressed(data)) {
        data = nifti.decompress(data);
    }

    this.header = nifti.readHeader(data);
    const niftiImage = nifti.readImage(this.header, data);
    if (this.header.datatypeCode === nifti.NIFTI1.TYPE_INT8) {
      this.image = new Int8Array(niftiImage);
      this.dataIsInt8 = true;
    } else if (this.header.datatypeCode === nifti.NIFTI1.TYPE_INT16) {
      this.image = new Int16Array(niftiImage);
      this.dataIsInt16 = true;
    } else if (this.header.datatypeCode === nifti.NIFTI1.TYPE_INT32) {
      this.image = new Int32Array(niftiImage);
      this.dataIsInt32 = true;
    } else if (this.header.datatypeCode === nifti.NIFTI1.TYPE_FLOAT32) {
      this.image = new Float32Array(niftiImage);
      this.dataIsFloat32 = true;
    } else if (this.header.datatypeCode === nifti.NIFTI1.TYPE_FLOAT64) {
      this.image = new Float64Array(niftiImage);
      this.dataIsFloat64 = true;
    } else if (this.header.datatypeCode === nifti.NIFTI1.TYPE_UINT8) {
      this.image = new Uint8Array(niftiImage);
      this.dataIsUInt8 = true;
    } else if (this.header.datatypeCode === nifti.NIFTI1.TYPE_UINT16) {
      this.image = new Uint16Array(niftiImage);
      this.dataIsUInt16 = true;
    } else if (this.header.datatypeCode === nifti.NIFTI1.TYPE_UINT32) {
      this.image = new Uint32Array(niftiImage);
      this.dataIsUInt32 = true;
    } else {
      console.warn("NiftiImage: Cannot load NIFTI image data: the data type code is unsupported.")
      this.image = undefined;
    }

    this.isNiftiImage = true;

    // IJK to RAS
    this.affine = new Matrix4().set(
      this.header.affine[0][0],
      this.header.affine[0][1],
      this.header.affine[0][2],
      this.header.affine[0][3],
      this.header.affine[1][0],
      this.header.affine[1][1],
      this.header.affine[1][2],
      this.header.affine[1][3],
      this.header.affine[2][0],
      this.header.affine[2][1],
      this.header.affine[2][2],
      this.header.affine[2][3],
      this.header.affine[3][0],
      this.header.affine[3][1],
      this.header.affine[3][2],
      this.header.affine[3][3]
    );
    this.shape = [
      this.header.dims[1],
      this.header.dims[2],
      this.header.dims[3]
    ];

    // threeBrain uses the volume center as origin, hence the transform
    // is shifted
    const shift = new Matrix4().set(
      1, 0, 0, this.shape[0] / 2,
      0, 1, 0, this.shape[1] / 2,
      0, 0, 1, this.shape[2] / 2,
      0, 0, 0, 1
    );

    // IJK to scanner RAS (of the image)
    this.model2RAS = this.affine.clone().multiply( shift );

  }

}

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
    if( urlLowerCase.endsWith("nii") || urlLowerCase.endsWith("gz") ) {
      return this.readNIFTI( url );
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
    console.debug( 'Loading start!');
  }
  _onLoad( evt, callback ) {
    console.debug( `File ${evt.currentFile} (type: ${evt.currentType}) has been loaded. Parsing the blobs...` );

    let v;
    switch (evt.currentType) {
      case 'json':
        v = JSON.parse( evt.target.result );
        break;
      case 'nii':
        v = {
          "nifti_data" : new NiftiImage( evt.target.result )
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
