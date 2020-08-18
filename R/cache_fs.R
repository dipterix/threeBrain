import_fs_label <- function(
  subject_name, fs_path, folder = 'label',
  label_name = 'aparc', hemisphere = 'l',
  cache_dir = 'RAVE', quiet = FALSE){

  threebrain_data_ver <- 1

  label_dir <- file.path(fs_path, folder)
  rave_dir <- file.path(fs_path, cache_dir)
  path_cache <- rave_dir
  if( !dir.exists(rave_dir) ){
    dir_create(rave_dir)
  }

  # Step 1: Check if lh.pial.xxx exists

  f_names <- sprintf('%sh.%s.annot', hemisphere, label_name)
  f_paths <- file.path(label_dir, f_names)
  fe <- file.exists(f_paths)
  if( !any(fe) ){
    cat2('None of the following label files is found:\n',
         paste0('\n  * label/', f_names, collapse = ''),
         level = 'WARNING')
    return(FALSE)
  }
  idx <- which(fe)[[1]]

  label_path <- f_paths[[ idx ]]

  # Step 2: Check if cache exists
  has_cache <- FALSE
  file_digest <- digest_file(label_path)

  cache_fname <- sprintf('%s_fs_annot_%sh_%s.json', subject_name, hemisphere, label_name)
  cache_file <- file.path(rave_dir, cache_fname)
  cache_digest <- paste0(cache_file, '.digest')

  if( file.exists(cache_file) && file.exists(cache_digest) ){
    # Check digest
    file_digest_compare <- get_digest_header(cache_digest, 'file_digest', '')
    threebrain_data_ver_compare <- get_digest_header(cache_digest, 'threebrain_data_ver', 0)
    if( file_digest == file_digest_compare && threebrain_data_ver <= threebrain_data_ver_compare ){
      has_cache <- TRUE
    }
  }

  if( has_cache ){
    # No need to cache
    return(FALSE)
  }

  # Step 3: Create cache
  labels <- read_fs_labels(label_path)

  # Check with fs vertex_count
  surface_info <- get_digest_header(file.path(rave_dir, 'common.digest'),
                                   sprintf('surface_fs_%sh', hemisphere), list())
  surface_info <- as.list(surface_info)
  # if( !isTRUE(surface_info$n_vertices == labels$vertex_count) ){
  #   stop('Cannot import FreeSurfer annotation file: Vertex numbers not match')
  # }


  levels <- sapply(labels$entries, '[[', 'name')
  palette <- sapply(labels$entries, '[[', 'color')
  values <- labels$data$Name; values[is.na(values)] <- levels[[1]]

  kf <- KeyFrame2$new(name = label_name, time = 0, value = values,
                     dtype = 'discrete', levels = levels, target = '.userData.animationIndex')

  # Create a cache
  kf_name <- sprintf('Annotation - %sh.%s (%s)', hemisphere, label_name, subject_name)
  kf$use_cache(path = cache_file, name = kf_name)

  # Add file_digest
  add_to_digest_file(
    cache_digest,
    file_digest = file_digest,
    is_annotation = TRUE,
    annot_format = 'fs',
    annot_name = label_name,
    hemisphere = hemisphere,
    target = '.userData.animationIndex',
    levels = levels,
    default_palette = palette,
    threebrain_data_ver = threebrain_data_ver,

    # Ignore previous saves
    .append = FALSE
  )


  args <- list(
    list(
      annot_format = 'fs',
      annot_name = label_name,
      hemisphere = hemisphere,
      levels = levels,
      default_palette = palette
    )
  )
  names(args) <- sprintf('annot_fs_%sh_%s', hemisphere, label_name)
  args$file <- file.path(rave_dir, 'common.digest')
  args$subject <- subject_name
  args$.append <- FALSE
  do.call('add_to_digest_file', args)

  add_to_digest_file(
    args$file,
    fs_label_files = cache_fname,
    .append = TRUE
  )

  return(TRUE)


}


