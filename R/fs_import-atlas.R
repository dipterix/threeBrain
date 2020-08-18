#' @export
import_fs.atlas_volume <- function(subject_name, fs_path, quiet = FALSE, dtype,
                                   sub_type = c('aparc+aseg', 'aparc.a2009s+aseg', 'aparc.DKTatlas+aseg', 'aseg'), hemisphere, ...){
  fs_path <- normalizePath(fs_path)
  sub_type <- match.arg(sub_type)
  fname <- sprintf('%s.mgz', sub_type)
  src <- file.path(fs_path, 'mri', fname)
  sub_type <- stringr::str_replace_all(sub_type, '[^\\w]', '_')
  if( ! file.exists(src) ) {
    if(!quiet){
      cat2(sprintf("  * mri/%s is missing\n", fname), level = 'WARNING')
    }
    return( FALSE )
  }
  src <- normalizePath(src)
  tname <- sprintf('%s_%s.json', subject_name, sub_type)
  target <-file.path(fs_path, 'RAVE', tname)
  dige <- paste0(target, '.digest')

  cached <- validate_digest(src, target)
  if(!isFALSE(cached)){
    return( TRUE )
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
    fs_atlas_files = tname,
    .append = TRUE
  )
  add_to_digest_file(
    file.path(fs_path, 'RAVE', 'common.digest'),
    THREEBRAIN_DATA_VER = THREEBRAIN_DATA_VER,
    .append = FALSE
  )
  return( TRUE )
}


# import_fs('YCQ', fs_path = '~/rave_data/others/fs/', dtype = 'atlas_volume', sub_type = 'aparc+aseg')
# import_fs('YCQ', fs_path = '~/rave_data/others/fs/', dtype = 'atlas_volume', sub_type = 'aparc.a2009s+aseg')
# import_fs('YCQ', fs_path = '~/rave_data/others/fs/', dtype = 'atlas_volume', sub_type = 'aparc.DKTatlas+aseg')
