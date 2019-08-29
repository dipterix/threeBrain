#' @import grDevices
#' @import graphics
#' @import R6
#' @import htmlwidgets
#' @import htmltools
#' @import shiny
#' @import rlang
#' @import future
#' @import stringr
#' @importFrom methods is
#' @importFrom utils download.file
NULL


#' @title Setup Package, Install Environment
#' @param continued logical, there are two phases of setting up environment. You
#' probably need to restart R session after the first phase and continue setting up.
#' @param show_example whether to show example of `N27` subject at the end.
#' @export
brain_setup <- function(continued = FALSE, show_example = TRUE){
  if( !continued ){
    cat2('Step 1: checking python environment', level = 'INFO')
    info = ravepy_info()

    if( any(!info) ){
      cat2('Dependencies missing, checking python version', level = 'INFO')
      re = reticulate::py_config()
      print(re$python_versions)
      if( length(re$python_versions) == 0 ){
        stop('Cannot find Python3 installed. Please download Python3 at\n\n\thttps://www.python.org/downloads/\n\nand then come back.')
      }
      if(!any(
        stringr::str_detect(re$python_versions, 'python3$'),
        stringr::str_detect(re$python_versions, 'py3')
      )){
        stop('Cannot find Python3 installed. Please download Python3 at\n\n\thttps://www.python.org/downloads/\n\nand then come back.')
      }
    }

    # Install RAVEPy
    cat2('Step 2: Check whether RAVEPy is installed.', level = 'INFO')
    installed = ''
    tryCatch({
      installed = ravepy_check(quiet = FALSE)
    }, error = function(e){
      cat2('RAVEPy not found')
    })

    if( !length(installed) || !installed %in% c('conda', 'virtualenv') ){
      cat2('Configure environment RAVEPy.', level = 'INFO')
      ravepy_virtualenv_install()
    }

    cat2('Step 3: Downloading N27 brain from the Internet.', level = 'INFO')
    download_N27()

    # Try to restart
    restarted = FALSE

    if( system.file('', package = 'rstudioapi') != '' ){
      # rstudioapi is installed
      in_rsession = eval(parse(text = 'rstudioapi::isAvailable()'))
      if( in_rsession ){
        # restart
        restarted = TRUE
        eval(parse(text = "rstudioapi::restartSession('threeBrain:::ravepy_info();threeBrain:::cat2(\"Please check if all packages are installed :)\", level = \"INFO\");threeBrain::brain_setup(TRUE, TRUE)')"))
      }
    }

    if( !restarted ){
      cat2('Please manually restart R. Go to "Session" > "Restart R", \nthen, enter \n\tthreeBrain::brain_setup(TRUE, TRUE)', level = 'WARNING')
    }
  }else{
    cat2('Wrapping up installation...', level = 'INFO')
    reticulate::import('nibabel')

    template_dir = getOption('threeBrain.template_dir', '~/rave_data/others/three_brain')
    freesurfer_brain(fs_subject_folder = file.path(template_dir, 'N27'),
                           subject_name = 'N27', additional_surfaces = c(
                             'white', 'smoothwm', 'inflated', 'pial-outer-smoothed'), use_141 = FALSE)
    env = freesurfer_brain(fs_subject_folder = file.path(template_dir, 'N27'),
                           subject_name = 'N27', additional_surfaces = c(
                             'white', 'smoothwm', 'inflated', 'inf_200', 'pial-outer-smoothed'))

    if( show_example ){
      plot(env)
    }

  }


}

