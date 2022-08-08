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
    vertices = NULL,

    initialize = function(name, dynamic = FALSE, ...){
      super$initialize(name, position = c(0, 0, 0), ...)
      private$.dynamic = dynamic
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

    to_list = function(){

      if(self$dynamic) {
        verts <- self$vertices
      } else {
        verts <- t(self$vertices)
      }

      c(
        super$to_list(),
        list(
          dynamic = self$dynamic,
          vertices = verts,
          color = self$color
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
