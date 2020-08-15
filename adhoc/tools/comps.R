.get_content_r = function(content, keyword = c('Start', 'End'), env = parent.frame(), evaluate = TRUE, chunks = FALSE){
  start_line = which(stringr::str_detect(content, paste0('^# >>>>>>>>>>>> ', keyword[1])))
  end_line = which(stringr::str_detect(content, paste0('^# <<<<<<<<<<<< ', keyword[2])))
  has_inputs = FALSE
  if(length(start_line)){
    start_line = start_line[1]
    end_line = end_line[end_line > start_line]
    if(length(end_line)){
      end_line = end_line[1]
      has_inputs = TRUE
    }
  }
  if(!has_inputs){
    return(FALSE)
  }
  content = content[(start_line+1):end_line]
  content = stringr::str_trim(content)
  content = content[content!='']
  # If sep exists, first one MUST be a regex pattern with "^.....$"
  chunk_names = ''
  auto = TRUE
  async_vars = NULL
  if(chunks){
    sep = '^#{6}\'( @[^#]+|)[\\ #]{0,}$'
    sel = stringr::str_detect(content, sep)

    if(sum(sel)){
      idx = which(sel)
      if(!1 %in% idx){
        idx = c(1, idx + 1)
        content = c('######\' @auto=TRUE', content)
      }
      chunk_names = stringr::str_match(content[idx], sep)[,2]
      chunk_names = stringr::str_remove_all(chunk_names, '[\\ @]')

      # 1. auto = true or false
      auto_chunk = stringr::str_detect(chunk_names, '^auto=')
      if(any(auto_chunk)){
        auto_chunk = stringr::str_to_lower(chunk_names[auto_chunk][1])
        if(stringr::str_detect(auto_chunk, '=false')){
          auto = FALSE
        }
      }

      # 2. find async
      async_chunk = stringr::str_detect(chunk_names, '^async(,|$)')
      if(any(async_chunk)){
        async_idx = which(async_chunk)
        async_idx = tail(async_idx, 1)
        chunk_names[-async_idx] = ''

        async_chunk = chunk_names[async_idx]
        # try to obtain async_vars
        async_vars = stringr::str_match(async_chunk, 'async_vars=(.*)')[,2]
        if(is.na(async_vars)){
          async_vars = NULL
        }else{
          async_vars = unlist(stringr::str_split(async_vars, ','))
        }
        chunk_names[async_idx] = 'async'
      }else{
        chunk_names[] = ''
      }
      fixes = chunk_names
      fixes[-1] = '}; \n{'
      fixes[1] = '{'

      content[idx] = fixes
      content = c(content, '}')
    }else{
      content = c('{', content, '}')
    }

  }

  text = paste(content, collapse = '\n')
  expr = parse(text = text)
  if(evaluate){
    eval(expr, envir = env)
    return(TRUE)
  }else{

    attr(expr, 'chunk_names') = chunk_names
    attr(expr, 'auto') = auto
    attr(expr, 'async_vars') = async_vars

    return(expr)
  }
}

get_content <- function(content, env = parent.frame(), evaluate = TRUE, chunks = FALSE, type = 'R'){
  if(type == 'R'){
    .get_content_r(content = content, keyword = c('Start', 'End'), env = env, evaluate = evaluate, chunks = chunks)
  }
}

