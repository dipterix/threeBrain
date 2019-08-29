get2 <- function(x, from, ifnotfound = NULL, ...){
  if(x %in% names(from)){
    return(from[[x]])
  }else{
    return(ifnotfound)
  }
}


stopifnot2 <- function(..., msg = 'Condition not satisfied'){
  if(!all(c(...))){
    stop(msg)
  }
}


data_uri <- function(file, ...){
  base64enc::dataURI(file = file, ...)
}


# TODO: Remove dependency
cat2 <- function(
  ..., level = 'DEBUG', print_level = FALSE,
  file = "", sep = " ", fill = FALSE, labels = NULL,
  append = FALSE, end = '\n', pal = list(
    'DEBUG' = 'grey60',
    'INFO' = '#1d9f34',
    'WARNING' = '#ec942c',
    'ERROR' = '#f02c2c',
    'FATAL' = '#763053',
    'DEFAULT' = '#000000'
  )
){
  if(!level %in% names(pal)){
    level = 'DEFAULT'
  }
  .col = pal[[level]]
  if(is.null(.col)){
    .col = '#000000'
  }

  # check if interactive
  if(base::interactive()){
    # use colored console
    col = crayon::make_style(.col)
    if(print_level){
      base::cat('[', level, ']: ', sep = '')
    }

    base::cat(col(..., sep = sep), end = end, file = file, fill = fill, labels = labels, append = append)

  }else{
    # Just use cat
    base::cat(...)
  }

  if(level == 'FATAL'){
    # stop!
    stop()
  }

  invisible()
}


filename <- function(path){
  sapply(stringr::str_split(path, '\\\\|/'), function(x){
    x[length(x)]
  })
}


json_cache <- function(path, data, recache=FALSE, ...){
  if(recache){
    cat2('Re-cache...')
  }

  is_new_cache = FALSE

  if(recache || !file.exists(path)){
    cat2('Creating cache data to -', path)

    s = to_json(data, ...)

    dir = dirname(path)
    dir.create(dir, showWarnings = F, recursive = T)

    writeLines(s, path)
    is_new_cache = TRUE
  }

  list(
    path = path,
    absolute_path = normalizePath(path),
    file_name = filename(path),
    is_new_cache = is_new_cache,
    is_cache = TRUE
  )


}


# Define a package-verse standard to serialize and de-seialize jsons
to_json <- function(x, dataframe = 'rows', matrix = 'rowmajor', null = 'null', na = 'null', ..., to_file = NULL){
  s = jsonlite::toJSON(x, dataframe = dataframe, matrix = matrix, null = null, na = na, ...)
  if(length(to_file) == 1){
    dir.create(dirname(to_file), showWarnings = FALSE, recursive = TRUE)
    writeLines(s, con = to_file)
  }
  s
}

from_json <- function(txt, simplifyVector = TRUE, simplifyDataFrame = simplifyVector,
                      simplifyMatrix = simplifyVector, flatten = FALSE, ..., from_file = NULL){
  if(length(from_file) == 1){
    stopifnot2(missing(txt) && file.exists(from_file), msg = 'If you want to load json from a file, do not specify txt, and make sure from_file exists')
    txt = readLines(from_file)
  }
  jsonlite::fromJSON(txt, simplifyVector = simplifyVector, simplifyDataFrame = simplifyDataFrame,
                     simplifyMatrix = simplifyMatrix, flatten = flatten, ...,)
}

#' Read `FreeSurfer` ascii file
#' @param file file location
#' @return a list of vertices and face indices
#' @export
read_fs_asc <- function(file){
  src = readLines(file)
  src = src[!stringr::str_detect(src, '^[\\ ]*#')]

  # header
  header = as.integer(stringr::str_split_fixed(src[1], '\\ ', 2)) # The first element is vertex and the second one is faces

  # Vertices
  vertices = stringr::str_split(src[1 + seq_len(header[1])], '[\\ ]+', simplify = T);
  dim = dim(vertices)
  vertices = as.numeric(vertices)
  dim(vertices) = dim

  # faces
  faces = stringr::str_split(src[1 + header[1] + seq_len(header[2])], '[\\ ]+', simplify = T);
  dim = dim(faces)
  faces = as.integer(faces)
  dim(faces) = dim

  return(list(
    header = header,
    vertices = vertices,
    faces = faces
  ))
}


