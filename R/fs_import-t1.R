#' @export
import_fs.T1 <- function(subject_name, fs_path, quiet = FALSE, dtype,
                         sub_type = c("brain.finalsurfs", "brainmask", "brainmask.auto", "T1"), hemisphere, ...){
  sub_type <- match.arg(sub_type)
  fs_path <- normalizePath(fs_path)
  fname <- sprintf('%s.mgz', sub_type)
  src <- file.path(fs_path, 'mri', fname)
  if( ! file.exists(src) ) {
    if(!quiet){
      cat2(sprintf("  * mri/%s is missing\n", fname), level = 'WARNING')
    }
    return( FALSE )
  }
  src <- normalizePath(src)
  tname <- sprintf('%s_t1.json', subject_name)
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

  group_volume <- GeomGroup$new(name = sprintf('Volume - T1 (%s)', subject_name))
  group_volume$subject_code <- subject_name

  volume <- dat$get_data()
  volume <- reorient_volume( volume, Norig )

  # Create a datacube geom to force cache
  unlink(target)
  DataCubeGeom$new(
    name = sprintf('T1 (%s)', subject_name), value = volume, dim = volume_shape,
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
    fs_volume_files = tname,
    .append = TRUE
  )
  add_to_digest_file(
    file.path(fs_path, 'RAVE', 'common.digest'),
    THREEBRAIN_DATA_VER = THREEBRAIN_DATA_VER,
    .append = FALSE
  )

  return(TRUE)

}

# import_fs('YCQ', fs_path = '~/rave_data/others/fs/', dtype = 'T1', sub_type = 'brain.finalsurfs')
