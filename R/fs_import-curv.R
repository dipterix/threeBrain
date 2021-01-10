#' @export
import_fs.curv <- function(
  subject_name, fs_path, quiet = FALSE, dtype,
  sub_type = 'sulc', hemisphere = c('l', 'r'), ...){

  fs_path <- normalizePath(fs_path)
  # sub_type <- match.arg(sub_type)
  hemisphere <- match.arg(hemisphere)

  fnames <- sprintf('%sh.%s%s', hemisphere, sub_type, c('', '.asc'))
  src <- file.path(fs_path, 'surf', fnames)
  if( ! any(file.exists(src)) ) {
    if(!quiet){
      cat2(sprintf("  * surf/%sh.%s (as well as its asc/gii versions) is missing\n", hemisphere, sub_type), level = 'WARNING')
    }
    return( FALSE )
  }
  which_exists <- which(file.exists(src))[[1]]
  src <- normalizePath(src[[which_exists]])

  tname <- sprintf('%s_fs_%sh_%s.json', subject_name, hemisphere, sub_type)

  target <-file.path(fs_path, 'RAVE', tname)
  dige <- paste0(target, '.digest')

  cached <- validate_digest(src, target)
  if(!isFALSE(cached)){
    return( TRUE )
  }

  # Step 3: Create cache
  curve <- freesurferformats::read.fs.curv(src)

  # Check with fs vertex_count
  surface_info <- get_digest_header(file.path(fs_path, 'RAVE', 'common.digest'),
                                    sprintf('surface_fs_%sh_pial', hemisphere), list())
  surface_info <- as.list(surface_info)
  if( !quiet && isFALSE(surface_info$n_vertices == length(curve)) ){
    cat2('FreeSurfer surf/', fnames[[which_exists]], ' contains different vertices than its pial surface.', level = 'WARNING')
  }

  # save to cache
  dset_name <- sprintf('Curvature - %sh.%s (%s)', hemisphere, sub_type, subject_name)
  data <- structure(
    list(
      list(
        name = sub_type,
        full_name = dset_name,
        cached = TRUE,
        hemisphere = hemisphere,
        n_points = length(curve),
        range = range(curve),
        value = curve
      )
    ),
    names = dset_name)

  unlink(target)
  json_cache(target, data)

  # Add file_digest
  add_to_digest_file(
    dige,
    file_digest = attr(cached, 'digest'),
    curve_format = 'fs',
    curve_name = sub_type,
    hemisphere = hemisphere,
    THREEBRAIN_DATA_VER = THREEBRAIN_DATA_VER,

    # Ignore previous saves
    .append = FALSE
  )


  args <- list(
    list(
      curve_format = 'fs',
      curve_name = sub_type,
      n_points = length(curve),
      hemisphere = hemisphere
    )
  )
  names(args) <- sprintf('curvature_fs_%sh_%s', hemisphere, sub_type)
  args$file <- file.path(fs_path, 'RAVE', 'common.digest')
  args$subject <- subject_name
  args$.append <- FALSE
  args$THREEBRAIN_DATA_VER <- THREEBRAIN_DATA_VER
  do.call('add_to_digest_file', args)

  add_to_digest_file(
    args$file,
    fs_label_files = tname,
    .append = TRUE
  )

  return(TRUE)



}

# import_fs('YCQ', fs_path = '~/rave_data/others/fs/', dtype = 'curv', sub_type = 'sulc', hemisphere = 'l')
# import_fs('YCQ', fs_path = '~/rave_data/others/fs/', dtype = 'curv', sub_type = 'sulc', hemisphere = 'r')

