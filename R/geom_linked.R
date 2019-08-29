# Linked to a freegeom, to be removed
LinkedSphereGeom <- R6::R6Class(
  classname = 'LinkedSphereGeom',
  inherit = SphereGeom,
  public = list(
    linked_geom = NULL,

    vertex_number = 0,

    use_link = FALSE,

    to_list = function(){
      re = super$to_list()
      re$use_link = self$use_link
      re$vertex_number = self$vertex_number
      re$linked_geom = self$linked_geom$name
      re
    }

  )
)

