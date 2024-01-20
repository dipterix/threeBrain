# electrodes
ElectrodeGeom <- R6::R6Class(
  classname = 'ElectrodeGeom',
  inherit = SphereGeom,
  public = list(

    # Is subcortical electrode?
    is_surface_electrode = FALSE,

    # Do you want to map to the template electrode? for initialization-only
    use_template = FALSE,

    # ------------ for cortical electrodes only ------------

    # if attached not specified, which hemisphere to look for
    # and which vertex number to check
    surface_type = 'pial',
    hemisphere = NULL,
    vertex_number = -1,
    anatomical_label = NULL,
    MNI305_position = c(0,0,0),
    sphere_position = c(0,0,0),
    number = NULL,

    # case 1: hex color, then will show in all values
    # case 2: list(color, names, [true/false]): colors that will only be activated
    # when names in(true) or not in(false) given names
    fixed_color = NULL,

    # ------------ for sub cortical electrodes only ------------

    # Not yet implemented

    # ------------ G ------------
    to_list = function(){
      fixed_color <- self$fixed_color
      if( !length( fixed_color ) ) {
        fixed_color <- NULL
      } else if(is.list(fixed_color) && length(fixed_color) > 1) {
        if(length(fixed_color) < 3) {
          fixed_color[[3]] <- TRUE
        }
        fixed_color <- list(
          color = dipsaus::col2hexStr(fixed_color[[1]]),
          names = as.character(fixed_color[[2]]),
          inclusive = isTRUE(as.logical(fixed_color[[3]]))
        )
      } else {
        fixed_color <- list(
          color = dipsaus::col2hexStr(fixed_color[[1]]),
          names = character(0L),
          inclusive = FALSE
        )
      }
      re <- c(
        super$to_list(),
        list(
          is_electrode = TRUE,
          is_surface_electrode = self$is_surface_electrode,
          use_template = self$use_template,
          surface_type = self$surface_type,
          hemisphere = self$hemisphere,
          vertex_number = self$vertex_number,
          MNI305_position = self$MNI305_position,
          sphere_position = self$sphere_position,
          sub_cortical = !self$is_surface_electrode,
          search_geoms = self$hemisphere,
          number = c(self$number, NA)[[1]],
          fixed_color = fixed_color
        )
      )
      return( re )
    }

  ),
  active = list(
    sub_cortical = function(v){
      cat2('sub_cortical is deprecated, use is_surface_electrode instead.', level = 'WARNING')
      if(!missing(v)){
        self$is_surface_electrode <- !isTRUE(v)
      }
      return(!self$is_surface_electrode)
    },
    search_geoms = function(v){
      cat2('search_geoms is deprecated, use hemisphere instead.', level = 'WARNING')
      if(!missing(v)){
        self$hemisphere <- v
      }
      return(self$hemisphere)
    }
  )
)

