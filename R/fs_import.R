# function naming convention: import_fs|suma_dtype_name

THREEBRAIN_DATA_VER <- 0

# Check cache
validate_digest <- function(src, target){
  if(!file.exists(src)){
    return(NA)
  }
  has_cache <- FALSE
  file_digest <- digest_file(src)
  dige <- paste0(target, '.digest')
  if( file.exists(target) && file.exists(dige) ){
    # Check digest
    file_digest_compare <- get_digest_header(dige, 'file_digest', '')
    threebrain_data_ver_compare <- get_digest_header(dige, 'THREEBRAIN_DATA_VER', -1)
    if( file_digest == file_digest_compare && THREEBRAIN_DATA_VER <= threebrain_data_ver_compare ){
      has_cache <- TRUE
    }
  }
  structure(has_cache, digest = file_digest)
}

#' Import 'FreeSurfer' or 'SUMA' files into the viewer structure
#' @description Import 'T1-MRI', surface files, curvature/'sulcus', atlas, and
#' 'Talairach' transform matrix into 'json' format. These functions are not
#' intended to be called directly, use \code{\link{import_from_freesurfer}}
#' instead.
#' @param subject_name character, subject code
#' @param fs_path path to 'FreeSurfer' folder
#' @param dtype data type to import, choices are \code{'T1'}, \code{'surface'},
#' \code{'curv'}, \code{'atlas_volume'}, \code{'atlas_surface'}, \code{'xform'}
#' @param sub_type detailed files to import. \code{'atlas_surface'}
#' is not supported for now
#' @param hemisphere which hemisphere to import, ignored when \code{dtype} is in
#' \code{'T1'}, \code{'atlas_volume'}, \code{'atlas_surface'}, \code{'xform'}.
#' @param quiet,... passed from or to other methods.
#' @return logical, \code{TRUE} if the file is or has been cached, or
#' \code{FALSE} if the file is missing.
#' @name import-fs-suma
NULL

#' @rdname import-fs-suma
#' @export
import_fs <- function(
  subject_name, fs_path, quiet = FALSE,
  dtype = c('T1', 'surface', 'curv', 'atlas_volume', 'atlas_surface', 'xform'),
  sub_type = NULL, hemisphere = c('l', 'r'), ...){
  dtype <- match.arg(dtype)

  # Make sure at least folder structure exists

  mri_path <- file.path(fs_path, c('mri', 'RAVE', 'surf', 'label', 'mri/transforms'))
  for(p in mri_path){
    if( !dir.exists(p) ){
      dir_create(p)
    }
  }
  UseMethod('import_fs', structure(subject_name, class = dtype))
}


#' @rdname import-fs-suma
#' @export
import_suma <- function(
  subject_name, fs_path, quiet = FALSE,
  dtype = c('T1', 'surface', 'curv', 'atlas_volume', 'atlas_surface', 'xform'),
  sub_type = NULL, hemisphere = c('l', 'r'), ...){
  dtype <- match.arg(dtype)

  # Make sure at least folder structure exists

  mri_path <- file.path(fs_path, c('RAVE', 'SUMA'))
  for(p in mri_path){
    if( !dir.exists(p) ){
      dir_create(p)
    }
  }
  UseMethod('import_suma', structure(subject_name, class = dtype))
}