#' Read 'FreeSurfer` m3z file
#' @param filename file location, usually located at `mri/transforms/talairach.m3z`
#' @return registration data
#' @details An `m3z` file is a gzipped binary file containing a dense vector
#' field that describes a 3D registration between two volumes/images.
#' This implementation follows the `Matlab` implementation from the `FreeSurfer`.
#' This function is released under the Freesurfer license:
#' \url{https://surfer.nmr.mgh.harvard.edu/fswiki/FreeSurferSoftwareLicense}.
#' @export
read_fs_m3z <- function(filename){
  fp = gzfile(filename, open = 'rb')

  # fdata = readBin(fp, 'raw', 24, endian = 'big')
  version = readBin(fp, 'numeric', 1, size = 4, endian = 'big');

  if( version != 1 ){
    stop( 'm3z veresion is not 1.' )
  }

  width = readBin(fp, 'integer', 1, endian = 'big');
  height = readBin(fp, 'integer', 1, endian = 'big');
  depth = readBin(fp, 'integer', 1, endian = 'big');
  spacing = readBin(fp, 'integer', 1, endian = 'big');
  exp_k = readBin(fp, 'numeric', 1, size = 4, endian = 'big');

  #==--------------------------------------------------------------------==#

  # vectorized data read. read all data into a buffer that can be
  # typecast into the appropriate data type all at once.

  # read all the data (9 numbers per voxel, each at 32 bits, unsigned)
  buf = readBin(fp, 'integer', width * height * depth * 9 * 4, size = 1, signed = FALSE, endian = 'big');

  inds = outer(c(4:1, 8:5, 12:9), 9 * 4 * (seq_len(width * height * depth) - 1), '+')

  # extract the three interleaved volumes and permute the result to match the
  # original looped read. the double conversion isn't necessary, but is
  # included to maintain backward compatibility.

  con = rawConnection(raw(0), "r+")
  writeBin(as.raw(as.vector(buf[inds])), con)
  seek(con,0)
  vol_orig = readBin(con, "numeric", n = prod(c(3, width, height, depth)), size = 4)
  dim(vol_orig) = c(3, depth, height, width)
  vol_orig = aperm(vol_orig, c(4,3,2,1))

  inds = inds + 12
  seek(con,0)
  writeBin(as.raw(as.vector(buf[inds])), con)
  seek(con,0)
  vol_dest = readBin(con, "numeric", n = prod(c(3, width, height, depth)), size = 4)
  dim(vol_dest) = c(3, depth, height, width)
  vol_dest = aperm(vol_dest, c(4,3,2,1))

  inds = inds + 12
  seek(con,0)
  writeBin(as.raw(as.vector(buf[inds])), con)
  seek(con,0)
  vol_ind0 = readBin(con, "integer", n = prod(c(3, width, height, depth)), size = 4)
  dim(vol_ind0) = c(3, depth, height, width)
  vol_ind0 = aperm(vol_ind0, c(4,3,2,1))

  close(con)
  fpos_dataend = seek(fp, NA)

  tag = readBin(fp, 'integer', 1, endian = 'big');

  close(fp)

  return(list(
    version = version,
    dimension = c(width, height, depth, 3),
    spacing = spacing,
    exp_k = exp_k,
    vol_orig = vol_orig,
    vol_dest = vol_dest,
    vol_ind0 = vol_ind0,
    morph_tag = tag
  ))
}



file_move <- function(from, to, clean = TRUE, show_warnings = FALSE, overwrite = TRUE,
                      copy_mode = TRUE, copy_date = TRUE, all_files = TRUE,
                      force_clean = FALSE){
  if(!file.exists(from)){
    if(show_warnings)
      warning('from not exists.')
    return(FALSE)
  }
  from = normalizePath(from, mustWork = TRUE)
  to = normalizePath(to, mustWork = FALSE)
  if(from == to){
    if(show_warnings)
      warning('Nothing done, from is to.')
    return(TRUE)
  }

  if(!dir.exists(from)){
    # from is a file
    if(!dir.exists(dirname(to))){
      dir.create(dirname(to), showWarnings = show_warnings, recursive = TRUE)
    }

    file.copy(from = from, to = to, overwrite = overwrite, recursive = FALSE,
              copy.mode = copy_mode, copy.date = copy_date)

    # clean
    if(clean){
      # remove original file
      unlink(from, recursive = FALSE, force = force_clean)
    }

  }else{
    # is a dir, move recursively
    dir.create(to, showWarnings = show_warnings, recursive = TRUE)

    to = normalizePath(to, mustWork = TRUE)
    if(from == to){
      if(show_warnings)
        warning('Nothing done, from is to.')
      return(TRUE)
    }

    # Copy file by file
    files = list.files(from, all.files = all_files, full.names = FALSE,
                       recursive = TRUE, include.dirs = FALSE, no.. = TRUE)

    for(f in files){
      file_move(file.path(from, f), file.path(to, f), clean = clean,
                show_warnings = FALSE, overwrite = overwrite,
                copy_mode = copy_mode, copy_date = copy_date)
    }



    if(clean){

      # everything should be moved, check if folder needs to be removed
      from_vec = stringr::str_split(from, '/|\\\\')[[1]]
      from_vec = from_vec[from_vec != '']
      to = stringr::str_split(to, '/|\\\\')[[1]]
      to = to[to != '']

      remove_from = FALSE
      if(length(from_vec) <= length(to)){
        for(ii in seq_along(from_vec)){
          if(from_vec[[ii]] != to[[ii]]){
            remove_from = TRUE
          }
        }
      }else{
        remove_from = TRUE
      }

      if(remove_from){
        unlink(from, recursive = TRUE, force = FALSE)
      }
    }


  }



}



safe_write_csv <- function(data, file, ..., quiet = F){
  if(file.exists(file)){
    oldfile = stringr::str_replace(file, '\\.[cC][sS][vV]$', strftime(Sys.time(), '_[%Y%m%d_%H%M%S].csv'))
    if(!quiet){
      cat2('Renaming file ', file, ' >> ', oldfile)
    }
    file.rename(file, oldfile)
  }
  utils::write.csv(data, file, ...)
}
