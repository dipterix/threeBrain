import_suma_surf <- function(subject_name, fs_path, folder = 'SUMA',
                             surf_type = 'pial', hemisphere = 'l',
                             cache_dir = 'RAVE', quiet = FALSE){
  threebrain_data_ver = 1

  surf_path = file.path(fs_path, folder)
  rave_dir = file.path(fs_path, cache_dir)
  path_cache = rave_dir
  if( !dir.exists(surf_path) ){
    dir_create(surf_path)
  }
  if( !dir.exists(rave_dir) ){
    dir_create(rave_dir)
  }

  # Step 1: Check if lh.pial.xxx exists

  f_names = sprintf('std.141.%sh.%s%s', hemisphere, surf_type, c('.asc', '.gii'))
  f_paths = file.path(surf_path, f_names)
  fe = file.exists(f_paths)
  if( !any(fe) ){
    cat2('None of the following surface files is found:\n',
         paste0('\n  * SUMA/', f_names, collapse = ''),
         level = 'WARNING')
    return(FALSE)
  }
  idx = which(fe)[[1]]

  surf_path = f_paths[[ idx ]]

  # Step 2: Check if cache exists
  has_cache = FALSE
  file_digest = digest_file(surf_path)

  cache_fname = sprintf('%s_std_141_%sh_%s.json', subject_name, hemisphere, surf_type)
  cache_surf = file.path(path_cache, cache_fname)
  cache_digest = paste0(cache_surf, '.digest')
  if( file.exists(cache_surf) && file.exists(cache_digest) ){
    # Check digest
    file_digest_compare = get_digest_header(cache_digest, 'file_digest', '')
    threebrain_data_ver_compare = get_digest_header(cache_digest, 'threebrain_data_ver', 0)
    if( file_digest == file_digest_compare && threebrain_data_ver <= threebrain_data_ver_compare ){
      has_cache = TRUE
    }
  }

  if( has_cache ){
    # No need to cache
    return(FALSE)
  }

  # Step 3: Create cache
  surf_group = GeomGroup$new(name = sprintf('Surface - %s (%s)', surf_type, subject_name),
                             position = c( 0, 0, 0 ))
  full_hemisphere = ifelse(hemisphere == 'l', 'Left', 'Right')
  surf = load_surface_asc_gii(normalizePath( f_paths[[ idx ]] ))

  FreeGeom$new(
    name = sprintf('Standard 141 %s Hemisphere - %s (%s)', full_hemisphere, surf_type, subject_name),
    position = c(0,0,0), cache_file = cache_surf, group = surf_group, layer = 8,
    vertex = surf$vertices, face = surf$faces)

  # Add additional information to digest header


  # Add file_digest
  add_to_digest_file(
    cache_digest,
    file_digest = file_digest,
    surface_type = surf_type,
    surface_format = 'std.141',
    hemisphere = hemisphere,
    threebrain_data_ver = threebrain_data_ver,
    n_vertices = nrow(surf$vertices),
    n_faces = nrow(surf$faces),
    is_surface = TRUE,
    is_suma_surface = TRUE,
    is_standard_141 = TRUE,

    # Ignore the previous digests
    .append = FALSE
  )

  args = structure(list(
    structure(list(
      'std.141', nrow(surf$vertices), nrow(surf$faces)
    ), names = c('surface_format', sprintf('n_%s_%s', c('vertices', 'faces'), surf_type))),
    file.path(rave_dir, 'common.digest'),
    subject_name, FALSE
  ), names = c(
    sprintf('surface_std_141_%sh_%s', hemisphere, surf_type),
    'file', 'subject', '.append'
  ))
  do.call('add_to_digest_file', args)

  add_to_digest_file(
    args$file,
    suma_surface_files = cache_fname,

    # Append to common digest file however.
    .append = TRUE
  )

  return(TRUE)


}


import_suma_curv <- function(
  subject_name, fs_path, folder = 'SUMA', curv_name = 'sulc',
  hemisphere = 'l', cache_dir = 'RAVE', quiet = FALSE){

  threebrain_data_ver = 1.1

  curve_path = file.path(fs_path, folder)
  rave_dir = file.path(fs_path, cache_dir)
  if( !dir.exists(rave_dir) ){
    dir_create(rave_dir)
  }

  # Step 1: Check if std.141.lh.sulc.xxx exists

  f_names = sprintf('std.141.%sh.%s%s', hemisphere, curv_name, c('.1D', '.1D.dset'))
  f_paths = file.path(curve_path, f_names)
  fe = file.exists(f_paths)
  if( !any(fe) ){
    cat2('None of the following curve files is found:\n',
         paste0('\n  * SUMA/', f_names, collapse = ''),
         level = 'WARNING')
    return(FALSE)
  }
  idx = which(fe)[[1]]

  curve_path = f_paths[[ idx ]]

  # Step 2: Check if cache exists
  has_cache = FALSE
  file_digest = digest_file(curve_path)

  cache_fname = sprintf('%s_std_141_%sh_%s.json', subject_name, hemisphere, curv_name)
  cache_file = file.path(rave_dir, cache_fname)
  cache_digest = paste0(cache_file, '.digest')

  if( file.exists(cache_file) && file.exists(cache_digest) ){
    # Check digest
    file_digest_compare = get_digest_header(cache_digest, 'file_digest', '')
    threebrain_data_ver_compare = get_digest_header(cache_digest, 'threebrain_data_ver', 0)
    if( file_digest == file_digest_compare && threebrain_data_ver <= threebrain_data_ver_compare ){
      has_cache = TRUE
    }
  }

  if( has_cache ){
    # No need to cache
    return(FALSE)
  }

  # Step 3: Create cache
  curve = readLines(curve_path)
  curve = stringr::str_trim(curve)
  curve = curve[stringr::str_detect(curve, '^[^#]')]
  curve = as.numeric(curve)

  # Check with fs vertex_count
  surface_info = get_digest_header(file.path(rave_dir, 'common.digest'),
                                   sprintf('surface_std_141_%sh', hemisphere), list())
  surface_info = as.list(surface_info)
  # if( !isTRUE(surface_info$n_vertices == length(curve)) ){
  #   stop(sQuote(f_names[ idx ]),
  #        ' - Cannot import FreeSurfer curvature file: Vertex numbers not match')
  # }

  # save to cache
  dset_name = sprintf('Curvature - std.141.%sh.%s (%s)', hemisphere, curv_name, subject_name)
  data = structure(
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
    curve_format = 'std.141',
    curve_name = curv_name,
    hemisphere = hemisphere,
    threebrain_data_ver = threebrain_data_ver,

    # Ignore previous saves
    .append = FALSE
  )


  args = list(
    list(
      curve_format = 'std.141',
      curve_name = curv_name,
      n_points = length(curve),
      hemisphere = hemisphere
    )
  )
  names(args) = sprintf('curvature_std_141_%sh_%s', hemisphere, curv_name);
  args$file = file.path(rave_dir, 'common.digest')
  args$subject = subject_name
  args$.append = FALSE
  do.call('add_to_digest_file', args)

  add_to_digest_file(
    args$file,
    fs_label_files = cache_fname,
    .append = TRUE
  )

  return(TRUE)



}
