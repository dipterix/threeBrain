`$<-.dev_ReactiveInput` = `[[<-.dev_ReactiveInput` = function(x, i, value){
  if(x$..warn){
    assign('..warn', FALSE, envir = x)
    cat2('$<-, or [[<- type of assignment only works for debug purpose.\n  (This warning only display once for this object)', level = 'WARNING')
  }

  assign(i, value, envir = x)
  invisible(x)
}

print.dev_ReactiveInput <- function(x){
  cat2('<Reactive Input> (Read-only)', level = 'INFO')
  for(k in ls(x, all.names = FALSE)){
    cat2(' ', k, '= ', level = 'INFO', pal = list('INFO' = 'orangered'), end = '')
    s = paste(deparse(x[[k]]), sep = '\n\t')
    cat2(s, level = 'INFO', pal = list('INFO' = 'dodgerblue3'), sep = '\n\t')
  }
  invisible(x)
}

getDefaultReactiveInput <- function(){
  if(is_local_debug()){
    env = new.env(parent = emptyenv())
    env$..warn = TRUE
    class(env) = c('dev_ReactiveInput', 'environment')
    env
  }else{
    f = get('getDefaultReactiveInput', parent.env(parent.env(..param_env)))
    f()
  }

}


getDefaultReactiveDomain <- function(){
  if(is_local_debug()){
    rave:::fake_session()
  }else{
    f = get('getDefaultReactiveDomain', parent.env(parent.env(..param_env)))
    f()
  }
}


`$<-.dev_ReactiveOutput` = `[[<-.dev_ReactiveOutput` = function(x, i, value){
  value = substitute(value)
  assign(i, value, envir = x)
  invisible(x)
}

print.dev_ReactiveOutput <- function(x){
  cat2('<Reactive Output> (Write-only)', level = 'INFO')
  for(k in ls(x, all.names = FALSE)){
    cat2(' ', k, '= ', level = 'INFO', pal = list('INFO' = 'orangered'), end = '')
    s = paste(deparse(x[[k]]), sep = '\n\t')
    cat2(s, level = 'INFO', pal = list('INFO' = 'dodgerblue3'), sep = '\n\t')
  }
  invisible(x)
}

getDefaultReactiveOutput <- function(){
  if(is_local_debug()){
    env = new.env(parent = emptyenv())
    env$..warn = TRUE
    class(env) = c('dev_ReactiveOutput', 'environment')
    env
  }else{
    f = get('getDefaultReactiveOutput', parent.env(parent.env(..param_env)))
    f()
  }
}

print.dev_ReactiveValues <- function(x){
  cat2('<Reactive Values> (Write-only)', level = 'INFO')
  for(k in ls(x, all.names = FALSE)){
    cat2(' ', k, '= ', level = 'INFO', pal = list('INFO' = 'orangered'), end = '')
    s = paste(deparse(x[[k]]), sep = '\n\t')
    cat2(s, level = 'INFO', pal = list('INFO' = 'dodgerblue3'), sep = '\n\t')
  }
  invisible(x)
}


reactiveValues <- function(...){
  if(is_local_debug()){
    env = new.env(parent = emptyenv())
    list2env(list(...), env)

    class(env) = c('dev_ReactiveValues', 'environment')
    env
  }else{
    shiny::reactiveValues(...)
  }
}






