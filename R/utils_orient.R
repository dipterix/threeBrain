#' Function to reshape data to `RAS` order
#' @param volume, 3-mode tensor (voxels), usually from `mgz`, `nii`, or `BRIK` files
#' @param Torig a \code{4x4} transform matrix mapping volume (`CRS`) to `RAS`
#' @return Reshaped tensor with dimensions corresponding to `R`, `A`, and `S`
reorient_volume <- function( volume, Torig ){
  # volume = fill_blanks(brain_finalsurf$get_data(), niter=2)

  # Re-order the data according to Torig, map voxels to RAS coord - anatomical
  order_index <- round((Torig %*% c(1,2,3,0))[1:3])
  volume <- aperm(volume, abs(order_index))
  sub <- sprintf(c('%d:1', '1:%d')[(sign(order_index) + 3) / 2], dim(volume))
  volume <- eval(parse(text = sprintf('volume[%s]', paste(sub, collapse = ','))))

  volume
}

#' @title Calculate cross-product of two vectors in '3D'
#' @param x,y 3-dimensional vectors
#' @returns A '3D' vector that is the cross-product of \code{x} and \code{y}
#' @export
cross_prod <- function(x, y) {
  x <- x[seq_len(3)]
  y <- y[seq_len(3)]
  return(c(
    x[2] * y[3] - x[3] * y[2],
    x[3] * y[1] - x[1] * y[3],
    x[1] * y[2] - x[2] * y[1]
  ))
}

#' Calculate rotation matrix from non-zero vectors
#' @param vec_from original vector, length of 3
#' @param vec_to vector after rotation, length of 3
#' @returns A four-by-four transform matrix
#' @export
calculate_rotation <- function(vec_from, vec_to) {
  len1 <- sqrt(sum(vec_from^2))
  len2 <- sqrt(sum(vec_to^2))
  if( len1 == 0 ) {
    stop("`calculate_rotation`: length of `vec_from` must not be zero")
  }
  if( len2 == 0 ) {
    stop("`calculate_rotation`: length of `vec_to` must not be zero")
  }
  vec1 <- vec_from / len1
  vec2 <- vec_to / len2
  r <- sum(vec1 * vec2) + 1
  if( r < 1e-6 ) {
    r <- 0
    if( abs(vec_from[1]) > vec_from[3] ) {
      quat <- c( -vec1[2], vec1[1], 0, r)
    } else {
      quat <- c(0, -vec1[3], vec1[2], r)
    }
  } else {
    # crossVectors( vFrom, vTo ); // inlined to avoid cyclic dependency on Vector3
    quat <- c(
      vec1[2] * vec2[3] - vec1[3] * vec2[2],
      vec1[3] * vec2[1] - vec1[1] * vec2[3],
      vec1[1] * vec2[2] - vec1[2] * vec2[1],
      r
    )
  }
  l <- sqrt(sum(quat^2))
  if( l == 0 ) {
    quat <- c(0, 0, 0, 1)
  } else {
    quat <- quat / l
  }
  qx <- quat[1]
  qy <- quat[2]
  qz <- quat[3]
  qw <- quat[4]

  # first column
  cbind(
    c(
      qw * qw + qx * qx - qz * qz + qy * qy,
      qz * qw - qx * qy + qy * qx + qw * qz,
      -qy * qw + qx * qz - qw * qy + qz * qx,
      0
    ),
    c(
      - qz * qw + qy * qx - qw * qz + qx * qy,
      qw * qw + qy * qy - qx * qx - qz * qz,
      qx * qw + qy * qz + qz * qy + qw * qx,
      0
    ),
    c(
      qy * qw + qz * qx + qx * qz + qw * qy,
      - qx * qw + qz * qy - qw * qx + qy * qz,
      qw * qw + qz * qz - qy * qy - qx * qx,
      0
    ),
    c(0, 0, 0, 1)
  )
}

