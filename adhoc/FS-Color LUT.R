# generate freesurfer color LUT
# file <- '/Applications/freesurfer/FreeSurferColorLUT.txt'
file <- 'https://surfer.nmr.mgh.harvard.edu/fswiki/FsTutorial/AnatomicalROI/FreeSurferColorLUT?action=raw'
s <- readLines(file)[-c(1:6, 1439:1441)]
s <- s[!stringr::str_detect(s, '^[ ]{0,}#')]
s <- stringr::str_trim(s)
s <- s[s!='']
tbl <- data.table::fread(paste(s, collapse = '\n'))
names(tbl) <- c('ColorID', 'Label', 'R', 'G', 'B', 'A')

tbl <- tbl[,c('ColorID', 'Label', 'R', 'G', 'B')]

ss <- jsonlite::toJSON(tbl, dataframe = 'rows')
ss <- jsonlite::fromJSON(ss, simplifyDataFrame = FALSE)
names(ss) <- tbl$ColorID
# ss <- jsonlite::toJSON(ss, auto_unbox = TRUE)

jsonlite::write_json(structure(
  list(ss, max(tbl$ColorID), "discrete"), names = c(
    '__global_data__VolumeColorLUT',
    '__global_data__VolumeColorLUTMaxColorID',
    '__global_data__VolumeColorLUTDataType'
  )),
  'inst/palettes/datacube2/FreeSurferColorLUT.json', auto_unbox = TRUE)

freeserfer_palette <- function(write_to = NULL){
  file <- 'https://surfer.nmr.mgh.harvard.edu/fswiki/FsTutorial/AnatomicalROI/FreeSurferColorLUT?action=raw'
  s <- readLines(file)[-c(1:6, 1439:1441)]
  s <- s[!stringr::str_detect(s, '^[ ]{0,}#')]
  s <- stringr::str_trim(s)
  s <- s[s!='']
  tbl <- data.table::fread(paste(s, collapse = '\n'))
  names(tbl) <- c('ColorID', 'Label', 'R', 'G', 'B', 'A')
  col <- rgb(tbl$R, tbl$G, tbl$B, maxColorValue = 255)
  re <- create_voxel_palette_discrete(
    color = col, label = tbl$Label, key = tbl$ColorID,
    alpha = FALSE, con = write_to
  )
}

create_voxel_palette_discrete <- function(
  key, color, label = NULL, alpha = FALSE, con = NULL){
  if(!length(label)){
    label <- key
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
    ), class = c("voxel_color_discrete", "voxel_color"))

  if(length(con)){
    sonlite::write_json(unclass(re), conauto_unbox = TRUE)
  }
  invisible(re)
}

print.voxel_color <- function(x, ...){
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
  invisible(x)
}






