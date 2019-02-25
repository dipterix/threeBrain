#' Create a Threejs Brain
#' @import htmlwidgets
#' @export
threejs_brain <- function(
  ..., width = NULL, height = NULL,
  .list = list()){

  # Create element list
  geoms = c(list(...), .list)

  # TODO: Check elements

  # Generate settings
  settings = list(
    side_camera = FALSE
  )

  htmlwidgets::createWidget(
    name = 'threejs_brain', x = list(
      geoms = geoms,
      settings = settings
    ), width = width, height = height, package = 'threeBrain', sizingPolicy = htmlwidgets::sizingPolicy(
      defaultWidth = '100%',
      defaultHeight = '500px',
      padding = '0px',
      viewer.defaultHeight = '100vh',
      viewer.padding = '0px'
    ))
}



#' @export
threejsBrainOutput <- function(outputId, width = '100%', height = NULL){
  htmlwidgets::shinyWidgetOutput(outputId, "threejs_brain", width, height, package = "threeBrain")
}


#' @export
renderBrain <- function(expr, env = parent.frame(), quoted = FALSE) {
  if (!quoted) { expr <- substitute(expr) }
  htmlwidgets::shinyRenderWidget(expr, threejsBrainOutput, env, quoted = TRUE)
}
