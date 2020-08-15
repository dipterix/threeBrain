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
  sub_type = NULL){
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

#' @export
import_fs.atlas_volume <- function(subject_name, fs_path, quiet = FALSE,
                                   sub_type = c('aparc+aseg', 'aparc.a2009s+aseg'), ...){
  fs_path <- normalizePath(fs_path)
  sub_type <- match.arg(sub_type)
  fname <- sprintf('%s.mgz', sub_type)
  src <- file.path(fs_path, 'mri', fname)
  sub_type <- stringr::str_replace_all(sub_type, '[^\\w]', '_')
  if( ! file.exists(src) ) {
    if(!quiet){
      cat2(sprintf("  * mri/%s.mgz is missing\n", fname), level = 'WARNING')
    }
    return()
  }
  src <- normalizePath(src)
  tname <- sprintf('%s_%s.json', subject_name, sub_type)
  target <-file.path(fs_path, 'RAVE', tname)
  dige <- paste0(target, '.digest')

  cached <- validate_digest(src, target)
  if(!isFALSE(cached)){
    return()
  }

  # Load file
  dat <- read_mgz(src)
  Norig <- dat$header$get_vox2ras()
  Torig <- dat$header$get_vox2ras_tkr()
  volume_shape <- as.integer(dat$get_shape())

  group_volume <- GeomGroup$new(name = sprintf('Atlas - %s (%s)', sub_type, subject_name))
  group_volume$subject_code <- subject_name

  volume <- dat$get_data()
  volume <- reorient_volume( volume, Norig )

  # Create a datacube geom to force cache
  unlink(target)
  DataCubeGeom2$new(
    name = sprintf('Atlas - %s (%s)', sub_type, subject_name), value = volume, dim = volume_shape,
    half_size = volume_shape / 2, group = group_volume, position = c(0,0,0),
    cache_file = target)

  rm(volume)
  rm(dat)

  # Add file_digest, Norig, Torig to cache_digest
  add_to_digest_file(
    dige,
    file_digest = attr(cached, 'digest'),
    Norig = Norig,
    Torig = Torig,
    source_name = fname,
    shape = volume_shape,
    THREEBRAIN_DATA_VER = THREEBRAIN_DATA_VER,
    .append = FALSE
  )
  add_to_digest_file(
    file.path(fs_path, 'RAVE', 'common.digest'),
    fs_atlas_files = dige,
    .append = TRUE
  )
  return()
}

# import_fs('YCQ', fs_path = '~/rave_data/others/fs/', dtype = 'atlas_volume', sub_type = 'aparc+aseg')
