#' @export
import_suma.surface <- function(
  subject_name, fs_path, quiet = FALSE, dtype,
  sub_type = 'pial', hemisphere = c('l', 'r'), ...){

  fs_path <- normalizePath(fs_path)
  # sub_type <- match.arg(sub_type)
  hemisphere <- match.arg(hemisphere)

  fnames <- sprintf('std.141.%sh.%s%s', hemisphere, sub_type, c('.asc', '.gii'))
  src <- file.path(fs_path, 'SUMA', fnames)
  if( ! any(file.exists(src)) ) {
    if(!quiet){
      cat2(sprintf("  * surf/%sh.%s (as well as its asc/gii versions) is missing\n", hemisphere, sub_type), level = 'WARNING')
    }
    return( FALSE )
  }
  which_exists <- which(file.exists(src))[[1]]
  src <- normalizePath(src[[which_exists]])

  tname <- sprintf('%s_std_141_%sh_%s.json', subject_name, hemisphere, sub_type)
  target <-file.path(fs_path, 'RAVE', tname)
  dige <- paste0(target, '.digest')

  cached <- validate_digest(src, target)
  if(!isFALSE(cached)){
    return( TRUE )
  }

  # Step 3: Create cache
  surf_group <- GeomGroup$new(name = sprintf('Surface - %s (%s)', sub_type, subject_name),
                              position = c( 0, 0, 0 ))
  full_hemisphere <- ifelse(hemisphere == 'l', 'Left', 'Right')
  surf <- load_surface_asc_gii(src)

  unlink(target)
  FreeGeom$new(
    name = sprintf('Standard 141 %s Hemisphere - %s (%s)', full_hemisphere, sub_type, subject_name),
    position = c(0,0,0), cache_file = target, group = surf_group, layer = 8,
    vertex = surf$vertices, face = surf$faces)

  # Add additional information to digest header

  # Add file_digest, Norig, Torig to cache_digest
  add_to_digest_file(
    dige,
    file_digest = attr(cached, 'digest'),
    surface_type = sub_type,
    surface_format = 'std.141',
    hemisphere = hemisphere,
    THREEBRAIN_DATA_VER = THREEBRAIN_DATA_VER,
    n_vertices = nrow(surf$vertices),
    n_faces = nrow(surf$faces),
    is_surface = TRUE,
    is_suma_surface = TRUE,
    is_standard_141 = TRUE,

    .append = FALSE
  )

  args <- structure(list(
    structure(list(
      'std.141', nrow(surf$vertices), nrow(surf$faces)
    ), names = c('surface_format', sprintf('n_%s_%s', c('vertices', 'faces'), sub_type))),
    THREEBRAIN_DATA_VER,
    file.path(fs_path, 'RAVE', 'common.digest'),
    subject_name, FALSE
  ), names = c(
    sprintf('surface_std_141_%sh_%s', hemisphere, sub_type),
    'THREEBRAIN_DATA_VER', 'file', 'subject', '.append'
  ))
  do.call('add_to_digest_file', args)

  add_to_digest_file(
    args$file,
    suma_surface_files = tname,
    .append = TRUE
  )
  return(TRUE)


}


# import_suma('YCQ', fs_path = '~/rave_data/others/fs/', dtype = 'surface', sub_type = 'pial', hemisphere = 'l')
# import_suma('YCQ', fs_path = '~/rave_data/others/fs/', dtype = 'surface', sub_type = 'pial', hemisphere = 'r')
