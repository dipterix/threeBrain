

# electrodes
ElectrodeGeom <- R6::R6Class(
  classname = 'ElectrodeGeom',
  inherit = AbstractGeom,
  public = list(

    type = 'electrode',

    # Is subcortical electrode?
    is_surface_electrode = FALSE,
    surface_offset = 0.0,

    # Do you want to map to the template electrode? for initialization-only
    use_template = FALSE,

    # ---- Shape-related properties --------------------------------------------
    # e.g. "SphereGeometry"
    subtype = "SphereGeometry",

    # Sphere object radius
    radius = 5.0,

    # CustomGeometry
    prototype = NULL,


    # ------------ for cortical electrodes only ------------

    # if attached not specified, which hemisphere to look for
    # and which vertex number to check
    surface_type = 'pial',
    hemisphere = NULL,
    vertex_number = -1,
    anatomical_label = NULL,

    # a vector of 3x number of contacts
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
    initialize = function(
      name, position = c(0,0,0),
      subtype = c("SphereGeometry", "CustomGeometry"),
      radius = 5, prototype = NULL, ...
    ){
      subtype <- match.arg(subtype)
      super$initialize(name, position = position, ...)

      self$subtype <- subtype

      self$radius <- radius
      if( inherits(prototype, "ElectrodePrototype") ) {
        self$prototype <- prototype
        if(length(self$prototype$name) != 1) {
          self$prototype$name <- rand_string(6)
        }
        group_key <- sprintf("prototype_%s", self$prototype$name)
        if( !group_key %in% names(self$group$group_data) ) {
          self$group$set_group_data(
            group_key,
            self$prototype$as_list(flattern = TRUE)
          )
        }
      }

      # self$set_value(
      #   value = get2('value', other_args, ifnotfound = NULL),
      #   time_stamp = get2('time_stamp', other_args, ifnotfound = NULL),
      #   name = get2('name', other_args, ifnotfound = 'default')
      # )

    },

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

      if(!is.null(self$prototype)) {
        prototype <- self$prototype$name
      } else {
        prototype <- NULL
      }
      re <- c(
        super$to_list(),
        list(
          subtype = self$subtype,
          radius = self$radius,
          prototype_name = prototype,
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
          fixed_color = fixed_color,
          surface_offset = self$surface_offset
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

