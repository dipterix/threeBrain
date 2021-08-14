#' Add video content to the viewer
#' @param path local file path or 'URL'
#' @param duration duration of the video
#' @param time_start start time relative to the stimuli onset
#' @param asp_ratio aspect ratio; default is \code{16/9}
#' @param local used only when \code{path} is a 'URL': whether to download
#' the video before generating the viewer; see 'Details'
#' @details The video path can be either local file path or a 'URL' from
#' websites. When path is from the internet, there are two options: download
#' the video before generating the viewer, or directly use the 'URL'.
#'
#' If download happens before a viewer is generated (\code{local=TRUE}), then
#' the video content is local. The viewer will be self-contained. However,
#' the distribution will contain the video, and the archive size might be large.
#'
#' If raw 'URL' is used (\code{local=FALSE}), then viewer is not self-contained
#' as the video link might break anytime. The 'screenshot' and 'record' function
#' might be limited if the 'URL' has different domain than yours. However,
#' the distribution will not contain the video, hence smaller. This works in the
#' scenarios when it is preferred not to share video files or they are
#' licensed, or simply distribution is limited. Besides, this method is slightly
#' faster than the local alternatives.
#'
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
    path <- normalizePath(path)
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