import_fs_T1 <- function(subject_name, fs_path, folder = 'mri', cache_dir = 'RAVE', quiet = FALSE){
  # Hard-coded, used to compare cached format-version
  threebrain_data_ver <- 1

  mri_path <- file.path(fs_path, folder)
  rave_dir <- file.path(fs_path, cache_dir)
  path_cache <- rave_dir
  if( !dir.exists(mri_path) ){
    dir_create(mri_path)
  }

  dir_create(rave_dir)

  # Step 1: Find t1 volume data
  t1_image <- c("brain.finalsurfs.mgz", "brainmask.mgz", "brainmask.auto.mgz", "T1.mgz")

  t1_paths <- file.path(mri_path, t1_image)
  fe <- file.exists(t1_paths)

  if( !any(fe) ){
    if(!quiet){
      cat2('Cannot find T1 volume data. None of the following files exists:\n',
           paste0('\n  * ', t1_image, collapse = ''), level = 'WARNING')
    }
    return()
  }

  # Step 2: Check T1 with existing signature
  t1_name <- t1_image[fe][[1]]
  t1_path <- t1_paths[fe][[1]]
  cache_name <- sprintf('%s_t1.json', subject_name)
  cache_volume <- file.path(path_cache, cache_name)
  cache_digest <- paste0(cache_volume, '.digest')

  # Check if cache_volume exists
  has_cache <- FALSE
  file_digest <- digest_file(t1_path)
  if( file.exists(cache_volume) && file.exists(cache_digest) ){
    # Check digest
    file_digest_compare <- get_digest_header(cache_digest, 'file_digest', '')
    threebrain_data_ver_compare <- get_digest_header(cache_digest, 'threebrain_data_ver', 0)
    if( file_digest == file_digest_compare && threebrain_data_ver <= threebrain_data_ver_compare ){
      has_cache <- TRUE
    }
  }

  if( has_cache ){
    # No need to cache
    return(FALSE)
  }

  # Step 3: read-in file, create cache
  brain_t1 <- read_mgz(t1_path)
  Norig <- brain_t1$header$get_vox2ras()
  Torig <- brain_t1$header$get_vox2ras_tkr()

  volume_shape <- as.integer(brain_t1$get_shape())
  group_volume <- GeomGroup$new(name = sprintf('Volume - T1 (%s)', subject_name))
  group_volume$subject_code <- subject_name

  volume <- brain_t1$get_data()
  volume <- reorient_volume( volume, Norig )

  # Create a datacube geom to force cache
  DataCubeGeom$new(
    name = sprintf('T1 (%s)', subject_name), value = volume, dim = volume_shape,
    half_size = volume_shape / 2, group = group_volume, position = c(0,0,0),
    cache_file = cache_volume)

  rm(volume)

  # Add file_digest, Norig, Torig to cache_digest
  add_to_digest_file(
    cache_digest,
    file_digest = file_digest,
    Norig = Norig,
    Torig = Torig,
    source_name = t1_name,
    shape = volume_shape,
    threebrain_data_ver = threebrain_data_ver,

    .append = FALSE
  )

  add_to_digest_file(
    file.path(path_cache, 'common.digest'),
    fs_volume_files = cache_name,
    .append = TRUE
  )

  return(TRUE)

}




import_fs_surf <- function(subject_name, fs_path, folder = 'surf',
                           surf_type = 'pial', hemisphere = 'l',
                           cache_dir = 'RAVE', quiet = FALSE){
  threebrain_data_ver <- 2

  surf_path <- file.path(fs_path, folder)
  rave_dir <- file.path(fs_path, cache_dir)
  path_cache <- rave_dir
  if( !dir.exists(surf_path) ){
    dir_create(surf_path)
  }
  if( !dir.exists(rave_dir) ){
    dir_create(rave_dir)
  }

  # Step 1: Check if lh.pial.xxx exists

  f_names <- sprintf('%sh.%s%s', hemisphere, surf_type, c('.asc', '.gii', ''))
  f_paths <- file.path(surf_path, f_names)
  fe <- file.exists(f_paths)
  if( !any(fe) ){
    cat2('None of the following surface files is found:\n',
         paste0('\n  * surf/', f_names, collapse = ''),
         level = 'WARNING')
    return(FALSE)
  }
  idx <- which(fe)[[1]]

  surf_path <- f_paths[[ idx ]]

  # Step 2: Check if cache exists
  has_cache <- FALSE
  file_digest <- digest_file(surf_path)

  surf_fname <- sprintf('%s_fs_%sh_%s.json', subject_name, hemisphere, surf_type)
  cache_surf <- file.path(path_cache, surf_fname)
  cache_digest <- paste0(cache_surf, '.digest')
  if( file.exists(cache_surf) && file.exists(cache_digest) ){
    # Check digest
    file_digest_compare <- get_digest_header(cache_digest, 'file_digest', '')
    threebrain_data_ver_compare <- get_digest_header(cache_digest, 'threebrain_data_ver', 0)
    if( file_digest == file_digest_compare && threebrain_data_ver <= threebrain_data_ver_compare ){
      has_cache <- TRUE
    }
  }

  if( has_cache ){
    # No need to cache
    return(FALSE)
  }

  # Step 3: Create cache
  surf_group <- GeomGroup$new(name = sprintf('Surface - %s (%s)', surf_type, subject_name),
                             position = c( 0, 0, 0 ))
  full_hemisphere <- ifelse(hemisphere == 'l', 'Left', 'Right')
  surf <- load_surface_asc_gii(normalizePath( f_paths[[ idx ]] ))

  FreeGeom$new(
    name = sprintf('FreeSurfer %s Hemisphere - %s (%s)', full_hemisphere, surf_type, subject_name),
    position = c(0,0,0), cache_file = cache_surf, group = surf_group, layer = 8,
    vertex = surf$vertices, face = surf$faces)

  # Add additional information to digest header


  # Add file_digest, Norig, Torig to cache_digest
  add_to_digest_file(
    cache_digest,
    file_digest = file_digest,
    surface_type = surf_type,
    surface_format = 'fs',
    hemisphere = hemisphere,
    threebrain_data_ver = threebrain_data_ver,
    n_vertices = nrow(surf$vertices),
    n_faces = nrow(surf$faces),
    is_surface = TRUE,
    is_fs_surface = TRUE,

    .append = FALSE
  )

  args <- structure(list(
    structure(list(
      'fs', nrow(surf$vertices), nrow(surf$faces)
    ), names = c('surface_format', sprintf('n_%s_%s', c('vertices', 'faces'), surf_type))),
    file.path(rave_dir, 'common.digest'),
    subject_name, FALSE
  ), names = c(
    sprintf('surface_fs_%sh_%s', hemisphere, surf_type),
    'file', 'subject', '.append'
  ))
  do.call('add_to_digest_file', args)

  add_to_digest_file(
    args$file,
    fs_surface_files = surf_fname,
    .append = TRUE
  )

  return(TRUE)


}

