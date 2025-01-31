KeyFrame <- R6::R6Class(
  classname = 'brain-animation-keyframe',
  portable = TRUE,
  cloneable = TRUE,
  private = list(
    .time = NULL,
    .values = NULL,
    .dtype = 'continuous'
  ),
  public = list(
    name = '',

    cached = FALSE,

    # This keyframe controls material color
    target = '.material.color',

    initialize = function(name, time, value, dtype = 'continuous', target = '.material.color', ...){
      value <- unname(value)

      if( dtype == 'continuous' ){
        private$.dtype <- 'continuous'
        if( !is.list(value) ) {
          value <- as.numeric(value)
        }
        sel <- !is.na(value)
        time <- time[ sel ]
        value <- value[ sel ]
      }else{
        # factor?
        private$.dtype <- 'discrete'

        # If is factor, then do not remake factor as we need to keep the levels
        if( is.list(value) ) {
          if(length(value)) {

            # get levels
            lv <- lapply(unname(value), function(v) {
              if(is.factor(v)) {
                return(levels(v))
              }
              unique(as.character(unlist(v)))
            })
            lv <- sort(unique(unlist(lv)))
            lv <- lv[!is.na(lv)]

            value <- lapply(unname(value), function(v) {
              factor(as.character(v), levels = lv)
            })
          }
        } else {
          if(!is.factor(value)){
            value <- factor(value, levels = as.character(sort(unique(value), decreasing = FALSE)))
          }
        }
      }

      stopifnot2(length(value), msg = 'Value length must be greater than 0')
      stopifnot2(length(value) == length(time), msg = 'Value, time lengths must equal')
      stopifnot2(is.numeric(time), msg = 'Time must be numerical')

      self$name <- name
      self$target <- target

      private$.time <- time
      private$.values <- value
    },

    to_list = function(){
      list(
        name = self$name,
        time = private$.time,
        value = private$.values,
        data_type = private$.dtype,
        target = self$target,
        cached = self$cached
      )
    },

    use_cache = function(path, name, ...){
      if(self$cached){ return() }
      self$cached <- TRUE

      json_cache(path = path, data = structure(list(self$to_list()), names = name), ...)
      if(self$is_continuous){
        private$.values <- range(unlist(private$.values))
      }else{
        private$.values <- unique(private$.values)
      }

    }
  ),
  active = list(
    is_continuous = function(){ private$.dtype == 'continuous' },
    time_range = function(){
      time <- unlist(private$.time)
      time <- time[is.finite(time)]
      if(length(time)) {
        rg <- range(time, na.rm = TRUE)
      } else {
        rg <- c(0, 0)
      }
      if(rg[2] == rg[1]) {
        rg[2] <- rg[1] + 1
      } else {
        nframes <- length(private$.values)
        if(nframes <= 2){ nframes <- 2 }
        rg[2] <- (rg[2] - rg[1]) * nframes / (nframes - 1) + rg[1]
      }
      return(rg)
    },
    value_range = function(){
      if(self$is_continuous) {
        values <- unlist(private$.values)
        values <- values[is.finite(values)]
        if(length(values)) {
          return(range(values, na.rm = TRUE))
        } else {
          # NA or Inf
          return(c(0, 0))
        }
      } else{
        NULL
      }
    },
    value_names = function(){
      if( self$is_continuous ) { return(NULL) }
      if(is.list(private$.values) && length(private$.values) >= 1) {
        return( levels(private$.values[[1]]) )
      }
      return(levels(private$.values))
    }
  )
)

KeyFrame2 <- R6::R6Class(
  inherit = KeyFrame,
  classname = 'brain-animation-vertex-color',
  portable = TRUE,
  cloneable = TRUE,
  private = list(
    .time = NULL,
    .values = NULL,
    .dtype = 'continuous'
  ),
  public = list(

    # This keyframe controls material color
    target = '.geometry.attributes.color.array',

    initialize = function(name, time, value, dtype = 'continuous', target = '.material.color', ...){
      if( dtype == 'continuous' ){
        private$.dtype <- 'continuous'
        # Please make sure vakue and time are valid, no checks here
        value <- as.numeric(value)
        # sel = !is.na(value)
        # time = time[ sel ]
        # value = value[ sel ]
      }else{
        # factor?
        private$.dtype <- 'discrete'

        # If is factor, then do not remake factor as we need to keep the levels
        if(!is.factor(value)){
          value <- factor(value, ...)
        }
      }

      stopifnot2(length(value), msg = 'Value length must be greater than 0')
      stopifnot2(nrow(value) == length(time), msg = 'nrow(Value), length(time) must equal')
      stopifnot2(is.numeric(time), msg = 'Time must be numerical')

      self$name <- name
      self$target <- target

      private$.time <- time
      private$.values <- value
    }

  )
)


