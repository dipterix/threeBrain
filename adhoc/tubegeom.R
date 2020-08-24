yab <- rave::rave_brain2('demo/YAB')

yab$electrodes$set_values(data.frame(
  Project = 'demo', subject = 'YAB',
  Electrode = c(14,14),
  Time = c(0.1,0.5),
  Value = c(-1,3)
))

electrodes = c(13:16, 24)
connect_electrodes <- function( electrodes, ..., margin = c(1,2) ){


  if(length(electrodes) < 2){ return() }
  if( is.matrix(electrodes) ){
    re <- NULL
    for(m in margin){
      re <- c(re, apply(electrodes, m, Recall))
    }
    return(unlist(re))
  }
  electrodes <- as.integer(electrodes)
  re <- lapply(seq_len(length(electrodes) - 1), function(i){
    e1 <- electrodes[[i]]
    e2 <- electrodes[[i + 1]]

    e1obj <- self$electrodes$objects[[e1]]
    e2obj <- self$electrodes$objects[[e2]]

    if(inherits(e1obj, 'AbstractGeom') && inherits(e2obj, 'AbstractGeom')){
      tube <- TubeGeom$new(
        name = sprintf('Connect Electrode %d-%d (%s)', e1, e2, self$subject_code),
        ..., group = self$electrodes$group)
      tube$set_start( e1obj )
      tube$set_end( e2obj )
      tube$subject_code = self$subject_code

      return(tube)
    }

    return()

  })
  unlist(re)
}
self = yab

geoms <- yab$get_geometries(atlases = FALSE)

tubes <- connect_electrodes(electrodes, layer = 8)

threeBrain::threejs_brain(.list=c(
  tubes, geoms
), debug = TRUE, control_presets = c(
  'subject2', 'surface_type2', 'hemisphere_material',
  'map_template', 'electrodes', 'atlas', 'animation', 'display_highlights'

  ))




