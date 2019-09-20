loaders = new.env(parent = emptyenv())

load_nibabel <- function(force_reload = FALSE){
  if( !force_reload && isTRUE(loaders$tried_nibabel) ){
    return(loaders$nibabel)
  }
  loaders$tried_nibabel = TRUE
  try({
    loaders$nibabel = reticulate::import('nibabel')
  }, silent = TRUE)
  return(loaders$nibabel)
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
  path = normalizePath(path, mustWork = FALSE)
  cat2('Loading from: ', path)

  nibabel = load_nibabel()

  if(!is.null(nibabel)){
    inner_mgz_loader = nibabel$load
  }else{
    inner_mgz_loader = read_fs_mgh_mgz
  }

  res = inner_mgz_loader(path)
  return(list(
    header = res$header,
    get_shape = res$get_shape,
    get_data = res$get_data
  ))
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
  path = normalizePath(path, mustWork = FALSE)

  nibabel = load_nibabel()
  if( !is.null(nibabel) ){
    tmp = nibabel$load(path)
    vertices = tmp$darrays[[1]]$data[,1:3]
    faces = tmp$darrays[[2]]$data[,1:3]
    surf = list(
      header = c(nrow(vertices), nrow(faces)),
      vertices = vertices,
      faces = faces
    )
  }else{
    tmp = gifti::readgii(path)
    vertices = tmp$data$pointset[,1:3]
    faces = tmp$data$triangle[,1:3]
    surf = list(
      header = c(nrow(vertices), nrow(faces)),
      vertices = vertices,
      faces = faces
    )
  }
  surf
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