import_fs_curv <- function(
  subject_name, fs_path, folder = 'surf', curv_name = 'sulc',
  hemisphere = 'l', cache_dir = 'RAVE', quiet = FALSE){

  threebrain_data_ver <- 1

  curve_path <- file.path(fs_path, folder)
  rave_dir <- file.path(fs_path, cache_dir)
  if( !dir.exists(rave_dir) ){
    dir_create(rave_dir)
  }

  # Step 1: Check if lh.sulc.xxx exists

  f_names <- sprintf('%sh.%s%s', hemisphere, curv_name, c('.asc', ''))
  f_paths <- file.path(curve_path, f_names)
  fe <- file.exists(f_paths)
  if( !any(fe) ){
    cat2('None of the following curve files is found:\n',
         paste0('\n  * surf/', f_names, collapse = ''),
         level = 'WARNING')
    return(FALSE)
  }
  idx <- which(fe)[[1]]

  curve_path <- f_paths[[ idx ]]

  # Step 2: Check if cache exists
  has_cache <- FALSE
  file_digest <- digest_file(curve_path)

  cache_fname <- sprintf('%s_fs_%sh_%s.json', subject_name, hemisphere, curv_name)
  cache_file <- file.path(rave_dir, cache_fname)
  cache_digest <- paste0(cache_file, '.digest')

  if( file.exists(cache_file) && file.exists(cache_digest) ){
    # Check digest
    file_digest_compare <- get_digest_header(cache_digest, 'file_digest', '')
    threebrain_data_ver_compare <- get_digest_header(cache_digest, 'threebrain_data_ver', 0)
    if( file_digest == file_digest_compare && threebrain_data_ver <= threebrain_data_ver_compare ){
      has_cache <- TRUE
    }
  }

  if( has_cache ){
    # No need to cache
    return(FALSE)
  }

  # Step 3: Create cache
  if( idx == 1 ){
    curve <- utils::read.table(curve_path)
    curve <- curve[[length(curve)]]
  }else{
    # this is a raw fs file
    curve <- freesurferformats::read.fs.curv(curve_path)
  }

  # Check with fs vertex_count
  surface_info <- get_digest_header(file.path(rave_dir, 'common.digest'),
                                   sprintf('surface_fs_%sh', hemisphere), list())
  surface_info <- as.list(surface_info)
  # if( !isTRUE(surface_info$n_vertices == length(curve)) ){
  #   stop(sQuote(f_names[ idx ]),
  #        ' - Cannot import FreeSurfer curvature file: Vertex numbers not match')
  # }

  # save to cache
  dset_name <- sprintf('Curvature - %sh.%s (%s)', hemisphere, curv_name, subject_name)
  data <- structure(
    list(
      list(
        name = curv_name,
        full_name = dset_name,
        cached = TRUE,
        hemisphere = hemisphere,
        n_points = length(curve),
        range = range(curve),
        value = curve
      )
    ),
    names = dset_name)

  json_cache(cache_file, data)

  # Add file_digest
  add_to_digest_file(
    cache_digest,
    file_digest = file_digest,
    curve_format = 'fs',
    curve_name = curv_name,
    hemisphere = hemisphere,
    threebrain_data_ver = threebrain_data_ver,

    # Ignore previous saves
    .append = FALSE
  )


  args <- list(
    list(
      curve_format = 'fs',
      curve_name = curv_name,
      n_points = length(curve),
      hemisphere = hemisphere
    )
  )
  names(args) <- sprintf('curvature_fs_%sh_%s', hemisphere, curv_name)
  args$file <- file.path(rave_dir, 'common.digest')
  args$subject <- subject_name
  args$.append <- FALSE
  do.call('add_to_digest_file', args)

  add_to_digest_file(
    args$file,
    fs_label_files = cache_fname,
    .append = TRUE
  )

  return(TRUE)



}

