define_input_multiple_electrodes <- function(inputId, label = 'Electrodes'){
  quo = rlang::quo({
    define_input(
      definition = textInput(!!inputId, !!label, value = "", placeholder = '1-5,8,11-20'),
      init_args = c('label', 'value'),
      init_expr = {

        electrodes = preload_info$electrodes

        last_input = cache_input(!!inputId, val = as.character(electrodes[1]))
        e = rave::parse_selections(last_input)
        e = e[e %in% electrodes]
        if(!length(e)){
          e = electrodes[1]
        }
        value = rave::deparse_selections(e)
        label = 'Electrodes (' %&% rave::deparse_selections(electrodes) %&% ')'
      }
    )
  })

  parent_frame = parent.frame()

  rave::eval_dirty(quo, env = parent_frame)
}


define_input_single_electrode <- function(inputId, label = 'Electrode'){
  quo = rlang::quo({
    define_input(
      definition = selectInput(!!inputId, !!label, choices = '', selected = NULL, multiple = FALSE),
      init_args = c('choices', 'selected'),
      init_expr = {
        electrodes = preload_info$electrodes
        choices = as.character(electrodes)

        selected = cache_input(!!inputId, val = electrodes[1])
        selected = as.character(selected)

        if(length(selected) != 1 || !selected %in% choices){
          selected = choices[1]
        }
      }
    )
  })

  parent_frame = parent.frame()

  rave::eval_dirty(quo, env = parent_frame)
}



define_input_frequency <- function(inputId, label = 'Frequency', is_range = TRUE, round = -1, initial_value = NULL){

  if(is_range){
    v = c(1,200)
  }else{
    v = 1
  }

  quo = rlang::quo({
    define_input(
      definition = sliderInput(!!inputId, !!label, min = 1, max = 200, value = !!v, round = !!round),
      init_args = c('min', 'max', 'value'),
      init_expr = {
        freq_range = range(preload_info$frequencies)
        min = floor(freq_range[1])
        max = ceiling(freq_range[2])
        initial_value = !!initial_value
        if(!!is_range){
          initial_value %?<-% c(min, max)
        }else{
          initial_value %?<-% min
        }
        value = cache_input(!!inputId, initial_value)
      }
    )
  })

  parent_frame = parent.frame()

  rave::eval_dirty(quo, env = parent_frame)
}


define_input_time <- function(inputId, label = 'Time Range', is_range = TRUE, round = -2, initial_value = NULL){
  if(is_range){
    v = c(0,1)
  }else{
    v = 0
  }

  quo = rlang::quo({

    define_input(
      definition = sliderInput(!!inputId, !!label, min = 0, max = 1, value = !!v, step = 0.01, round = !!round),
      init_args = c('min', 'max', 'value'),
      init_expr = {
        time_range = range(preload_info$time_points)

        min = min(time_range[1])
        max = max(time_range[2])
        initial_value = !!initial_value

        if(!!is_range){
          initial_value %?<-% c(min, max)
        }else{
          initial_value %?<-% min
        }
        value = cache_input(!!inputId, initial_value)
      }
    )
  })

  parent_frame = parent.frame()

  rave::eval_dirty(quo, env = parent_frame)
}

define_input_condition_groups <- function(inputId, label = 'Group', initial_groups = 1){
  quo = rlang::quo({

    define_input(
      definition = compoundInput(
        inputId = !!inputId, prefix= !!label, inital_ncomp = !!initial_groups, components = {
          textInput('group_name', 'Name', value = '', placeholder = 'Condition Name')
          selectInput('group_conditions', ' ', choices = '', multiple = TRUE)
        }),

      init_args = c('initialize', 'value'),

      init_expr = {
        cond = unique(preload_info$condition)

        initialize = list(
          group_conditions = list(
            choices = cond
          )
        )
        value = cache_input(!!inputId, list(
          list(
            group_name = 'All Conditions',
            group_conditions = list(cond)
          )
        ))
      }
    )
  })

  parent_frame = parent.frame()

  rave::eval_dirty(quo, env = parent_frame)

}
