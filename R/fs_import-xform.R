#' @export
import_fs.xform <- function(subject_name, fs_path, quiet = FALSE, dtype, sub_type, hemisphere, ...){

  fs_path <- normalizePath(fs_path)
  # sub_type <- match.arg(sub_type)


  path_xform <- normalizePath(file.path(fs_path, 'mri', 'transforms', 'talairach.xfm'), mustWork = FALSE)
  success <- FALSE
  xfm <- diag(c(1,1,1,1))
  if( file.exists(path_xform) ){
    ss <- readLines(path_xform)
    ss <- stringr::str_match(ss, '^([-]{0,1}[0-9.]+) ([-]{0,1}[0-9.]+) ([-]{0,1}[0-9.]+) ([-]{0,1}[0-9.]+)[;]{0,1}[ ]{0,}$')
    ss <- ss[!is.na(ss[,1]), -1, drop = FALSE]
    if( nrow(ss) >= 3 ){
      ss <- ss[1:3,1:4]
      success <- TRUE
    }else if(!quiet){
      cat2('Cannot parse file talairach.xfm properly.', level = 'WARNING')
      ss <- cbind(diag(c(1,1,1)), 0)
    }
    ss <- as.numeric(ss)
    dim(ss) <- c(3,4)
    xfm <- rbind(ss, c(0,0,0,1))
  }
  add_to_digest_file(
    file = file.path(fs_path, 'RAVE', 'common.digest'),
    last_cached = strftime(Sys.time(), '%Y-%m-%d %H:%M:%S', usetz = TRUE),
    xfm = xfm,
    cache_version = cache_version,
    # Replace if items exist
    .append = FALSE
  )

  return(success)

}

# import_fs('YCQ', fs_path = '~/rave_data/others/fs/', dtype = 'xform')

