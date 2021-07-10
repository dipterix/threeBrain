
#' @name voxel_palette
#' @title Creates color palettes for volume data (\code{\link{DataCubeGeom2}})
#' @param key integer vector corresponding to voxel values. If the actual
#' values are not integer, please also assign \code{value}
#' @param color characters, corresponding to color strings for each key
#' @param label name for each key, discrete palettes only
#' @param value actual value for each key, continuous palettes only
#' @param alpha whether to respect transparency
#' @param con,write_to a file path to write results to. The file path can be
#' passed as \code{voxel_palette} into \code{\link{threejs_brain}}.
#' @param ... ignored
#' @return A list of palette information
#'
#' @examples
#'
#' # Creates a symmetric continuous palette with 3 keys
#' # The color range is -10 to 10
#' # The colors are 'blue','white','red' for these keys
#'
#' create_voxel_palette_continuous(
#'   key = c(1,2,3), value = c(-10,0,10),
#'   color = c('blue','white','red'))
#'
NULL

#' @rdname voxel_palette
#' @export
freeserfer_palette <- function(write_to = NULL){
  file <- 'https://surfer.nmr.mgh.harvard.edu/fswiki/FsTutorial/AnatomicalROI/FreeSurferColorLUT?action=raw'
  s <- readLines(file)[-c(1:6, 1439:1441)]
  s <- s[!stringr::str_detect(s, '^[ ]{0,}#')]
  s <- stringr::str_trim(s)
  s <- s[s!='']
  tbl <- data.table::fread(paste(s, collapse = '\n'))
  names(tbl) <- c('ColorID', 'Label', 'R', 'G', 'B', 'A')
  col <- rgb(tbl$R, tbl$G, tbl$B, maxColorValue = 255)
  create_voxel_palette_discrete(
    color = col, label = tbl$Label, key = tbl$ColorID,
    alpha = FALSE, con = write_to
  )
}

#' @rdname voxel_palette
#' @export
create_voxel_palette_discrete <- function(
  key, color, label = NULL, alpha = FALSE, con = NULL, ...){
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
    list(ss, min(tbl$ColorID), max(tbl$ColorID), "discrete", 1.0), names = c(
      '__global_data__VolumeColorLUT',
      '__global_data__VolumeColorLUTMinColorID',
      '__global_data__VolumeColorLUTMaxColorID',
      '__global_data__VolumeColorLUTDataType',
      '__global_data__VolumeColorLUTVersion'
    ), class = c("voxel_palette_discrete", "voxel_palette"))

  if(length(con)){
    jsonlite::write_json(unclass(re), path = con, conauto_unbox = TRUE)
    return(invisible(re))
  }
  return(re)
}

#' @rdname voxel_palette
#' @export
create_voxel_palette_continuous <- function(
  key, color, value = NULL, alpha = FALSE, con = NULL, ...){
  if(!length(value)){
    value <- key
  }
  if(length(color) != length(key)){
    stop("length of colors does not match with keys")
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
    list(ss, min(tbl$ColorID), max(tbl$ColorID),
         range(value, na.rm = TRUE),
         "continuous", 1.0), names = c(
      '__global_data__VolumeColorLUT',
      '__global_data__VolumeColorLUTMinColorID',
      '__global_data__VolumeColorLUTMaxColorID',
      '__global_data__VolumeColorLUTValueRange',
      '__global_data__VolumeColorLUTDataType',
      '__global_data__VolumeColorLUTVersion'
    ), class = c("voxel_palette_continuous", "voxel_palette"))

  if(length(con)){
    jsonlite::write_json(unclass(re), path = con, conauto_unbox = TRUE)
    return(invisible(re))
  }
  return(re)
}


#' @export
print.voxel_palette <- function(x, ...){
  cat(sprintf(
    paste(sep = "", c(
      "<Voxel color palette>",
      "  Version: %.1f",
      "  Type: %s",
      "  # of keys: %d",
      "  Min key: %.0f",
      "  Max key: %.0f\n"
    ), collapse = '\n'),
    x[['__global_data__VolumeColorLUTVersion']],
    x[['__global_data__VolumeColorLUTDataType']],
    length(x[['__global_data__VolumeColorLUT']]),
    x[['__global_data__VolumeColorLUTMinColorID']],
    x[['__global_data__VolumeColorLUTMaxColorID']]
  ))
  if(isTRUE(x[['__global_data__VolumeColorLUTDataType']] == "continuous")){
    rg <- x[['__global_data__VolumeColorLUTValueRange']]
    cat("  Value Range: ", rg[[1]], " ~ ", rg[[2]], "\n", sep = '')
  }
  invisible(x)
}