ColorMap <- R6::R6Class(
  classname = 'brain-animation-colormap',
  portable = TRUE,
  cloneable = TRUE,
  public = list(
    name = '',
    alias = character(0),

    value_type = "continuous",
    time_range = c(0,1),
    value_range = c(-1,1),

    # Theoretical range, like p-value, cannot goes below 0 nor beyond 1, hence (0,1)
    hard_range = numeric(0),
    value_names = NULL,
    n_colors = 64,
    colors = DEFAULT_COLOR_CONTINUOUS,

    initialize = function(name, ..., .list = NULL, symmetric = NULL, alias = NULL){

      self$name <- name
      if(length(alias) == 1){
        self$alias <- alias
      }

      geoms <- c(list(...), .list)

      # get all animation names
      # animation_types = unlist( lapply(geoms, function(g){ g$animation_types }) )
      # animation_types = unique(animation_types)

      # get time range
      time_range <- unlist(lapply(geoms, function(g){
        g$animation_time_range( name )
      }))
      if(!length( time_range )){ time_range <- c(0,1) }
      if( length( time_range ) == 1 ){ time_range <- c(time_range-1,time_range) }
      self$time_range <- range(time_range)

      # get value range
      value_range <- unlist(lapply(geoms, function(g){
        g$animation_value_range( name )
      }))
      if(!length( value_range )){ value_range <- c(0,1) }
      if( length( value_range ) == 1 ){ value_range <- c(value_range-1,value_range) }
      value_range <- range(value_range)
      if(length(symmetric) == 1){
        value_range <- max(abs( value_range - symmetric )) * c(-1, 1) + symmetric
      }
      self$value_range <- value_range

      # get value names
      value_names <- unlist(lapply(geoms, function(g){
        g$animation_value_names( name )
      }))
      self$value_names <- unique( value_names )

      if( length(self$value_names) ){
        self$value_type <- 'discrete'
        self$colors <- DEFAULT_COLOR_DISCRETE
      }else{
        self$value_type <- 'continuous'
        self$colors <- DEFAULT_COLOR_CONTINUOUS
      }

      self$set_colors()
    },

    set_colors = function( colors = NULL ){
      if( !length(colors) ){
        colors <- self$colors
      }

      if(self$value_type == 'continuous'){
        self$colors <- colors
        self$n_colors <- max(64, self$n_colors)
      }else{
        # discrete, ncolors must equals to number of colors must equal to value_names
        self$n_colors <- length( self$value_names )
        if( self$n_colors > length(colors) ){
          colors <- rep(colors, ceiling(self$n_colors / length(colors)))
        }
        self$colors <- colors[seq_len(self$n_colors)]
      }
    },

    to_list = function(){

      # Threejs Lut works best with 2^x number of colors
      ncols <- max(16 , 2^ceiling(log2(self$n_colors)) )
      if( self$value_type == 'continuous' ){
        colors <- grDevices::colorRampPalette(self$colors)(ncols)
        value_range <- self$value_range
        if(!all(is.finite(value_range))) {
          value_range <- c(-1, 1)
        }
        color_keys <- seq( value_range[1], value_range[2], length.out = ncols )
      }else{
        colors <- col2hexStr(self$colors)
        if(length(colors) < ncols) {
          colors <- c(colors, rep("#000000", ncols - length(colors)))
        }
        color_keys <- seq_len( ncols )
      }

      list(
        name = self$name,
        time_range = self$time_range,
        value_range = self$value_range,
        value_names = self$value_names,
        value_type = self$value_type,
        color_keys = color_keys,
        # color_hex = colors,
        color_vals = gsub( '^#', '0x', colors ),
        # Mainly used to indicate how many levels
        color_levels = self$n_colors,
        hard_range = self$hard_range,
        alias = self$alias
      )
    }
  )
)




