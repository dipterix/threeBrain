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
