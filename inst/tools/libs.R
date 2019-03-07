.packageName = 'threeBrain'

# Functions from third-party packages
read_yaml <- function(...){
  yaml::read_yaml(...)
}


cat2 <- function(...){
  rutabaga::cat2(...)
}

check_installed_packages <- function(...){
  rutabaga::check_installed_packages(...)
}

parse_svec <- function(...){
  rutabaga::parse_svec(...)
}

package_installed <- function(...){
  rutabaga:::package_installed(...)
}


rstudio_viewer <- function(..., default = TRUE){
  if(verify_rstudio_version()){
    rstudioapi::viewer(...)
  }else{
    return(default)
  }
}

#' Get project root dir
get_root_dir <- function(){
  if(verify_rstudio_version()){
    d = rstudioapi::getActiveProject()
  }else{
    d = NULL
  }

  if(length(d) == 1 && grepl(paste0('/', .packageName, '$'), d)){
    # package developer
    return(d)
  }else{
    # package user
    return(system.file('', package = .packageName))
  }
}

verify_rstudio_version <- function(version_needed = '1.2'){

  if(!is.null(shiny::getDefaultReactiveDomain())){
    return(FALSE)
  }

  tryCatch({
    rstudioapi::verifyAvailable(version_needed = version_needed)
    TRUE
  }, error = function(e){
    FALSE
  })
}

select_path <- function(is_directory = TRUE){
  if(verify_rstudio_version()){
    if(is_directory){
      path = rstudioapi::selectDirectory()
    }else{
      path = rstudioapi::selectFile()
    }
    warning("Please fix the path in your script!!!\n\t", path)
    return(path)
  }else{
    stop("Cannot find file path. Please contact package owner to fix it.")
  }
}

#' Get yes or no answer
ask_question <- function(title, message, ok = 'Yes', cancel = 'No',
                         use_console = FALSE, level = 'WARNING'){
  if(!verify_rstudio_version()){
    use_console = TRUE
  }
  if(use_console){
    cat2(title, ' - ', message, ' [yes or no]?', level = level, sep = '')
    v = readline(prompt = 'y or N: ')
    if(!v %in% c('y', 'N')){
      stop('Please enter "y" or "N", case sensitive.')
    }else if (v == 'y'){
      return(TRUE)
    }else{
      return(FALSE)
    }
  }else{
    rstudioapi::showQuestion(
      title = title,
      message = message,
      ok = ok,
      cancel = cancel
    )
  }

}

`%?<-%` <- rave::`%?<-%`


is_local_debug <- function(){
  is.null(shiny::getDefaultReactiveDomain())
}


save_all <- function(){
  if(verify_rstudio_version()){
    if (rstudioapi::hasFun("documentSaveAll")) {
      rstudioapi::documentSaveAll()
    }
  }
}
