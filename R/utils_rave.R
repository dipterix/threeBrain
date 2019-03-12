#' Function to load all dev funtions and wrap them within an environment
#' @param expose_functions logical indicating whether to expose all dev functions to the global environment
#' @param reload logical, do you want to fast-reload the package before load the functions?
#' @export
dev_threeBrain <- function(expose_functions = FALSE, reload = TRUE){

  .fs = list.files(system.file('template/inst/tools', package = 'rave'), pattern = '\\.R$', full.names = T)
  .fs = c(.fs, system.file('tools/input_widgets.R', package = 'threeBrain'))

  .fs = .fs[.fs != '']

  rave_dev_load <- function(local = TRUE){
    # Get package name
    if(local){
      env = new.env()
      with(env, {
        for(.f in .fs){
          source(.f, local = T)
        }
      })
      env$.packageName = 'threeBrain'
      return(env)
    }else{
      for(.f in .fs){
        source(.f, local = F)
      }
      env = globalenv()
      env$.packageName = 'threeBrain'
      return(env)
    }

    invisible()
  }
  # Reload first
  if(reload){
    env = rave_dev_load(local = T)
    env$reload_this_package(expose = FALSE, clear_env = FALSE)
  }

  env = rave_dev_load(local = !expose_functions)

  env$load_dev_env()

  return(invisible(env))
}




# Function to run module
debug_module <- function(module_id, interactive = FALSE, check_dependencies = TRUE, force_update_remote = FALSE){

  env = dev_threeBrain(expose_functions = F, reload = TRUE)

  # env$mount_demo_subject()

  # Need to load subject first

  param_env = env$init_module(module_id = module_id)

  runtime_env = new.env(parent = param_env)

  envs = env$get_comp_env(module_id = module_id)
  has_content = env$get_content(content = envs$content, env = envs$tmp_env)
  inputs = lapply(envs$input_env, function(comp){
    if(is(comp, 'comp_input')){
      return(comp$inputId)
    }else{
      NULL
    }
  })
  inputs = unlist(inputs); names(inputs) = NULL

  args = as.list(param_env)[inputs]

  main_quos = env$get_main_function(module_id)

  outputIds = lapply(envs$output_env, function(comp){
    if(is(comp, 'comp_output')){
      return(comp$outputId)
    }else{
      NULL
    }
  })
  outputIds = unlist(outputIds)


  FUN = function(){}

  environment(FUN) = runtime_env

  sel = names(main_quos) %in% c('async')
  normal_quos = main_quos[!sel]
  async_quo = main_quos[sel]
  async = length(async_quo)
  if(async){
    async_quo = async_quo[[1]]
  }else{
    async_quo = {}
  }

  async_vars = main_quos$async_vars

  body(FUN) = rlang::quo_squash(rlang::quo({
    !!!normal_quos

    results = environment()
    ..env = list()

    ..env$results = new.env()

    ..tmp = new.env()

    ..tmp[['..async']] = FALSE

    if(!!async){
      ..tmp[['..async']] = TRUE
      pkgs = stringr::str_match(search(), '^package:(.+)$')[,2]
      pkgs = unique(pkgs[!is.na(pkgs)])
      ..tmp[['..rave_future_obj']] = future::future({
        eval(quote({!!async_quo}))
        ..async_var = !!async_vars
        if(is.null(..async_var)){
          return(environment())
        }else{
          re = sapply(..async_var, get0, simplify = F, USE.NAMES = T)
          return(list2env(re))
        }
      }, packages = pkgs, evaluator = future::multiprocess,
      envir = ..tmp, gc = T)
    }


    ..env$results$get_value = function(key, ifNotFound = NULL){
      get0(key, envir = results, ifnotfound = ifNotFound)
    }
    ..env$results$async_value = function(key){
      if(!..tmp[['..async']]){
        stop('This module has no async part.')
      }else{
        if(future::resolved(..tmp[['..rave_future_obj']])){
          env = ..tmp[['..rave_future_env']]
          if(!is.environment(env)){
            env = ..tmp[['..rave_future_env']] = future::value(..tmp[['..rave_future_obj']])
          }
          get0(key, envir = env)
        }
      }

    }

    ..re = sapply(!!outputIds, function(nm){
      ..f = get0(nm, envir = results, inherits = TRUE, ifnotfound = NULL)
      if(!is.function(..f)){
        return(function(...){
          cat2('Function ', nm, ' is not available.', level = 'ERROR')
        })
      }else{
        fm = formals(..f)

        if(!length(fm)){
          # Case 1: fm is NULL, meaning this is temp function or customized output
          ..f
        }else{
          # Case 2: ..f is a package function
          fm = fm[-1]
          nms = names(fm)
          has_dots = '...' %in% nms
          nms = nms[!nms %in% c('', '...')]

          f = function(...){
            args = sapply(nms, function(..nm..){
              eval(rlang::sym(..nm..))
            }, simplify = F, USE.NAMES = T)
            if(has_dots){
              args = c(list(..env$results), args, list(...))
            }else{
              args = c(list(..env$results), args)
            }

            do.call(..f, args)
          }
          formals(f) = fm
          f
        }
      }

      # eval(call("function", as.pairlist(fm), rhs), env, env)
      # call("function", as.pairlist(fm), rhs)
    }, simplify = F, USE.NAMES = T)

    return(c(..env, ..re))
  }))
  formals(FUN) = args

  return(FUN)
}