get_comp_env <- function(module_id){
  path = get_path('inst', 'modules', module_id, 'comp.R')
  content = readLines(path)
  input_env = new.env(parent = emptyenv())
  pkg_env = loadNamespace(get_package_name())
  define_input <- function(definition, init_args, init_expr){
    definition = substitute(definition)
    definition = match.call(definition = eval(definition[[1]], envir = pkg_env), definition)
    inputId = definition[['inputId']]
    re = list(
      inputId = inputId,
      definition = definition
    )
    class(re) = c('comp_input', 'list')
    if(missing(init_args)){
      input_env[[inputId]] = re
      return(invisible(re))
    }
    init_expr = substitute(init_expr)
    initialization = rlang::quo(local({
      !!!init_expr
      sapply(!!init_args, get, envir = environment(), simplify = F, USE.NAMES = T)
    }))
    re[['initialization']] = initialization

    input_env[[inputId]] = re
    invisible(re)
  }
  mount_demo_subject <- function(...){}


  output_env = new.env(parent = emptyenv())
  define_output <- function(definition, title = '', width = 12L, order = Inf){
    definition = substitute(definition)
    definition = match.call(definition = eval(definition[[1]], envir = pkg_env), definition)
    outputId = definition[['outputId']]
    has_output_id = !is.null(outputId)
    outputId %?<-% definition[['inputId']]
    mod_id = outputId
    # try to get function `outputId` from the package
    has_function = exists(outputId, envir = pkg_env, inherits = FALSE) && is.function(pkg_env[[outputId]])
    if(has_function){
      mod_id = paste0('..', outputId)
    }

    definition[[ifelse(has_output_id, 'outputId', 'inputId')]] = mod_id

    # output width

    width %?<-% 12
    assertthat::assert_that(width %in% 1:12, msg = 'Output width Must be integer from 1 to 12.')
    definition[['width']] = width

    re = list(
      outputId = outputId,
      title = title,
      definition = definition,
      order = order
    )
    class(re) = c('comp_output', 'list')


    output_env[[outputId]] = re
    invisible(re)
  }

  init_env = new.env(parent = emptyenv())
  init_env[['init']] = FALSE
  define_initialization = function(definition){
    definition = substitute(definition)
    init_env[['init']] = definition
  }
  scripts = new.env(parent = emptyenv())
  load_scripts = function(..., asis = FALSE){
    fs = unlist(list(...))
    fs = sapply(fs, get_path)
    scripts[['source']] = fs
    scripts[['asis']] = asis
  }

  tmp_env = new.env()

  return(list(
    content = content,
    input_env = input_env,
    output_env = output_env,
    init_env = init_env,
    script_env = scripts,
    tmp_env = tmp_env
  ))

}


# Function to parse inputs
parse_components <- function(module_id){
  envs = get_comp_env(module_id)
  # Find input init (rave_updates)
  has_content = get_content(content = envs$content, env = envs$tmp_env)

  tmp_env = envs$tmp_env
  input_env = envs$input_env
  output_env = envs$output_env

  # Find inputs
  input_layout = tmp_env[['input_layout']]
  inputs = as.list(input_env)
  defs = lapply(inputs, '[[', 'definition')
  names(defs) = NULL
  if(is.null(input_layout)){
    rave_inputs_quo = rlang::quo(rave_inputs(!!!defs))
  }else{
    rave_inputs_quo = rlang::quo(rave_inputs(!!!defs, .input_panels = !!input_layout))
  }
  # Generate rave_updates
  init_expr = envs$init_env$init
  inits = lapply(inputs, '[[', 'initialization')
  names(inits) = names(inputs)
  rave_update_quo = rlang::quo(rave_updates({eval(!!init_expr)}, !!!inits))

  # outputs
  output_layout = tmp_env[['output_layout']]
  comps = as.list(output_env)
  defs = lapply(comps, '[[', 'definition')
  if(length(defs)){
    titles = sapply(comps, '[[', 'title')
    names(defs) = titles
    order = order(sapply(comps, '[[', 'order'))
    defs = defs[order]

    # generate temp functions
    output_functions = lapply(comps, function(comp){
      rlang::quo(function(...){
        ._current_env = environment()
        ._env = new.env()
        ._env$get_value = function(key, ifNotFound = NULL){
          get0(key, envir = ._current_env, ifnotfound = ifNotFound)
        }

        ._env$async_value = function(key){
          ..param_env = get0('..param_env', envir = ._current_env)
          if(is.environment(..param_env)){
            async_var = get0('async_var', envir = ..param_env)
            if(is.function(async_var)){
              return(async_var(key))
            }
          }

          return(NULL)
        }
        do.call(!!comp$outputId, c(list(._env), list(...)))
      })
    })

    names(output_functions) = paste0('..', sapply(comps, '[[', 'outputId'))

  }else{
    output_functions = NULL
    # need to make sure at least one output
    defs = list('No Output' = quote(textOutput('do_nothing', width = 12L)))
  }

  if(is.null(output_layout)){
    rave_output_quo = rlang::quo(rave_outputs(!!!defs))
  }else{
    rave_output_quo = rlang::quo(rave_outputs(!!!defs, .output_tabsets = !!output_layout))
  }
  rave_output_quo

  return(list(
    rave_inputs_quo = rave_inputs_quo,
    rave_update_quo = rave_update_quo,
    rave_output_quo = rave_output_quo,
    output_functions = output_functions,
    script_env = envs$script_env,
    env = environment()
  ))
}

