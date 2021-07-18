
#' @name voxel_colormap
#' @title Color maps for volume or surface data
#' @param gtype geometry type, choices are \code{"surface"}, \code{"volume"}
#' @param dtype data type, \code{"continuous"} or \code{"discrete"}
#' @param key non-negative integer vector corresponding to color values;
#' its length must exceed 1; see 'Details'
#' @param color characters, corresponding to color strings for each key
#' @param value actual value for each key
#' @param alpha whether to respect transparency
#' @param cmap color map object
#' @param con a file path to write results to or to read from. The
#' file path can be passed as \code{voxel_colormap} into \code{\link{threejs_brain}}.
#' @param ... used by continuous color maps, passed to
#' \code{\link[grDevices]{colorRampPalette}}
#'
#' @details
#' Internal 'JavaScript' shader implementation uses integer color \code{key}s to
#' connect color palettes and corresponding values. The keys must be
#' non-negative.
#'
#' Zero key is a special color key reserved by system. Please avoid using it
#' for valid values.
#'
#' @return A list of color map information
#'
#' @examples
#'
#' # Creates a symmetric continuous colormap with 3 keys
#' # The color range is -10 to 10
#' # The colors are 'blue','white','red' for these keys
#'
#' pal <- create_colormap(
#'   gtype = "volume", dtype = "continuous",
#'   key = c(1,2,3), value = c(-10,0,10),
#'   color = c('blue','white','red'))
#'
#' print( pal )
#'
#' # ---------------- Get colormap key from a value ------------
#'
#' # returns key index starting from
#' pal$get_key( -10 )
#'
#' # nearest value
#' pal$get_key( 2 )
#'
#' # set threshold, key is now 0 (no color)
#' pal$get_key( 2, max_delta = 1 )
#'
#'
#' # ---------------- Save and load ----------------
#' f <- tempfile( fileext = '.json' )
#' save_colormap( pal, f )
#' cat(readLines(f), sep = '\n')
#'
#' load_colormap(f)
#'
NULL

register_get_key <- function(re){
  dtype <- re$mapDataType
  gtype <- re$mapGeomType

  if(re$mapDataType == 'continuous'){
    re$get_key <- function(value, max_delta = Inf, ...){
      map <- sapply(re$map, function(x){
        c(x$ColorID, x$Label)
      })

      k <- sapply(value, function(v){
        if(is.na(v)){ return(0) }
        diff <- abs(map[2, ] - v)
        ii <- which.min(diff)
        if(diff[[ii]] > max_delta) { return(0) }
        map[1, ii]
      })
      as.integer(k)
    }
  } else {
    re$get_key <- function(value, ...){
      sapply(value, function(v){
        if(is.na(v)){ return(0) }
        dipsaus::forelse(re$map, function(x){
          if(x$Label == v){
            return(x$ColorID)
          }
          return()
        }, 0L)
      })
    }
  }
  class(re) <- c(sprintf("%s_colormap", gtype), sprintf("%s_colormap", dtype), "colormap")
  re
}

#' @rdname voxel_colormap
#' @export
create_colormap <- function(
  gtype = c('surface', 'volume'),
  dtype = c('continuous', 'discrete'),
  key, color, value, alpha = FALSE, con = NULL, ...
) {
  gtype <- match.arg(gtype)
  dtype <- match.arg(dtype)
  alpha <- isTRUE(alpha)
  key <- as.integer(key)
  stopifnot(length(key) > 1)
  stopifnot(!any(is.na(key)))
  if(!length(value)){
    value <- key
  }
  if(length(color) != length(key)){
    color <- grDevices::colorRampPalette(color, alpha = alpha, ...)(length(key))
  }
  rgb <- col2rgb(color, alpha = alpha)
  if(alpha){
    tbl <- data.frame(
      ColorID = key, Label = value, R = rgb[1,],
      G = rgb[2,], B = rgb[3,], A = rgb[4,]
    )
  } else {
    tbl <- data.frame(
      ColorID = key, Label = value, R = rgb[1,],
      G = rgb[2,], B = rgb[3,]
    )
  }
  ss <- jsonlite::toJSON(tbl, dataframe = 'rows')
  ss <- jsonlite::fromJSON(ss, simplifyDataFrame = FALSE)
  names(ss) <- tbl$ColorID
  re <- list(
    map = ss,
    mapAlpha = alpha,
    mapMinColorID = min(tbl$ColorID),
    mapMaxColorID = max(tbl$ColorID),
    mapValueRange = range(value, na.rm = TRUE),
    mapDataType = dtype,
    mapGeomType = gtype,
    mapVersion = 1.0
  )
  re <- register_get_key(re)
  if(length(con)){
    save_colormap(re, con)
  }
  re
}

