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


#' @export
import_fs <- function(
  subject_name, fs_path, quiet = FALSE,
  dtype = c('volume', 'surface', 'curv', 'atlas_volume', 'atlas_surface'),
  sub_type = NULL, ...){
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




