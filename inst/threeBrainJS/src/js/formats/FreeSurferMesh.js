import { BufferAttribute } from 'three';
import { min2, sub2 } from '../utils.js';

class FreeSurferMesh {
  position;
  index;

  constructor( data ) {
    const raw = data;

    let reader = new DataView( data );
    const sig0 = reader.getUint32(0, false);
    const sig1 = reader.getUint32(4, false);
    if (sig0 !== 4294966883 || sig1 !== 1919246708) {
      console.warn( "FreeSurferMesh: Cannot parse FreeSurfer surface data." );
    }

    let offset = 0;
    // marks 10 bytes for `nVertices` and `nFaces`
    while( reader.getUint8(offset) !== 10 ) { offset++; }
    this.nVertices = reader.getUint32(offset + 2, false);
    this.nFaces = reader.getUint32(offset + 6, false);
    offset += 10;

    // next is to read vertices in float32
    this.position = new Float32Array( this.nVertices * 3 );

    for( let ii = 0 ; ii < this.nVertices * 3 ; ii++, offset += 4) {
      this.position[ ii ] = reader.getFloat32( offset, false ); // bigEndian
    }
    // face indices
    this.index = new Uint32Array( this.nFaces * 3 );
    for( let ii = 0; ii < this.nFaces * 3 ; ii++, offset += 4) {
      this.index[ ii ] = reader.getUint32(offset, false);
    }
    const indexMin = min2(this.index, 0);
    if(indexMin !== 0) {
      sub2(this.index, indexMin);
    }

    this.isFreeSurferMesh = true;

  }

  dispose() {
    this.position = NaN;
    this.index = NaN;
  }

}


export { FreeSurferMesh }

