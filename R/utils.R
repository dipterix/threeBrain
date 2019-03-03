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
cat2 <- function(...){
  rutabaga::cat2(...)
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


read_fs_asc <- function(file){
  threejsr::read.freesurf.asc(file)
}
