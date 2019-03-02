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

    s = jsonlite::toJSON(data, ...)

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
