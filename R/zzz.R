loaders <- new.env(parent = emptyenv())

DISABLE_PYTHON <- TRUE

load_nibabel <- function(force_reload = FALSE){

  # this function is depricated
  return(NULL)
  # if( DISABLE_PYTHON ){
  #   return(NULL)
  # }
  #
  # if( !force_reload && isTRUE(loaders$tried_nibabel) ){
  #   return(loaders$nibabel)
  # }
  # loaders$tried_nibabel = TRUE
  # try({
  #   stopifnot2(reticulate::py_module_available('nibabel'), msg = 'nibabel not available')
  #   loaders$nibabel = reticulate::import('nibabel')
  # }, silent = TRUE)
  # return(loaders$nibabel)
}


#' Function to load `FreeSurfer` `mgz/mgh` file
#'
#' The function `read_mgz` is a dynamic wrapper of Python `nibabel` loader.
#' If no Python is detected, it will switch to built-in function `read_fs_mgh_mgz`,
#' which has limited features.
#'
#' @format An \R function acting as safe wrapper for \code{nibabel.load}.
#'
#' @usage read_mgz(path)
#' @param path `mgz/mgh` file path
#'
#' @export
read_mgz <- function(path){
  path <- normalizePath(path, mustWork = FALSE)

  if(FALSE){
    res <- read_fs_mgh_mgz(path)
    return(list(
      header = res$header,
      get_shape = res$get_shape,
      get_data = res$get_data
    ))
  }
  # Use freesurferformats instead
  res <- freesurferformats::read.fs.mgh(path, with_header = TRUE,
                                        flatten = FALSE, drop_empty_dims = FALSE)
  res$get_data <- function(){
    dm <- dim(res$data)
    if(dm[[4]] == 1){
      drop(res$data)
    } else {
      res$data
    }
  }
  res$get_shape <- function(){
    dm <- dim(res$data)
    if(dm[[4]] == 1){
      dm <- dm[-4]
    }
    dm
  }
  default_mat <- matrix(c(-1,0,0,128, 0,0,1,-128, 0,-1,0,128, 0,0,0,1), byrow = TRUE, nrow = 4)
  res$header$get_vox2ras <- function(){
    if(res$header$ras_good_flag == 1){
      res$header$internal$M
    } else {
      default_mat
    }
  }
  res$header$get_vox2ras_tkr <- function(){
    if(res$header$ras_good_flag == 1){
      Mdc <- res$header$internal$Mdc
      Pcrs_c <- res$header$internal$Pcrs_c
      rbind(cbind(Mdc, - Mdc %*% Pcrs_c), c(0,0,0,1))
    } else {
      default_mat
    }
  }
  res
}


read_nifti <- function(path){
  dat <- oro.nifti::readNIfTI(path, reorient = FALSE)
  vox2ras <- oro.nifti::qform(dat)
  vox2ras_tkr <- cbind(vox2ras[,-4], cbind(-vox2ras[,-4], c(0,0,0,1)) %*% c(128,128,128,1))
  dat <- dat@.Data
  if(length(dim(dat)) == 4 && dim(dat)[[4]] == 1){
    dat <- dat[,,,1, drop = TRUE]
  }
  list(
    data = dat,
    header = list(
      get_vox2ras = function(){ vox2ras },
      get_vox2ras_tkr = function(){ vox2ras_tkr }
    ),
    get_shape = function(){ dim(dat) },
    get_data = function(){ dat }
  )
}

#' Function to load surface data from `Gifti` files
#'
#' The function `read_gii2` is a dynamic wrapper of Python `nibabel` loader.
#' If no Python is detected, it will switch to `gifti::readgii`.
#'
#' @format An \R function acting as safe wrapper for \code{nibabel.load}.
#'
#' @usage read_gii2(path)
#' @param path `Gifti` file path
#'
#' @export
read_gii2 <- function(path){
  path <- normalizePath(path, mustWork = FALSE)

  nibabel <- load_nibabel()
  if( !is.null(nibabel) ){
    tmp <- nibabel$load(path)
    vertices <- tmp$darrays[[1]]$data[,1:3]
    faces <- tmp$darrays[[2]]$data[,1:3]
    surf <- list(
      header = c(nrow(vertices), nrow(faces)),
      vertices = vertices,
      faces = faces
    )
  }else{
    tmp <- gifti::readgii(path)
    vertices <- tmp$data$pointset[,1:3]
    faces <- tmp$data$triangle[,1:3]
    surf <- list(
      header = c(nrow(vertices), nrow(faces)),
      vertices = vertices,
      faces = faces
    )
  }
  surf
}


