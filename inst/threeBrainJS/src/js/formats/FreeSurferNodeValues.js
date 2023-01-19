import { BufferAttribute } from 'three';
import { min2, sub2 } from '../utils.js';

class FreeSurferNodeValues {

  constructor( data ) {
    const raw = data;

    let reader = new DataView( data );
    let sig0 = reader.getUint8(0);
    let sig1 = reader.getUint8(1);
    let sig2 = reader.getUint8(2);

    if (sig0 !== 255 || sig1 !== 255 || sig2 !== 255) {
      console.warn(
        "FreeSurferNodeValues: this is not a FreeSurfer curv/sulc format."
      );
    }

    this.nVertices = reader.getUint32(3, false);
    this.nFrames = reader.getUint32(11, false);

    this.vertexData = new Float32Array(this.nFrames * this.nVertices);
    this._frameData = new Float32Array(this.nVertices);

    let offset = 15, buf;
    let min = Infinity, max = -Infinity;
    for (let i = 0; i < this.nFrames * this.nVertices; i++, offset += 4) {
      buf = reader.getFloat32( offset, false );
      if( min > buf ) { min = buf; }
      if( max < buf ) { max = buf; }
      this.vertexData[i] = buf;
    }

    this.max = max;
    this.min = min;

    this.isFreeSurferNodeValues = true;

    if( this.nFrames > 0 ) {
      this.setFrame( 0 );
    }

  }

  setFrame( frame ) {
    frame = parseInt( frame );
    if( isNaN(frame) || frame < 0 || frame >= this.nFrames ) {
      throw 'FreeSurferNodeValues: Invalid frame';
    }
    const offset = frame * this.nVertices;
    for(let i = 0 ; i < this.nVertices; i++ ) {
      this._frameData[ i ] = this.vertexData[ offset + i ];
    }
    return this._frameData
  }

  dispose() {
    this.vertexData = NaN;
    this._frameData = NaN;
  }

}


export { FreeSurferNodeValues }

