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

    # Which surfaces (name vector) to search for node list(left = , right = )
    search_geoms = NULL,

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
      re = c(
        super$to_list(),
        list(
          is_electrode = TRUE,
          is_surface_electrode = self$is_surface_electrode,
          use_template = self$use_template,
          search_geoms = self$search_geoms,
          surface_type = self$surface_type,
          hemisphere = self$hemisphere,
          vertex_number = self$vertex_number,
          MNI305_position = self$MNI305_position
        )
      )
    }

  ),
  active = list(
    sub_cortical = function(v){
      cat2('sub_cortical is deprecated, use is_surface_electrode instead.', level = 'WARNING')
      self$is_surface_electrode = !isTRUE(sub_cortical)
    }
  )
)

