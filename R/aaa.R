#' @importFrom grDevices palette
#' @importFrom graphics plot
#' @importFrom R6 is.R6
#' @importFrom R6 R6Class
#' @importFrom htmlwidgets createWidget
#' @importFrom htmlwidgets sizingPolicy
#' @importFrom htmlwidgets shinyWidgetOutput
#' @importFrom htmlwidgets shinyRenderWidget
#' @importFrom htmlwidgets saveWidget
#' @importFrom htmltools htmlDependency
#' @importFrom shiny getDefaultReactiveDomain
#' @importFrom utils write.csv
#' @importFrom utils zip
#' @importFrom utils compareVersion
#' @importFrom utils download.file
#' @importFrom utils unzip
NULL

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

    template_dir <- getOption('threeBrain.template_dir', '~/rave_data/others/three_brain')
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
