#' @importFrom grDevices palette
#' @importFrom grDevices col2rgb
#' @importFrom grDevices rgb
#' @importFrom graphics plot
#' @importFrom R6 is.R6
#' @importFrom R6 R6Class
#' @importFrom htmlwidgets createWidget
#' @importFrom htmlwidgets sizingPolicy
#' @importFrom htmlwidgets shinyWidgetOutput
#' @importFrom htmlwidgets shinyRenderWidget
#' @importFrom htmlwidgets saveWidget
#' @importFrom shiny getDefaultReactiveDomain
#' @importFrom utils write.csv
#' @importFrom utils read.table
#' @importFrom utils zip
#' @importFrom utils compareVersion
#' @importFrom utils download.file
#' @importFrom utils unzip
#'
#' @importFrom freesurferformats read.fs.curv
#' @importFrom freesurferformats read.fs.annot
#' @importFrom freesurferformats read.fs.label
#' @importFrom freesurferformats read.fs.mgh
#' @importFrom freesurferformats read.fs.morph
#' @importFrom freesurferformats read.fs.surface
#' @importFrom freesurferformats write.fs.surface
#' @importFrom freesurferformats read.fs.volume
#' @importFrom freesurferformats read.fs.weight
#' @importFrom freesurferformats read.fs.transform
#' @importFrom freesurferformats read.nifti1.data
#' @importFrom freesurferformats read.nifti1.header
#' @importFrom freesurferformats read.nifti2.data
#' @importFrom freesurferformats read.nifti2.header
#' @importFrom freesurferformats write.nifti1
#' @importFrom freesurferformats write.nifti2
#'
#' @importFrom png writePNG
#'
#' @importFrom knitr knit_print
NULL

# ----- Reexports ------------------------------------------------------------

#' @export
freesurferformats::read.fs.curv

#' @export
freesurferformats::read.fs.annot

#' @export
freesurferformats::read.fs.label

#' @export
freesurferformats::read.fs.mgh

#' @export
freesurferformats::read.fs.morph

#' @export
freesurferformats::read.fs.surface

#' @export
freesurferformats::write.fs.surface

#' @export
freesurferformats::read.fs.volume

#' @export
freesurferformats::read.fs.weight

#' @export
freesurferformats::read.fs.transform

#' @export
freesurferformats::read.nifti1.data

#' @export
freesurferformats::read.nifti1.header

#' @export
freesurferformats::read.nifti2.data

#' @export
freesurferformats::read.nifti2.header

#' @export
freesurferformats::write.nifti1

#' @export
freesurferformats::write.nifti2


# ----- Globals ------------------------------------------------------------

cache_version <- 0.1

DEFAULT_COLOR_DISCRETE <- c(
  # default RAVE colors
  "#FFA500", "#1874CD", "#006400", "#FF4500", "#A52A2A", "#7D26CD",

  # selected from polychrome
  "#FE00FA", "#16FF32", "#FBE426", "#B00068", "#1CFFCE", "#90AD1C",
  "#2ED9FF", "#DEA0FD", "#F8A19F", "#325A9B", "#C4451C", "#1C8356",
  "#85660D", "#B10DA1", "#1CBE4F", "#F7E1A0", "#C075A6", "#AAF400",
  "#BDCDFF", "#822E1C", "#B5EFB5", "#7ED7D1", "#1C7F93", "#3B00FB"

)

DEFAULT_COLOR_CONTINUOUS <- c(
  "#053061", "#2166ac", "#4393c3", "#92c5de", "#d1e5f0",
  "#ffffff", "#fddbc7", "#f4a582", "#d6604d", "#b2182b", "#67001f"
)

