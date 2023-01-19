import nifti from 'nifti-reader-js';
import {
  Vector3, Vector4, Matrix4, ByteType, ShortType, IntType,
  FloatType, UnsignedByteType, UnsignedShortType,
} from 'three';

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
      this.imageDataType = ByteType;
      this.dataIsInt8 = true;
    } else if (this.header.datatypeCode === nifti.NIFTI1.TYPE_INT16) {
      this.image = new Int16Array(niftiImage);
      this.imageDataType = ShortType;
      this.dataIsInt16 = true;
    } else if (this.header.datatypeCode === nifti.NIFTI1.TYPE_INT32) {
      this.image = new Int32Array(niftiImage);
      this.imageDataType = IntType;
      this.dataIsInt32 = true;
    } else if (this.header.datatypeCode === nifti.NIFTI1.TYPE_FLOAT32) {
      this.image = new Float32Array(niftiImage);
      this.imageDataType = FloatType;
      this.dataIsFloat32 = true;
    } else if (this.header.datatypeCode === nifti.NIFTI1.TYPE_FLOAT64) {
      // we do not support this, need to make transform later
      this.image = new Float64Array(niftiImage);
      this.dataIsFloat64 = true;
    } else if (this.header.datatypeCode === nifti.NIFTI1.TYPE_UINT8) {
      this.image = new Uint8Array(niftiImage);
      this.imageDataType = UnsignedByteType;
      this.dataIsUInt8 = true;
    } else if (this.header.datatypeCode === nifti.NIFTI1.TYPE_UINT16) {
      this.image = new Uint16Array(niftiImage);
      this.imageDataType = UnsignedShortType;
      this.dataIsUInt16 = true;
    } else if (this.header.datatypeCode === nifti.NIFTI1.TYPE_UINT32) {
      this.image = new Uint32Array(niftiImage);
      this.imageDataType = UnsignedIntType;
      this.dataIsUInt32 = true;
    } else {
      console.warn("NiftiImage: Cannot load NIFTI image data: the data type code is unsupported.")
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
    this.shape = new Vector3(
      this.header.dims[1],
      this.header.dims[2],
      this.header.dims[3]
    );

    // threeBrain uses the volume center as origin, hence the transform
    // is shifted
    const crsOrder = new Vector4( 1, 1, 1, 0 ).applyMatrix4( this.affine );
    const shift = new Matrix4().set(
      1, 0, 0, (this.shape.x - 1) / 2,
      0, 1, 0, (this.shape.y - 1) / 2 ,
      0, 0, 1, (this.shape.z - 1) / 2,
      0, 0, 0, 1
    );

    this.ijkIndexOrder = new Vector3().copy( crsOrder );

    // IJK to scanner RAS (of the image)
    this.model2RAS = this.affine.clone().multiply( shift );

  }

  dispose () {
    this.header = NaN;
    this.image = NaN;
    this.affine = NaN;
    this.shape = NaN
    this.ijkIndexOrder = NaN;
    this.model2RAS = NaN
  }

}

export { NiftiImage }
