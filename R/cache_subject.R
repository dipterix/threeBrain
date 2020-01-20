# Function to generate all the caches for 3D viewer.
# Handling caches and new data is a big headache, and this is really one-time
# operation. So why not?
NULL

#' Import from `FreeSurfer` and create `JSON` cache for 3D viewer
#' @param fs_path `FreeSurfer` subject directory
#' @param subject_name subject code
#' @export
#' @return None.
import_from_freesurfer <- function(fs_path, subject_name){
  # fs_path = '~/rave_data/others/three_brain/N27/'
  # subject_name = 'N27'
  surface_types = c('pial', 'white', 'smoothwm', 'pial-outer-smoothed', 'inflated', 'orig', 'sphere')
  curvatures = c('sulc')
  # Setup progress
  progress = dipsaus::progress2(
    sprintf('Importing %s (first time will take seconds)', subject_name),
    max = length(surface_types) * 4 + length(curvatures) * 4 + 3,
    shiny_auto_close = TRUE)

  progress$inc('Check T1 volume data')
  import_fs_T1(subject_name, fs_path)

  for(surf_type in surface_types){
    try({
      progress$inc(sprintf('Check fs surface - %s [%sh]', surf_type, 'l'))
      import_fs_surf(subject_name, fs_path, surf_type = surf_type, hemisphere = 'l')

      progress$inc(sprintf('Check fs surface - %s [%sh]', surf_type, 'r'))
      import_fs_surf(subject_name, fs_path, surf_type = surf_type, hemisphere = 'r')
    }, silent = TRUE)
  }

  for(surf_type in surface_types){
    try({
      progress$inc(sprintf('Check SUMA surface - %s [%sh]', surf_type, 'l'))
      import_suma_surf(subject_name, fs_path, surf_type = surf_type, hemisphere = 'l')

      progress$inc(sprintf('Check SUMA surface - %s [%sh]', surf_type, 'r'))
      import_suma_surf(subject_name, fs_path, surf_type = surf_type, hemisphere = 'r')
    }, silent = TRUE)
  }

  for(curv in curvatures){
    try({
      progress$inc(sprintf('Check fs curvature - %s [%sh]', curv, 'l'))
      import_fs_curv( subject_name, fs_path, curv_name = curv, hemisphere = 'l')

      progress$inc(sprintf('Check fs curvature - %s [%sh]', curv, 'r'))
      import_fs_curv( subject_name, fs_path, curv_name = curv, hemisphere = 'r')
    }, silent = TRUE)
  }

  for(curv in curvatures){
    try({
      progress$inc(sprintf('Check SUMA curvature - %s [%sh]', curv, 'l'))
      import_suma_curv( subject_name, fs_path, curv_name = curv, hemisphere = 'l')

      progress$inc(sprintf('Check SUMA curvature - %s [%sh]', curv, 'r'))
      import_suma_curv( subject_name, fs_path, curv_name = curv, hemisphere = 'r')
    }, silent = TRUE)
  }

  # from_json(from_file = '~/rave_data/others/three_brain/N27/RAVE/common.digest')

  # Load xfm
  path_xform = normalizePath(file.path(fs_path, 'mri', 'transforms', 'talairach.xfm'), mustWork = FALSE)
  xfm = diag(c(1,1,1,1))
  if( file.exists(path_xform) ){
    ss = readLines(path_xform)
    ss = stringr::str_match(ss, '^([-]{0,1}[0-9.]+) ([-]{0,1}[0-9.]+) ([-]{0,1}[0-9.]+) ([-]{0,1}[0-9.]+)[;]{0,1}$')
    ss = ss[!is.na(ss[,1]), -1, drop = FALSE]
    if( nrow(ss) >= 3 ){
      ss = ss[1:3,1:4]
    }else{
      cat2('Cannot parse file talairach.xfm properly.', level = 'WARNING')
      ss = cbind(diag(c(1,1,1)), 0)
    }
    ss = as.numeric(ss)
    dim(ss) = c(3,4)
    xfm = rbind(ss, c(0,0,0,1))
  }
  add_to_digest_file(
    file = file.path(fs_path, 'RAVE', 'common.digest'),
    last_cached = strftime(Sys.time(), '%Y-%m-%d %H:%M:%S', usetz = TRUE),
    xfm = xfm,
    cache_version = cache_version,
    # Append to common digest
    .append = FALSE
  )


  # Try to save labels, but this might raise error
  tryCatch({
    progress$inc(sprintf('Check fs labels - %s [%sh]', 'aparc', 'l'))
    import_fs_label(subject_name, fs_path, label_name = 'aparc', hemisphere = 'l')

    progress$inc(sprintf('Check fs labels - %s [%sh]', 'aparc', 'r'))
    import_fs_label(subject_name, fs_path, label_name = 'aparc', hemisphere = 'r')
  }, error = function(e){
  })


  invisible()
}


