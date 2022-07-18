import { Vector3, Matrix4, Matrix3, ArrowHelper } from '../../build/three.module.js';

function raycast_volume_geneator(){

  const orig = new Vector3().copy(origin);
  const projection = new Matrix3();
  const p = new Vector3();
  const p1 = new Vector3();
  const f = new Vector3();
  const dest = new Vector3();
  let l_x, l_y, l_z, i, j, k, tmp, k1, k2, l_res;
  const res = [NaN, NaN, NaN, NaN, NaN, NaN, NaN];

  /*window.orig = orig;
  window.projection = projection;
  window.p = p;
  window.p1 = p1;
  window.f = f;*/

  const raycast_volume = (
    origin, direction, margin_voxels, margin_lengths,
    map_array, delta = 0.5, snap_raycaster = true ) => {
    // canvas.mouse_raycaster.ray.origin
    // canvas.mouse_raycaster.ray.direction

    l_x = margin_lengths.x;
    l_y = margin_lengths.y;
    l_z = margin_lengths.z;

    direction.normalize();

    f.x = margin_lengths.x / margin_voxels.x;
    f.y = margin_lengths.y / margin_voxels.y;
    f.z = margin_lengths.z / margin_voxels.z;

    // vOrigin = (position - vec3(0.5, 0.5, 0.5)) * scale_inv - vDirection;
    orig.x = origin.x + l_x / 2;
    orig.y = origin.y + l_y / 2;
    orig.z = origin.z + l_z / 2;
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


    for(i = 0; i < 7; i++){
      res[i] = NaN;
    }

    for( i = 0; i < margin_voxels.x; i++ ){
      for( j = 0; j < margin_voxels.y; j++ ){
        // p.set( (i+0.5) * f.x - orig.x, (j+0.5) * f.y - orig.y , 0.5 * f.z );
        p.set( (i+0.5) * f.x - orig.x, (j+0.5) * f.y - orig.y , 0.5 * f.z );
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
                  (i+0.5) * f.x - orig.x,
                  (j+0.5) * f.y - orig.y,
                  (k+0.5) * f.z - orig.z
                );
                tmp = p.dot( direction );
                if( tmp < dist ){
                  res[0] = i;
                  res[1] = j;
                  res[2] = k;

                  // voxel coordinate
                  dest.set(
                    (i+0.5) * f.x - l_x / 2,
                    (j+0.5) * f.y - l_y / 2,
                    (k+0.5) * f.z - l_z / 2
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

  const cube_dim = new Vector3(),
        cube_size = new Vector3(),
        origin = new Vector3(),
        direction = new Vector3(),
        pos = new Vector3();
  const matrix_ = new Matrix4(),
        matrix_inv = new Matrix4(),
        matrix_rot = new Matrix3();

  const intersect_volume = ( src, dir, inst, canvas, delta = 1, snap_raycaster = true ) => {
    if( !inst || !inst.isDataCube2 ){ return; }

    matrix_.copy(inst.object.parent.matrixWorld);
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

    cube_dim.fromArray( inst._cube_dim );
    cube_size.set(
      inst._margin_length.xLength,
      inst._margin_length.yLength,
      inst._margin_length.zLength
    );

    const res = raycast_volume(
      origin, direction, cube_dim, cube_size,
      inst._color_texture.image.data,
      delta, snap_raycaster
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
  canvas.set_raycaster();


  return (
    intersect_volume(
      canvas.mouse_raycaster.ray.origin,
      canvas.mouse_raycaster.ray.direction,
      inst, canvas
    )
  );
};

export { raycast_volume, intersect_volume, electrode_from_ct };

