load_scripts <- function(..., asis = FALSE){
  src = c(...)

  for(s in src){
    cat2('Loading source - ', s, '\n', level = 'INFO', sep = '')
    source(get_path(s), local = F)
  }
}

define_initialization <- function(expr){
  expr = substitute(expr)

  mount_demo_subject()

  eval(expr, envir = parent.frame())
}


define_input <- function(definition, init_args, init_expr){
  definition = substitute(definition)
  init_expr = substitute(init_expr)

  mount_demo_subject()

  parser = rave:::comp_parser()

  comp = parser$parse_quo(rlang::quo(!!definition))

  def_text = deparse(comp$expr)
  def_text = paste(def_text, collapse = '\n  ')
  input_id = comp$inputId

  f = eval(definition[[1]])
  env_name = environmentName(environment(f))
  if(env_name == ''){env_name = '<No Name>'}

  cat2('Input Definition - ', level = 'INFO')
  cat2(' ', def_text, level = 'INFO', pal = list('INFO' = 'dodgerblue3'))

  cat2('Package/Environment - \t', level = 'INFO', end = '')
  cat2(env_name, level = 'INFO', pal = list('INFO' = 'dodgerblue3'))

  val = comp$initial_value




  # Update info
  if(!missing(init_args)){
    cat2('Updating Input Parameter(s) - ', level = 'INFO')

    env = new.env(parent = parent.frame())
    eval(init_expr, envir = env)
    for(arg in init_args){
      v = env[[arg]]
      v = paste(deparse(v), collapse = '\n  ')

      cat2(' ', arg, '- ', level = 'INFO', pal = list('INFO' = 'orangered'), end = '')
      cat2(v, level = 'INFO', pal = list('INFO' = 'dodgerblue3'))
    }

    if('value' %in% init_args){
      val = env[['value']]
    }else if('selected' %in% init_args){
      val = env[['selected']]
    }

  }

  v = paste(deparse(val), collapse = '\n  ')

  cat2('Input Value - \t', level = 'INFO', end = '')
  cat2(input_id, '= ', level = 'INFO', pal = list('INFO' = 'orangered'), end = '')
  cat2(v, level = 'INFO', pal = list('INFO' = 'dodgerblue3'))

  assign(input_id, val, envir = parent.frame())
  invisible(val)
}



define_output <- function(definition, title, width, order){

  assertthat::assert_that(width %in% 1:12, msg = 'Width must be from 1 to 12')

  parser = rave:::comp_parser()
  definition = substitute(definition)

  mount_demo_subject()

  comp = parser$parse_quo(rlang::quo(!!definition))

  f = eval(definition[[1]])
  env_name = environmentName(environment(f))
  if(env_name == ''){env_name = '<No Name>'}

  cat2('Title - \t\t', level = 'INFO', end = '')
  cat2(title, level = 'INFO', pal = list('INFO' = 'dodgerblue3'))

  cat2('Definition - \t\t', level = 'INFO', end = '')
  cat2(paste(deparse(comp$expr), collapse = '\n  '), level = 'INFO', pal = list('INFO' = 'dodgerblue3'))

  cat2('Package/Environment - \t', level = 'INFO', end = '')
  cat2(env_name, level = 'INFO', pal = list('INFO' = 'dodgerblue3'))

  cat2('Width - \t\t', level = 'INFO', end = '')
  cat2(sprintf('%d (%.1f%% of output panel width)', width, width/12*100), level = 'INFO', pal = list('INFO' = 'dodgerblue3'))

  cat2('Order - \t\t', level = 'INFO', end = '')
  cat2(order, level = 'INFO', pal = list('INFO' = 'dodgerblue3'))

  # try to locate function

  output_id = comp$outputId

  pname = get_package_name()
  penv  = loadNamespace(pname)
  f = get0(output_id, envir = penv, ifnotfound = NULL, inherits = FALSE)


  if(is.function(f)){
    if(length(formals(f))){
      cat2('Output function `', output_id, '` found in package ', pname, '.', level = 'INFO', sep = '')
    }else{
      cat2('Output function `', output_id, '` MUST take in at least one argument(s)!', level = 'ERROR', sep = '')
    }
  }else{
    fn_found = FALSE
    if(stringr::str_detect(deparse(definition[[1]]), '(customizedUI)|(uiOutput)|(htmlOutput)')){
      f = get0(output_id, envir = globalenv(), ifnotfound = NULL, inherits = FALSE)
      if(is.function(f) && length(formals(f))){
        cat2('Output function `', output_id, '` found in global environment. (Shiny-RAVE Customized UI)', level = 'INFO', sep = '')
        fn_found = TRUE
      }
    }
    if(!fn_found){
      cat2('Cannot find output function `', output_id, '` in package ', pname, '!', level = 'ERROR', sep = '')
    }
  }

}


rave_checks <- function(...){

  if(is_local_debug()){
    args = list(...)
    tryCatch({
      do.call(rave::rave_checks, args)
    }, error = function(e){
      cat2('The following data will be checked: ', unlist(args), sep = '\n\t', level = 'INFO')
    })
  }else{
    rave::rave_checks(...)
  }
}



