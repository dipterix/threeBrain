#' R6 Class - Generate Line Segments
#' @author Zhengjia Wang
#' @name LineSegmentsGeom
NULL


#' @export
LineSegmentsGeom <- R6::R6Class(
  classname = 'LineSegmentsGeom',
  inherit = AbstractGeom,
  private = list(
    .dynamic = FALSE
  ),
  public = list(

    type = 'linesegments',

    color = character(0),
    size = numeric(0),
    vertices = NULL,


    initialize = function(name, dynamic = FALSE, ...){
      super$initialize(name, position = c(0, 0, 0), ...)
      private$.dynamic = dynamic
      self$size = 1.0
      self$color = "#000000"
    },

    set_vertices = function(..., .list = list(), append = FALSE) {
      if(self$dynamic) {

        new_pos <- c(list(...), .list)
        new_pos <- lapply(new_pos, function(item) {
          if(length(item) == 3) {
            item_ <- unlist(item)
            if(is.numeric(item_)) {
              return(list(
                position = item_
              ))
            }
          }
          item <- as.list(item)
          subject_code <- item$subject_code
          electrode <- as.integer(item$electrode)
          if(length(subject_code) != 1) {
            stop("Cannot set dynamical line segment positions from electrodes: each position must be either a numeric vector (length=3), or a named list with subject code and electrode number (e.g. list(subject_code=..., electrode=...))")
          }
          list(
            subject_code = subject_code,
            electrode = electrode
          )
        })

        if( append ) {
          self$vertices <- c(self$vertices, new_pos)
        } else {
          self$vertices <- new_pos
        }

      } else {

        new_pos <- unlist(c(..., .list))
        if(!is.numeric(new_pos)) {
          stop("LineSegmentsGeom: static positions must be numeric")
        }
        if(length(new_pos) %% 3 != 0) {
          stop("LineSegmentsGeom: static position vector length must be multiple of 3")
        }
        new_pos <- matrix(new_pos, nrow = 3, byrow = FALSE)

        if( append ) {
          self$vertices <- cbind(self$vertices, new_pos)
        } else {
          self$vertices <- new_pos
        }
      }
    },

    set_color = function(...) {
      new_color = dipsaus::col2hexStr(unlist(c(...)))
      new_color[is.na(new_color)] <- "#000000"
      self$color <- new_color
      invisible()
    },

    set_size = function(...) {
      new_size <- unlist(c(...))
      if(!length(new_size) || any(is.na(new_size) | new_size < 0)) {
        stop("LineSegmentsGeom line size (widths) can either be a number or a numeric vector with positive length with only non-negative values.")
      }
      self$size <- new_size
    },

    to_list = function(){

      nverts <- length(self$vertices)
      if(self$dynamic) {
        verts <- self$vertices
      } else {
        verts <- t(self$vertices)
        nverts <- nverts / 3
      }

      col <- self$color
      siz <- self$size
      if(length(col) > 1) {
        col <- grDevices::colorRampPalette(colors = col)(nverts)
      } else {
        col <- rep(col, nverts)
      }
      if(length(siz) > 1) {
        siz <- approx(siz, n = nverts)$y
      } else {
        siz <- rep(siz, nverts)
      }

      c(
        super$to_list(),
        list(
          dynamic = self$dynamic,
          vertices = verts,
          color = col,
          width = siz
        )
      )
    }
  ),
  active = list(
    dynamic = function() {
      private$.dynamic
    }
  )
)