#' @rdname voxel_colormap
#' @export
save_colormap <- function(cmap, con){
  stopifnot2('colormap' %in% class(cmap), msg = "`save_colormap`: cmap must be a color map.")
  dtype <- cmap$mapDataType
  cmap$get_key <- NULL
  x <- switch (
    cmap$mapGeomType,
    'volume' = { list("__global_data__.VolumeColorLUT" = unclass(cmap)) },
    'surface' = { list("__global_data__.SurfaceColorLUT" = unclass(cmap)) },
  )
  jsonlite::write_json(x, path = con, auto_unbox = TRUE)
  return(invisible(normalizePath(con)))
}


#' @rdname voxel_colormap
#' @export
freeserfer_colormap <- function(con){
  if(missing(con)){
    # for my use
    con <- 'inst/palettes/datacube2/FreeSurferColorLUT.json'
    if(!file.exists(con)){ con <- NULL }
  }
  file <- 'https://surfer.nmr.mgh.harvard.edu/fswiki/FsTutorial/AnatomicalROI/FreeSurferColorLUT?action=raw'
  s <- readLines(file)[-c(1:6, 1439:1441)]
  s <- s[!stringr::str_detect(s, '^[ ]{0,}#')]
  s <- stringr::str_trim(s)
  s <- s[s!='']
  s <- stringr::str_replace_all(s, "[ \t]+", "\t")
  f <- tempfile()
  writeLines(s, f)
  tbl <- utils::read.table(f, header = FALSE, sep = '\t')
  # tbl <- data.table::fread(paste(s, collapse = '\n'))
  names(tbl) <- c('ColorID', 'Label', 'R', 'G', 'B', 'A')
  col <- rgb(tbl$R, tbl$G, tbl$B, maxColorValue = 255)
  create_colormap(gtype = 'volume', dtype = 'discrete', key = tbl$ColorID,
                  color = col, value = tbl$Label, alpha = FALSE, con = con)
}

#' @rdname voxel_colormap
#' @export
load_colormap <- function(con){
  re <- jsonlite::read_json(con)
  nms <- names(re)
  if("__global_data__.VolumeColorLUT" %in% nms){
    re <- re$`__global_data__.VolumeColorLUT`
  } else {
    re <- re$`__global_data__.SurfaceColorLUT`
  }
  if(!length(re)) {
    stop("`load_colormap`: Invalid colormap")
  }
  return(register_get_key(re))
}


#' @export
print.colormap <- function(x, ...){
  cat(sprintf(
    paste(sep = "", c(
      "<threeBrain Colormap>",
      "  Version: %.1f",
      "  Geometry Type: %s",
      "  Data Type: %s",
      "  Transparent: %s",
      "  # of keys: %d",
      "  Min key: %.0f",
      "  Max key: %.0f\n"
    ), collapse = '\n'),
    x[['mapVersion']],
    x[['mapGeomType']],
    x[['mapDataType']],
    x[['mapAlpha']],
    length(x[['map']]),
    x[['mapMinColorID']],
    x[['mapMaxColorID']]
  ))
  if(isTRUE(x[['mapDataType']] == "continuous")){
    rg <- x[['mapValueRange']]
    cat("  Value Range: ", rg[[1]], " ~ ", rg[[2]], "\n", sep = '')
  }
  invisible(x)
}

