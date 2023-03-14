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
#' @importFrom freesurferformats read.fs.volume
#' @importFrom freesurferformats read.fs.weight
#' @importFrom freesurferformats read.fs.transform
#' @importFrom freesurferformats read.nifti1.data
#' @importFrom freesurferformats read.nifti1.header
#' @importFrom freesurferformats read.nifti2.data
#' @importFrom freesurferformats read.nifti2.header
#' @importFrom freesurferformats write.nifti1
#' @importFrom freesurferformats write.nifti2
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

#' @title Setup Package, Install Environment
#' @author Zhengjia Wang
#' @param continued logical, there are two phases of setting up environment. You
#' probably need to restart R session after the first phase and continue setting up.
#' @param show_example whether to show example of `N27` subject at the end.
#' @param ... ignored
#' @export
brain_setup <- function(continued = FALSE, show_example = TRUE, ...){
  use_python <- FALSE
  try_conda <- FALSE
  if( use_python && !continued ){
    # cat2('Step 1: checking python environment', level = 'INFO')
    # info = ravepy_info()
    #
    # if( any(!info) ){
    #   cat2('Dependencies missing, checking python version', level = 'INFO')
    #   re = reticulate::py_config()
    #   print(re$python_versions)
    #   if( length(re$python_versions) == 0 ){
    #     stop('Cannot find Python3 installed. Please download Python3 at\n\n\thttps://www.python.org/downloads/\n\nand then come back.')
    #   }
    #   if(!any(
    #     stringr::str_detect(re$python_versions, 'python3$'),
    #     stringr::str_detect(re$python_versions, 'py3')
    #   )){
    #     stop('Cannot find Python3 installed. Please download Python3 at\n\n\thttps://www.python.org/downloads/\n\nand then come back.')
    #   }
    # }

    # # Install RAVEPy
    # cat2('Step 2: Check whether RAVEPy is installed.', level = 'INFO')
    # installed = ''
    # tryCatch({
    #   installed = ravepy_check(quiet = FALSE)
    # }, error = function(e){
    #   cat2('RAVEPy not found')
    # })
    #
    # if( !length(installed) || !installed %in% c('conda', 'virtualenv') ){
    #   cat2('Configure environment RAVEPy.', level = 'INFO')
    #   if( try_conda && length( ravepy_find_conda_path(add_to_path = FALSE) ) ){
    #     ravepy_conda_install()
    #   }else{
    #     ravepy_virtualenv_install()
    #   }
    # }
    #
    # # Try to restart
    # restarted = FALSE
    #
    # if( system.file('', package = 'rstudioapi') != '' ){
    #   # rstudioapi is installed
    #   in_rsession = eval(parse(text = 'rstudioapi::isAvailable()'))
    #   if( in_rsession ){
    #     # restart
    #     restarted = TRUE
    #     eval(parse(text = "rstudioapi::restartSession('threeBrain:::ravepy_info();threeBrain:::cat2(\"Please check if all packages are installed :)\", level = \"INFO\");threeBrain::brain_setup(TRUE, TRUE)')"))
    #   }
    # }

    # if( !restarted ){
    #   cat2('Please manually restart R. Go to "Session" > "Restart R", \nthen, enter \n\tthreeBrain::brain_setup(TRUE, TRUE)', level = 'WARNING')
    # }
  }else{

    cat2('Downloading N27 brain from the Internet.', level = 'INFO')
    download_N27()

    cat2('Wrapping up installation...', level = 'INFO')

    template_dir <- default_template_directory()
    import_from_freesurfer(fs_path = file.path(template_dir, 'N27'), subject_name = 'N27')


    if( show_example ){
      env <- freesurfer_brain2(fs_subject_folder = file.path(template_dir, 'N27'),
                              subject_name = 'N27', surface_types = c('pial', 'smoothwm'))
      plot(env)
    }

  }


}

get_os <- function(){
  os <- R.version$os
  if(stringr::str_detect(os, '^darwin')){
    return('darwin')
  }
  if(stringr::str_detect(os, '^linux')){
    return('linux')
  }
  if(stringr::str_detect(os, '^solaris')){
    return('solaris')
  }
  if(stringr::str_detect(os, '^win')){
    return('windows')
  }
  return('unknown')
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
