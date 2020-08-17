# Function to generate all the caches for 3D viewer.
# Handling caches and new data is a big headache, and this is really one-time
# operation. So why not?
NULL

#' Import from `FreeSurfer` and create `JSON` cache for 3D viewer
#' @param fs_path `FreeSurfer` subject directory
#' @param subject_name subject code
#' @param quiet whether to suppress message or not
#' @export
#' @return None.
import_from_freesurfer <- function(fs_path, subject_name, quiet = FALSE){
  # fs_path = '~/rave_data/others/three_brain/N27/'
  # subject_name = 'N27'
  surface_types <- c('pial', 'white', 'smoothwm', 'pial-outer-smoothed', 'inflated', 'sphere')
  T1_types <- c("brain.finalsurfs", "brainmask", "brainmask.auto", "T1")
  curvatures <- c('curv', 'sulc')
  atlases <- c('aparc+aseg', 'aparc.a2009s+aseg', 'aparc.DKTatlas+aseg', 'aseg')

  orig_quiet <- getOption('threeBrain.quiet', FALSE)
  on.exit({
    options('threeBrain.quiet' = orig_quiet)
  })
  options('threeBrain.quiet' = quiet)

  # Setup progress
  progress <- dipsaus::progress2(
    sprintf('Importing %s (first time will take seconds)', subject_name),
    max = 2 + length(surface_types) * 2 + length(curvatures) * 2 + length(atlases) * 2,
    shiny_auto_close = TRUE, quiet = quiet)

  progress$inc('Transform Matrix')
  import_fs(subject_name, fs_path = fs_path, dtype = 'xform', quiet = quiet)

  progress$inc('MRI-T1')
  imported <- FALSE
  for(t1_type in T1_types){
    imported <- import_fs(subject_name, fs_path = fs_path, dtype = 'T1', sub_type = t1_type, quiet = quiet)
    if(imported){
      break
    }
  }
  if(!imported){
    for(t1_type in T1_types){
      imported <- import_suma(subject_name, fs_path = fs_path, dtype = 'T1', sub_type = t1_type, quiet = quiet)
      if(imported){
        break
      }
    }
  }

  for(surf_type in surface_types){

    progress$inc(sprintf('FreeSurfer %s', surf_type))

    import_fs(subject_name, fs_path = fs_path, dtype = 'surface', sub_type = surf_type, hemisphere = 'l', quiet = quiet)
    import_fs(subject_name, fs_path = fs_path, dtype = 'surface', sub_type = surf_type, hemisphere = 'r', quiet = quiet)

    progress$inc(sprintf('SUMA %s', surf_type))

    import_suma(subject_name, fs_path = fs_path, dtype = 'surface', sub_type = surf_type, hemisphere = 'l', quiet = quiet)
    import_suma(subject_name, fs_path = fs_path, dtype = 'surface', sub_type = surf_type, hemisphere = 'r', quiet = quiet)

  }

  for(curv_type in curvatures){

    progress$inc(sprintf('FreeSurfer %s', curv_type))

    import_fs(subject_name, fs_path = fs_path, dtype = 'curv', sub_type = curv_type, hemisphere = 'l', quiet = quiet)
    import_fs(subject_name, fs_path = fs_path, dtype = 'curv', sub_type = curv_type, hemisphere = 'r', quiet = quiet)

    progress$inc(sprintf('SUMA %s', curv_type))

    import_suma(subject_name, fs_path = fs_path, dtype = 'curv', sub_type = curv_type, hemisphere = 'l', quiet = quiet)
    import_suma(subject_name, fs_path = fs_path, dtype = 'curv', sub_type = curv_type, hemisphere = 'r', quiet = quiet)

  }

  for(atlas_type in atlases){

    progress$inc(sprintf('FreeSurfer %s', atlas_type))

    imported <- import_fs(subject_name, fs_path = fs_path, dtype = 'atlas_volume', sub_type = atlas_type, quiet = quiet)

    if(imported){
      progress$inc(sprintf('SUMA %s - skipped', atlas_type))
    } else {
      progress$inc(sprintf('SUMA %s', atlas_type))
      import_suma(subject_name, fs_path = fs_path, dtype = 'atlas_volume', sub_type = atlas_type, quiet = quiet)
    }

  }


  # progress$inc('Check T1 volume data')
  # import_fs_T1(subject_name, fs_path)
  #
  # for(surf_type in surface_types){
  #   try({
  #     progress$inc(sprintf('Check fs surface - %s [%sh]', surf_type, 'l'))
  #     import_fs_surf(subject_name, fs_path, surf_type = surf_type, hemisphere = 'l')
  #
  #     progress$inc(sprintf('Check fs surface - %s [%sh]', surf_type, 'r'))
  #     import_fs_surf(subject_name, fs_path, surf_type = surf_type, hemisphere = 'r')
  #   }, silent = TRUE)
  # }
  #
  # for(surf_type in surface_types){
  #   try({
  #     progress$inc(sprintf('Check SUMA surface - %s [%sh]', surf_type, 'l'))
  #     import_suma_surf(subject_name, fs_path, surf_type = surf_type, hemisphere = 'l')
  #
  #     progress$inc(sprintf('Check SUMA surface - %s [%sh]', surf_type, 'r'))
  #     import_suma_surf(subject_name, fs_path, surf_type = surf_type, hemisphere = 'r')
  #   }, silent = TRUE)
  # }
  #
  # for(curv in curvatures){
  #   try({
  #     progress$inc(sprintf('Check fs curvature - %s [%sh]', curv, 'l'))
  #     import_fs_curv( subject_name, fs_path, curv_name = curv, hemisphere = 'l')
  #
  #     progress$inc(sprintf('Check fs curvature - %s [%sh]', curv, 'r'))
  #     import_fs_curv( subject_name, fs_path, curv_name = curv, hemisphere = 'r')
  #   }, silent = TRUE)
  # }
  #
  # for(curv in curvatures){
  #   try({
  #     progress$inc(sprintf('Check SUMA curvature - %s [%sh]', curv, 'l'))
  #     import_suma_curv( subject_name, fs_path, curv_name = curv, hemisphere = 'l')
  #
  #     progress$inc(sprintf('Check SUMA curvature - %s [%sh]', curv, 'r'))
  #     import_suma_curv( subject_name, fs_path, curv_name = curv, hemisphere = 'r')
  #   }, silent = TRUE)
  # }
  #
  # # from_json(from_file = '~/rave_data/others/three_brain/N27/RAVE/common.digest')
  #
  # # Load xfm
  # path_xform <- normalizePath(file.path(fs_path, 'mri', 'transforms', 'talairach.xfm'), mustWork = FALSE)
  # xfm <- diag(c(1,1,1,1))
  # if( file.exists(path_xform) ){
  #   ss <- readLines(path_xform)
  #   ss <- stringr::str_match(ss, '^([-]{0,1}[0-9.]+) ([-]{0,1}[0-9.]+) ([-]{0,1}[0-9.]+) ([-]{0,1}[0-9.]+)[;]{0,1}$')
  #   ss <- ss[!is.na(ss[,1]), -1, drop = FALSE]
  #   if( nrow(ss) >= 3 ){
  #     ss <- ss[1:3,1:4]
  #   }else{
  #     cat2('Cannot parse file talairach.xfm properly.', level = 'WARNING')
  #     ss <- cbind(diag(c(1,1,1)), 0)
  #   }
  #   ss <- as.numeric(ss)
  #   dim(ss) <- c(3,4)
  #   xfm <- rbind(ss, c(0,0,0,1))
  # }
  # add_to_digest_file(
  #   file = file.path(fs_path, 'RAVE', 'common.digest'),
  #   last_cached = strftime(Sys.time(), '%Y-%m-%d %H:%M:%S', usetz = TRUE),
  #   xfm = xfm,
  #   cache_version = cache_version,
  #   # Append to common digest
  #   .append = FALSE
  # )


  # # Try to save labels, but this might raise error
  # tryCatch({
  #   progress$inc(sprintf('Check fs labels - %s [%sh]', 'aparc', 'l'))
  #   import_fs_label(subject_name, fs_path, label_name = 'aparc', hemisphere = 'l')
  #
  #   progress$inc(sprintf('Check fs labels - %s [%sh]', 'aparc', 'r'))
  #   import_fs_label(subject_name, fs_path, label_name = 'aparc', hemisphere = 'r')
  # }, error = function(e){
  # })


  invisible()
}


