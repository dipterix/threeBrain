
#' @name voxel_colormap
#' @title Creates color maps for volume data (\code{\link{DataCubeGeom2}})
#' @param key non-negative integer vector corresponding to voxel values;
#' its length must exceed 1; see 'Details'
#' @param color characters, corresponding to color strings for each key
#' @param label name for each key, discrete palettes only
#' @param value actual value for each key, continuous palettes only
#' @param alpha whether to respect transparency
#' @param x voxel color map object to be saved
#' @param con,write_to a file path to write results to. The file path can be
#' passed as \code{voxel_colormap} into \code{\link{threejs_brain}}.
#' @param ... used by continuous color maps, passed to
#' \code{\link[grDevices]{colorRampPalette}}. Ignored by others
#'
#' @details
#' Internal 'JavaScript' shader implementation uses integer \code{key} to
#' connect data and color palettes. The keys must be non-negative. These keys
#' should coincide with data values used by \code{\link{DataCubeGeom2}}.
#' Each key stands for a value or label indicated by \code{value} or
#' \code{label}.
#'
#' Zero key is a special color key. If a \code{\link{DataCubeGeom2}} voxel
#' value is 0, then this voxel will be hidden. This is hard-coded into
#' material shader.
#'
#' @return A list of color map information
#'
#' @examples
#'
#' # Creates a symmetric continuous colormap with 3 keys
#' # The color range is -10 to 10
#' # The colors are 'blue','white','red' for these keys
#'
#' pal <- create_voxel_colormap_continuous(
#'   key = c(1,2,3), value = c(-10,0,10),
#'   color = c('blue','white','red'))
#'
#' print( pal )
#'
#' f <- tempfile( fileext = '.json' )
#' save_voxel_colormap( pal, f )
#' cat(readLines(f), sep = '\n')
#'
NULL

#' @rdname voxel_colormap
#' @export
freeserfer_colormap <- function(write_to){
  if(missing(write_to)){
    # for my use
    write_to <- 'inst/palettes/datacube2/FreeSurferColorLUT.json'
    if(!file.exists(write_to)){ write_to <- NULL }
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
  create_voxel_colormap_discrete(
    color = col, label = tbl$Label, key = tbl$ColorID,
    alpha = FALSE, con = write_to
  )
}

#' @rdname voxel_colormap
#' @export
create_voxel_colormap_discrete <- function(
  key, color, label = NULL, alpha = FALSE, con = NULL, ...){
  alpha <- isTRUE(alpha)
  key <- as.integer(key)
  stopifnot(length(key) > 1)
  stopifnot(!any(is.na(key)))
  if(!length(label)){
    label <- key
  }
  if(length(color) != length(key)){
    stop("length of colors does not match with keys")
  }
  rgb <- col2rgb(color, alpha = alpha)
  if(alpha){
    tbl <- data.frame(
      ColorID = key, Label = label, R = rgb[1,],
      G = rgb[2,], B = rgb[3,], A = rgb[4,]
    )
  } else {
    tbl <- data.frame(
      ColorID = key, Label = label, R = rgb[1,],
      G = rgb[2,], B = rgb[3,]
    )
  }
  ss <- jsonlite::toJSON(tbl, dataframe = 'rows')
  ss <- jsonlite::fromJSON(ss, simplifyDataFrame = FALSE)
  names(ss) <- tbl$ColorID
  re <- structure(
    list(ss, alpha, min(tbl$ColorID), max(tbl$ColorID), "discrete", 1.0), names = c(
      'map', 'mapAlpha', 'mapMinColorID',
      'mapMaxColorID', 'mapDataType', 'mapVersion'
    ), class = c("voxel_colormap_discrete", "voxel_colormap"))

  if(length(con)){
    jsonlite::write_json(list(
      "__global_data__.VolumeColorLUT" = unclass(re)
    ), path = con, auto_unbox = TRUE)
    return(invisible(re))
  }
  return(re)
}


#' @rdname voxel_colormap
#' @export
create_voxel_colormap_continuous <- function(
  key, color, value = NULL, alpha = FALSE, con = NULL, ...){
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
  re <- structure(
    list(ss, alpha, min(tbl$ColorID), max(tbl$ColorID),
         range(value, na.rm = TRUE),
         "continuous", 1.0), names = c(
      'map', 'mapAlpha', 'mapMinColorID', 'mapMaxColorID',
      'mapValueRange', 'mapDataType', 'mapVersion'
    ), class = c("voxel_colormap_continuous", "voxel_colormap"))

  if(length(con)){
    jsonlite::write_json(list(
      "__global_data__.VolumeColorLUT" = unclass(re)
    ), path = con, auto_unbox = TRUE)
    return(invisible(re))
  }
  return(re)
}

#' @rdname voxel_colormap
#' @export
save_voxel_colormap <- function(x, con){
  if(!'voxel_colormap' %in% class(x)){
    stop('`x` is not a voxel colormap object')
  }
  jsonlite::write_json(list(
    "__global_data__.VolumeColorLUT" = unclass(x)
  ), path = con, auto_unbox = TRUE)
}


#' @rdname voxel_colormap
#' @export
create_voxel_palette_discrete <- create_voxel_colormap_discrete

#' @rdname voxel_colormap
#' @export
create_voxel_palette_continuous <- create_voxel_colormap_continuous



#' @export
print.voxel_colormap <- function(x, ...){
  cat(sprintf(
    paste(sep = "", c(
      "<Voxel color colormap>",
      "  Version: %.1f",
      "  Type: %s",
      "  Transparent: %s",
      "  # of keys: %d",
      "  Min key: %.0f",
      "  Max key: %.0f\n"
    ), collapse = '\n'),
    x[['mapVersion']],
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
