


#' Get current package name
get_package_name <- function(){
  .packageName
}

#' Find path from inst
get_path <- function(..., mustWork = F, is_directory = FALSE){
  project_dir = get_root_dir()
  package = get_package_name()
  path = file.path(project_dir, ...)

  path_bak = path
  if(file.exists(path)){
    return(normalizePath(path))
  }
  path = strsplit(path, '/|\\\\')[[1]]
  for(ii in 1:(length(path)-1)){
    tmp = paste(path[-(1:ii)], collapse = '/')
    tmp = system.file(tmp, package = package, mustWork = F)
    if(tmp != ''){
      return(normalizePath(tmp))
    }
  }

  if(mustWork){
    cat2('Cannot find path: ', path_bak, ' (try to locate it manually)',
                   level = 'ERROR')

    path = select_path(is_directory)

    if(!is.null(path)){
      path = normalizePath(path)
      cat2('Found it! - ', path, level = 'INFO')
      return(path)
    }
  }
}


has_shiny <- function(){
  !is.null(shiny::getDefaultReactiveDomain())
}



# Reload current dev package
reload_this_package <- function(expose, clear_env = FALSE){
  if(missing(expose)){
    local = TRUE
    if(is.function(get0('reload_this_package', envir = globalenv(), inherits = FALSE))){
      local = FALSE
    }
  }else{
    local = !expose
  }

  pkg_name = get_root_dir()
  .fs_dir = get_path('inst/tools')

  if(clear_env){
    rm(list = ls(all.names = T, envir = globalenv()), envir = globalenv())
  }

  # devtools::build(get_root_dir())
  save_all()
  devtools::document(pkg_name)
  devtools::load_all(pkg_name, reset = TRUE, export_all = TRUE)


  if(!local){
    env = globalenv()
  }else{
    env = new.env(parent = globalenv())
  }

  if(.fs_dir != '' && dir.exists(.fs_dir)){

    cat2('Reloading rave devel tools and package', pkg_name)
    .fs = list.files(.fs_dir, pattern = '\\.R$', full.names = T)
    for(.f in .fs){
      env$...tmp = .f
      with(env, {
        source(...tmp, local = T)
      })
    }
  }
  invisible(env)

}

is_directory <- function(path){
  if(!file.exists(path)){
    return(NA)
  }

  finfo = file.info(path)

  finfo[['isdir']]
}