read_nii2 <- function(path, head_only = FALSE, verbose = FALSE,
                      reorient = FALSE, rescale_data = FALSE, ...)
{
  path <- normalizePath(path, mustWork = FALSE)

  nii <- oro.nifti::readNIfTI(path, verbose = reorient, reorient = reorient,
                              read_data = !head_only, rescale_data = rescale_data, ...)

  get_range <- function(){
    c(nii@cal_min, nii@cal_max)
  }
  get_shape <- function(){
    oro.nifti::dim_(nii)[2:4]
  }
  get_size <- function(){
    dm <- oro.nifti::dim_(nii)[2:4]
    vox_size <- oro.nifti::voxdim(nii)
    dm * vox_size
  }

  get_qform <- function(){
    return(oro.nifti::qform(nii))
  }

  get_voxel_size <- function(){ oro.nifti::voxdim(nii) }

  get_boundary <- function(){
    qform <- oro.nifti::qform(nii)
    ct_crs_orig <- -abs(qform[1:3, 4])
    dm <- oro.nifti::dim_(nii)[2:4]
    vox_size <- oro.nifti::voxdim(nii)
    re <- cbind(
      ct_crs_orig,
      (dm - 1) * vox_size + ct_crs_orig
    )
    colnames(re) <- c("lower", "upper")
    re
  }

  # IJK to
  get_IJK_to_RAS <- function() {
    sform_code <- c(nii@sform_code, 0)[[1]]
    qform_code <- c(nii@qform_code, 0)[[1]]

    # https://github.com/dipterix/threeBrain/issues/15
    if(sform_code == 0 && qform_code == 0) {
      mat <- diag(c(nii@pixdim[seq(2,4)], 1))
      return(list(
        matrix = mat,
        code = 0,
        space = "Unknown"
      ))
    }
    use_sform <- TRUE
    prefered_code <- c(1, 4, 2, 5, 3, 0)

    if(which(prefered_code == sform_code) >
       which(prefered_code == qform_code)) {
      use_sform <- FALSE
    }

    if( use_sform ) {
      # method 3
      mat <- rbind(
        nii@srow_x,
        nii@srow_y,
        nii@srow_z,
        c(0,0,0,1)
      )
      code <- sform_code
    } else {
      # method 2
      mat <- diag(c(nii@pixdim[seq(2,4)], 1))
      mat[3, ] <- mat[3, ] * nii@pixdim[[1]]
      mat[1, 4] <- nii@qoffset_x
      mat[2, 4] <- nii@qoffset_y
      mat[3, 4] <- nii@qoffset_z
      code <- qform_code
    }

    return(list(
      matrix = mat,
      code = code,
      space = switch(
        as.character(code),
        `1` = "Scanner RAS",
        `2` = "Aligned to anatomy/external file",
        `3` = "Talairach template",
        `4` = "MNI152 template",
        `5` = "Other Template",
        "Unknown"
      )
    ))
  }

  get_IJK_to_tkrRAS <- function(brain) {
    ijk2ras <- get_IJK_to_RAS()
    if(ijk2ras$code %in% c(0, 2, 3, 5)) {
      warning("The NifTi file contains a transform matrix, projecting IJK indices to a XYZ space that is not supported: [", ijk2ras$space, "]. The rendering result might be improper.")
    }
    mat <- ijk2ras$matrix
    switch (
      as.character(ijk2ras$code),
      `0` = {
        # as is, but add transform
        mat[1:3, 4] <- - get_size() / 2
      },
      `1` = {
        # scanner RAS
        mat <- brain$Torig %*% solve(brain$Norig) %*% mat
      },
      `4` = {
        # MNI-152, MNI305RAS = TalXFM*Norig*inv(Torig)*[tkrR tkrA tkrS 1]'
        mat <- brain$Torig %*% solve(brain$Norig) %*% solve(brain$xfm) %*% mat
      }
    )
    mat
  }

  structure(
    list(
      header = nii,
      get_range = get_range,
      get_shape = get_shape,
      get_data = function(){ nii@.Data },
      # Torig
      get_qform = get_qform,
      get_voxel_size = get_voxel_size,
      get_size = get_size,
      get_boundary = get_boundary,
      get_IJK_to_RAS = get_IJK_to_RAS,
      get_IJK_to_tkrRAS = get_IJK_to_tkrRAS
    ),
    class = c("threeBrain.nii", "list")
  )

}


