#' R6 Class - Text Decoration Geometry
#' @author Zhengjia Wang
#' @name TextDecorGeom
NULL

#' @export
TextDecorGeom <- R6::R6Class(
  classname = "TextDecorGeom",
  inherit = AbstractGeom,
  public = list(
    type = "textdecor",
    clickable = FALSE,

    #' @field text Label string rendered in the canvas
    text = "",

    #' @field font_size World-space height of the sprite in mm
    font_size = 5,

    #' @field color CSS color string for the text (e.g. \code{"#ffffff"})
    color = "#ffffff",

    #' @field font_weight CSS font-weight integer (e.g. 400 = normal, 700 = bold)
    font_weight = 400,

    #' @field decor_id Stable ID used to identify this decoration in the viewer.
    #'   Defaults to the geometry \code{name}.
    decor_id = NULL,

    #' @description
    #' Create a new text decoration geometry.
    #'
    #' @param text      Character string to display.
    #' @param position  Numeric vector of length 3: \code{c(x, y, z)} in
    #'   world space.
    #' @param name      Unique geometry name.  If \code{NULL} a random ID is
    #'   generated automatically.
    #' @param decor_id  Stable decoration ID visible to the Shiny proxy.
    #'   Defaults to \code{name}.
    #' @param font_size World-space height of the sprite in mm.  Default
    #'   \code{5}.
    #' @param color     CSS color string.  Default \code{"#ffffff"}.
    #' @param font_weight CSS font-weight integer.  Default \code{400}.
    #' @param layer     Camera layer(s), 0-13 (0 = main camera only,
    #'   1 = all cameras).  Default \code{1}.
    #' @param ...       Additional arguments forwarded to \code{AbstractGeom}.
    initialize = function(
      text = "",
      position = c(0, 0, 0),
      name = NULL,
      decor_id = NULL,
      font_size = 5,
      color = "#ffffff",
      font_weight = 400,
      layer = 1,
      ...
    ) {
      if (is.null(name) || !nzchar(name)) {
        name <- paste0(
          "TextDecor_",
          paste(sample(c(LETTERS, letters, 0:9), 8), collapse = "")
        )
      }
      super$initialize(name = name, position = position, layer = layer, ...)

      self$text <- paste(as.character(text), collapse = "")
      self$font_size <- as.numeric(font_size)[[1]]
      self$color <- as.character(color)[[1]]
      self$font_weight <- as.integer(font_weight)[[1]]
      self$decor_id <- if (!is.null(decor_id) && nzchar(decor_id)) {
        as.character(decor_id)[[1]]
      } else {
        name
      }
      self$clickable <- FALSE
    },

    #' @description Serialize to a list for JSON export.
    to_list = function() {
      c(
        super$to_list(),
        list(
          text = self$text,
          font_size = self$font_size,
          color = self$color,
          font_weight = self$font_weight,
          decor_id = self$decor_id
        )
      )
    }
  )
)