# parse_components and wrap them in an environment
init_module <- function(module_id, debug = FALSE){
  # Make sure subject is loaded
  has_subject = rave::any_subject_loaded()

  if(!has_subject){
    cat2('Error: No subject found! Please load subject first', level = 'ERROR')
    if(debug){
      mount_demo_subject()
    }
  }

  # Still try to run the rest

  # Find proper environment
  pkg_name = get_package_name()
  # if(paste0('package:', pkg_name) %in% search()){
  #   pkg_env = parent.env(globalenv())
  # }else{
  #   pkg_env = loadNamespace(pkg_name)
  # }
  pkg_env = loadNamespace(pkg_name)


  # get components
  envs = get_comp_env(module_id = module_id)
  has_content = get_content(content = envs$content, env = envs$tmp_env)

  # Initialize env
  wrapper_env = new.env(parent = pkg_env)

  # TODO: need to test variable reference issue
  # Load tools to parse reactive values
  source(get_path('inst/tools/libs.R'), local = wrapper_env)
  source(get_path('inst/tools/funcs_reactives.R'), local = wrapper_env)
  wrapper_env$rave_checks = function(...){}


  param_env = new.env(parent = wrapper_env)

  if(debug){
    # we want to expose functions to global environment if possible
    source(get_path('inst/tools/funcs_reactives.R'), local = param_env)
  }

  for(f in envs$script_env[['source']]){
    source(file = f, local = param_env)
  }

  # initialize global variables
  init_expr = envs$init_env$init
  base::eval(init_expr, envir = param_env)

  # Initialize inputs
  inputs = as.list(envs$input_env)
  lapply(inputs, function(input){
    if(is(input, 'comp_input')){
      inputId = input$inputId
      def = input$definition
      f = def[[1]]
      args = formals(eval(f))
      value = def[['value']]
      value %?<-% def[['selected']]
      value %?<-% args[['value']]
      value %?<-% args[['selected']]

      init = input$initialization

      if(!is.null(init)){
        updates = rave::eval_dirty(init, env = param_env)
        updated_value = updates[['value']]
        updated_value %?<-% updates[['selected']]
        if(!is.null(updated_value)){
          value = updated_value
        }
      }
      value = eval(value)
      param_env[[inputId]] = value

      cat2(inputId, '<- ', paste(capture.output(cat2(value)), collapse = '\n'))

    }
  })

  if(debug){
    list2env(as.list(param_env), globalenv())

    return(invisible(param_env))
  }
  return(param_env)

}


# Function to extract rave_execute
get_main_function <- function(module_id){
  # module_id = 'power_explorer'
  path = get_path('inst', 'modules', module_id, 'main.R')
  content = readLines(path)

  expr = get_content(content = content, evaluate = F, chunks = TRUE)
  main_quos = rlang::quos(!!! as.list(expr))

  names(main_quos) = attr(expr, 'chunk_names')

  main_quos$async_vars = attr(expr, 'async_vars')

  main_quos
}

