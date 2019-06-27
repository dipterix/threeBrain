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
