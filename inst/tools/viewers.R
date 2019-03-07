to_module <- function(module_id, sidebar_width = 3){
  quos = parse_components(module_id)

  tempdir = file.path(tempdir(), 'rave_modules', module_id)
  dir.create(tempdir, showWarnings = F, recursive = T)
  tmpfile = tempfile(pattern = module_id, tmpdir = tempdir)

  asis = quos$script_env$asis
  asis %?<-% FALSE

  src = sapply(quos$script_env$source, function(f){

    if(f != '' && file.exists(f)){

      if(!asis){
        # This file is valid R script,
        fname = unlist(stringr::str_split(stringr::str_trim(f), '/|\\\\'))
        fname = tail(fname, 1)

        fpath = file.path(tempdir, fname)
        file.copy(f, fpath, overwrite = TRUE)

        cat2("Copying ", f, ' >> ', fpath)

        # if the file ends with .R, source it
        if(stringr::str_detect(fname, pattern = '\\.[Rr]$')){
          quo = rlang::quo(source(!!fname, local = TRUE))
          expr = paste(deparse(rlang::quo_squash(quo)), collapse = '\n')
          return(expr)
        }
      }else{
        if(stringr::str_detect(f, pattern = '\\.[Rr]$')){
          quo = rlang::quo(source(!!f, local = TRUE))
          expr = paste(deparse(rlang::quo_squash(quo)), collapse = '\n')
          return(expr)
        }
      }


    }else{
      cat2("Cannot find path to ", f, level = 'ERROR')
    }
    return(NULL)
  })
  names(src) = NULL


  pkg_name = get_package_name()

  exec = rlang::quo(rave_execute(!!!get_main_function(module_id)))

  funs = sapply(names(quos$output_functions), function(nm){
    f = quos$output_functions[[nm]]

    s = paste(deparse(rlang::quo_squash(f)), collapse = '\n')
    s = paste(nm, '<-', s)
    s
  }, simplify = T, USE.NAMES = F)

  s = unlist(c(
    src,
    deparse(rlang::quo_squash(quos$rave_inputs_quo)),
    deparse(rlang::quo_squash(quos$rave_update_quo)),
    deparse(rlang::quo_squash(quos$rave_output_quo)),
    deparse(rlang::quo_squash(exec)),
    funs
  ))

  writeLines(s, tmpfile)
  m = rave::ModuleEnvir$new(module_id = module_id, label_name = get_module_label(module_id),
                            script_path = tmpfile, parent_env = loadNamespace(pkg_name))
  m$sidebar_width = sidebar_width
  m
}

view_layout <- function(module_id, sidebar_width = 5, launch.browser = rstudio_viewer){
  # Always reload the package to the newest status and preview
  env = reload_this_package()

  m = env$to_module(module_id = module_id, sidebar_width = sidebar_width)
  rave::init_app(m, launch.browser = launch.browser, disable_sidebar = T, simplify_header = T)

}
