import { Vector3, Matrix4, Matrix3, ArrowHelper } from 'three';

function raycast_volume_geneator(){

  const orig = new Vector3().copy(origin);
  const projection = new Matrix3();
  const p = new Vector3();
  const p1 = new Vector3();
  const dest = new Vector3();
  let mx, my, mz, i, j, k, tmp, k1, k2, l_res;
  const res = [NaN, NaN, NaN, NaN, NaN, NaN, NaN];

  const raycast_volume = (
    origin, direction, volumeModelShape,
    map_array, delta = 0.5, snap_raycaster = true, colorChannels = 4 ) => {

    mx = volumeModelShape.x;
    my = volumeModelShape.y;
    mz = volumeModelShape.z;

    direction.normalize();

    // vOrigin = (position - vec3(0.5, 0.5, 0.5)) * scale_inv - vDirection;
    orig.x = origin.x + mx / 2;
    orig.y = origin.y + my / 2;
    orig.z = origin.z + mz / 2;
    projection.set(
      1-direction.x * direction.x,
      -direction.x * direction.y,
      -direction.x * direction.z,

       -direction.y * direction.x,
       1-direction.y * direction.y,
       -direction.y * direction.z,

       -direction.z * direction.x,
       -direction.z * direction.y,
       1-direction.z * direction.z
    );
    const a13 = projection.elements[2],
          a23 = projection.elements[5],
          a33 = projection.elements[8];
    let i, j, k1, k2, tmp, k, dist = Infinity;

    for(i = 0; i < 7; i++){
      res[i] = NaN;
    }

    for( i = 0; i < mx; i++ ){
      for( j = 0; j < my; j++ ){
        // p.set( (i+0.5) * f.x - orig.x, (j+0.5) * f.y - orig.y , 0.5 * f.z );
        p.set( (i+0.5) - orig.x, (j+0.5) - orig.y , 0.5 );
        p1.copy( p );
        p.applyMatrix3( projection );
        p.set(
          p.x*p.x + p.y*p.y + p.z*p.z - delta,
          p.x*a13 + p.y*a23 + p.z*a33,
          a13*a13 + a23*a23 + a33*a33
        );
        p1.z = -p.y / p.z;
        tmp = p1.applyMatrix3( projection ).length();
        // check if it's truly close
        if( tmp < delta ){

          tmp = Math.sqrt( p.y * p.y - p.x * p.z ) / p.z;

          if( !isNaN(tmp) ){

            k1 = Math.ceil((-p.y / p.z - tmp) + orig.z);
            k2 = Math.floor((-p.y / p.z + tmp) + orig.z);

            if( k1 < 0 ){ k1 = 0; }
            if( k2 >= mz ){ k2 = mz - 1 ; }

            for( k = k1; k <= k2; k++ ){
              // tmp = map_array[(
              //   i + j * mx + k * mx * my
              // ) * 4 + 3 ];
              tmp = map_array[(
                i + j * mx + k * mx * my
              ) * colorChannels + (colorChannels - 1) ];

              if( tmp > 0 ){
                p.set(
                  (i+0.5) - orig.x,
                  (j+0.5) - orig.y,
                  (k+0.5) - orig.z
                );
                tmp = p.dot( direction );
                if( tmp < dist ){
                  res[0] = i;
                  res[1] = j;
                  res[2] = k;

                  // voxel coordinate
                  dest.set(
                    (i+0.5) - mx / 2,
                    (j+0.5) - my / 2,
                    (k+0.5) - mz / 2
                  );

                  if( snap_raycaster ){
                    l_res = dest.sub( origin ).dot( direction );
                    dest.copy( direction ).multiplyScalar( l_res ).add( origin );
                  }

                  res[3] = dest.x;
                  res[4] = dest.y;
                  res[5] = dest.z;
                  res[6] = tmp;
                  dist = tmp;
                }
              }
            }
          }
        }

      }
    }

    return( res );
  };

  return( raycast_volume );
};

const raycast_volume = raycast_volume_geneator();

function electrode_from_ct_generator(){

  const origin = new Vector3(),
        direction = new Vector3(),
        pos = new Vector3();
  const matrix_ = new Matrix4(),
        matrix_inv = new Matrix4(),
        matrix_rot = new Matrix3();

  let colorChannels = 4;

  const intersect_volume = ( src, dir, inst, canvas, delta = 1, snap_raycaster = true ) => {
    if( !inst || !inst.isDataCube2 ){ return; }

    // 1 or 4
    colorChannels = inst.nColorChannels;

    matrix_.copy(inst.object.matrixWorld);
    matrix_inv.copy(matrix_).invert();
    origin.copy(src).applyMatrix4(matrix_inv);

    // direction no need to shift
    matrix_rot.setFromMatrix4(matrix_inv);
    direction.copy(dir).applyMatrix3(matrix_rot);

    /*if(!canvas.__localization_helper){
      canvas.__localization_helper = new ArrowHelper(new Vector3( 0, 0, 1 ), new Vector3( 0, 0, 0 ), 50, 0xff0000, 2 );
      canvas.scene.add( canvas.__localization_helper );
    }
    canvas.__localization_helper.position.copy(origin);
    canvas.__localization_helper.setDirection(dir);
    */

    const res = raycast_volume(
      origin, direction, inst.modelShape,
      inst.voxelColor,
      delta, snap_raycaster, colorChannels
    );
    pos.x = res[3];
    pos.y = res[4];
    pos.z = res[5];

    pos.applyMatrix4( matrix_ );

    return ( pos );
  };

  return( intersect_volume );

}


const intersect_volume = electrode_from_ct_generator();


const electrode_from_ct = ( inst, canvas ) => {
  // const inst = this.current_voxel_type();
  if( !inst || !inst.isDataCube2 ){ return; }

  return (
    intersect_volume(
      canvas.mouseRaycaster.ray.origin,
      canvas.mouseRaycaster.ray.direction,
      inst, canvas
    )
  );
};

export { raycast_volume, intersect_volume, electrode_from_ct };

