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
    MNI305_position = c(0,0,0),

    # ------------ for sub cortical electrodes only ------------

    # Not yet implemented

    # ------------ G ------------
    to_list = function(){
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
          sub_cortical = !self$is_surface_electrode,
          search_geoms = self$hemisphere
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