#' @title Setup Package, Install Environment
#' @author Zhengjia Wang
#' @param continued logical, there are two phases of setting up environment. You
#' probably need to restart R session after the first phase and continue setting up.
#' @param show_example whether to show example of `N27` subject at the end.
#' @param ... ignored
#' @export
brain_setup <- function(continued = FALSE, show_example = TRUE, ...){
  cat2('Downloading N27 brain from the Internet.', level = 'INFO')
  download_N27()

  cat2('Wrapping up installation...', level = 'INFO')

  template_dir <- default_template_directory()

  template <- merge_brain(template_subject = "N27", template_dir = template_dir, template_surface_types = c('pial', 'smoothwm'))


  if( show_example ){
    template$template_object$plot()
  }
}

get_os <- function(){
  os <- R.version$os
  if(grepl('^darwin', os, ignore.case = TRUE)){
    return('darwin')
  }
  if(grepl('^linux', os, ignore.case = TRUE)){
    return('linux')
  }
  if(grepl('^solaris', os, ignore.case = TRUE)){
    return('solaris')
  }
  if(grepl('^win', os, ignore.case = TRUE)){
    return('windows')
  }
  if(grepl("^(emscr|wasm)", os, ignore.case = TRUE)) {
    return('emscripten')
  }
  return('unknown')
}

download_file <- function(...) {
  if( identical(get_os(), "emscripten") && !isTRUE(getOption("threeBrain.download.wasm.enabled", FALSE)) ) {
    # WASM and downloading files might not work well :|
    stop("WASM environment detected. Downloading external files is disabled");
  }
  utils::download.file(...)
}

package_installed <- function(pkgs, all = FALSE){
  re <- sapply(pkgs, function(p){
    system.file('', package = p) != ''
  })
  if(all){
    re <- all(re)
  }
  re
}

col2hexStr <- function(col, alpha = NULL, prefix = '#', ...){
  if(is.null(alpha)){
    alpha <- 1
    transparent <- FALSE
  }else{
    transparent <- TRUE
  }
  re <- grDevices::adjustcolor(col, alpha.f = alpha)
  if(!transparent){
    re <- substr(re, start = 1L, stop = 7L)
  }
  gsub('^[^0-9A-F]*', replacement = prefix, x = re)
}

rs_avail <- function(){
  tryCatch({
    spath <- search()
    if('tools:rstudio' %in% spath) {
      rs_ver <- get("RStudio.Version", inherits = TRUE, envir = parent.env(globalenv()))
      if(is.function(rs_ver)) {
        rs_ver()
        return(TRUE)
      }
    }
    return(FALSE)
  }, error = function(e){
    return(FALSE)
  })
}

`%?<-%` <- function(lhs, value){
  env <- parent.frame()
  lhs <- substitute(lhs)

  isnull <- tryCatch({
    is.null(eval(lhs, envir = env))
  }, error = function(e){
    return(TRUE)
  })


  if(isnull){
    eval(as.call(list( quote(`<-`), lhs, value )), envir = env)
  }
}

MNI305_to_MNI152 <- matrix(
  c(c(0.9975, 0.0146, -0.013, 0,
      -0.0073, 1.0009, -0.0093, 0,
      0.0176, -0.0024, 0.9971, 0,
      -0.0429, 1.5496, 1.184, 1)),
  nrow = 4L, byrow = FALSE
)


# FreeSurfer symlinks: e.g. pial.T1 to pial but they are the same thing
surface_alternative_types <- list(
  "pial" = "pial.T1",
  "white.K" = "white.preaparc.K",
  "white.H" = "white.preaparc.H"
)

TRANSFORM_SPACES <- c("tkr", "scanner", "mni152", "mni305")


col2hexStr <- function(col, alpha = NULL, prefix = '#', ...){
  if(is.null(alpha)){
    alpha <- 1
    transparent <- FALSE
  }else{
    transparent <- TRUE
  }
  re <- grDevices::adjustcolor(col, alpha.f = alpha)
  if(!transparent){
    re <- substr(re, start = 1L, stop = 7L)
  }
  gsub('^[^0-9A-F]*', prefix, re)
}
