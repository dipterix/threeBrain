
const register_raycast_volume = (THREE) => {

  const orig = new THREE.Vector3().copy(origin);
  const projection = new THREE.Matrix3();
  const p = new THREE.Vector3();
  const p1 = new THREE.Vector3();
  const f = new THREE.Vector3();

  /*window.orig = orig;
  window.projection = projection;
  window.p = p;
  window.p1 = p1;
  window.f = f;*/

  THREE.raycast_volume = (
    origin, direction, margin_voxels, margin_lengths,
    map_array, delta = 2 ) => {
    // canvas.mouse_raycaster.ray.origin
    // canvas.mouse_raycaster.ray.direction

    orig.x = origin.x + ( margin_lengths.x - 1 ) / 2;
    orig.y = origin.y + ( margin_lengths.y - 1 ) / 2;
    orig.z = origin.z + ( margin_lengths.z - 1 ) / 2;
    f.x = margin_lengths.x / margin_voxels.x;
    f.y = margin_lengths.y / margin_voxels.y;
    f.z = margin_lengths.z / margin_voxels.z;
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
    const mx = margin_voxels.x,
          my = margin_voxels.y,
          mz = margin_voxels.z;


    const res = [NaN, NaN, NaN, NaN, NaN, NaN, NaN];

    for( let i = 0; i < margin_voxels.x; i++ ){
      for( let j = 0; j < margin_voxels.y; j++ ){
        p.set( i * f.x - orig.x, j * f.y - orig.y , 0 );
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

            k1 = Math.ceil(((-p.y / p.z - tmp) + orig.z) / f.z);
            k2 = Math.floor(((-p.y / p.z + tmp) + orig.z) / f.z);

            if( k1 < 0 ){ k1 = 0; }
            if( k2 >= mz ){ k2 = mz - 1 ; }

            for( k = k1; k <= k2; k++ ){
              tmp = map_array[(
                i + j * mx + k * mx * my
              ) * 4 + 3 ];
              if( tmp > 0 ){
                p.set(
                  i * f.x - orig.x,
                  j * f.y - orig.y,
                  k * f.z - orig.z
                );
                tmp = p.dot( direction );
                if( tmp < dist ){
                  res[0] = i;
                  res[1] = j;
                  res[2] = k;
                  res[3] = i * f.x - ( margin_lengths.x - 1 ) / 2;
                  res[4] = j * f.y - ( margin_lengths.y - 1 ) / 2;
                  res[5] = k * f.z - ( margin_lengths.z - 1 ) / 2;
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

  return( THREE );
};

export { register_raycast_volume };

