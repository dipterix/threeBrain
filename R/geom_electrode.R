# electrodes
ElectrodeGeom <- R6::R6Class(
  classname = 'ElectrodeGeom',
  inherit = SphereGeom,
  public = list(

    # Is subcortical electrode?
    sub_cortical = FALSE,

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

    # ------------ for sub cortical electrodes only ------------

    # Not yet implemented

    # ------------ G ------------
    to_list = function(){
      re = c(
        super$to_list(),
        list(
          is_electrode = TRUE,
          sub_cortical = self$sub_cortical,
          use_template = self$use_template,
          search_geoms = self$search_geoms,
          surface_type = self$surface_type,
          hemisphere = self$hemisphere,
          vertex_number = self$vertex_number
        )
      )
    }

  )
)

