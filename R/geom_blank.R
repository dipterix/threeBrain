#' A geometry that renders nothing
#'
#' No-op geometry used when only shared group data needs to be uploaded to
#' the viewer.  The geometry renders nothing and is assigned to an invisible
#' camera layer (31).
#' @author Zhengjia Wang
#' @export
BlankGeom <- R6::R6Class(
  classname = "BlankGeom",
  inherit = AbstractGeom,
  public = list(
    type = "blank",
    #' @field value Reserved; always \code{NULL} for blank geometry.
    value = NULL,
    clickable = FALSE,
    #' @description No-op value setter; blank geometry accepts no data.
    #' @param ... Ignored.
    set_value = function(...) {
    },

    #' @description Create a new blank geometry.
    #' @param group \code{GeomGroup} to attach this geometry to.
    #' @param name Unique character name.  Defaults to a random 16-character
    #'   alphanumeric string.
    #' @param ... Additional arguments forwarded to \code{AbstractGeom}.
    initialize = function(group, name = paste(sample(c(LETTERS, letters, 0:9), 16), collapse = ""), ...) {
      super$initialize(name = name, ...)
      self$layer <- 31
      self$clickable <- FALSE
      self$group <- group
    },
    #' @description Serialize the blank geometry to a named list for JSON export.
    to_list = function() {
      super$to_list()
    }
  )
)
