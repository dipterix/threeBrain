#' @export
video_content <- function(path, duration = Inf, time_start = 0, asp_ratio = 16 / 9, local = TRUE){

  is_url <- FALSE
  temp <- FALSE
  if(!file.exists(path)){
    if( !startsWith(path, "http") && !startsWith(path, "ftp") ){
      stop("`video_content`: `path` not exists, must be a local path or an url")
    }
    if( local ){
      # try to download video because path is probably an URL
      url <- path
      timeout <- getOption("timeout", 60)
      on.exit({
        options("timeout" = timeout)
      })
      options("timeout" = 6000)
      path <- tempfile(fileext = '.mp4')
      utils::download.file(url, destfile = path)
      temp <- TRUE
    } else {
      is_url <- TRUE
    }

  }

  if(!is_url && !endsWith(tolower(path), "mp4")){
    warning("`video_content` only allows mp4 videos. The viewer might not work with other media contents.")
  }
  if(is_url){
    url <- path
  } else {
    url <- filename(path)
  }

  list(
    url = url,
    path = path,
    is_url = is_url,
    temp = temp,
    duration = duration,
    time_start = time_start,
    asp_ratio = asp_ratio
  )
}


