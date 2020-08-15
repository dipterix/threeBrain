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


read_nii2 <- function(path, head_only = FALSE ){
  path <- normalizePath(path, mustWork = FALSE)

  nibabel <- load_nibabel()
  if( !is.null(nibabel) ){
    tmp <- nibabel$load( path )

    re <- list(
      header = tmp$header,
      get_shape = tmp$get_shape,
      get_data = tmp$get_data
    )

  }else{
    nii <- oro.nifti::readNIfTI(path, verbose = FALSE, reorient = FALSE, read_data = !head_only)

    re <- list(
      header = nii,
      get_shape = function(){ as.list(dim(nii@.Data)) },
      get_data = function(){ nii@.Data }
    )
  }

  return(re)
}









#
#
# .onLoad <- function(libname, pkgname){
#   # reticulate:::.onLoad
#   # function (libname, pkgname)
#   # {
#   #   main <- NULL
#   #   makeActiveBinding("py", env = asNamespace(pkgname), function() {
#   #     if (!is.null(main))
#   #       return(main)
#   #     if (is_python_initialized())
#   #       main <<- import_main(convert = TRUE)
#   #     main
#   #   })
#   # }
#
#   mgz_loader <- NULL
#   pkg_env = asNamespace(pkgname)
#
#   makeActiveBinding('read_mgz', env = pkg_env, function(){
#     if( !is.null(mgz_loader) && is.function(mgz_loader) ){
#       return(mgz_loader)
#     }
#
#     .mgz_loader <- tryCatch({
#       nibabel = load_nibabel()
#       nibabel$load
#     }, error = function(e){
#       read_fs_mgh_mgz
#     })
#
#     mgz_loader <<- function(path){
#       path = normalizePath(path, mustWork = FALSE)
#       cat2('Loading from: ', path)
#       res = .mgz_loader(path)
#       return(list(
#         header = res$header,
#         get_shape = res$get_shape,
#         get_data = res$get_data
#       ))
#     }
#   })
#
#
# }
