ElectrodePrototype <- R6::R6Class(
  classname = "ElectrodePrototype",
  private = list(
    control_points = NULL,
    contacts = NULL,
    .min_length = numeric(),
    adjust_length = function(length = NA) {
      if(is.na(length)) { length <- 0 }
      lmax <- 0
      lmin <- 0
      control_points <- private$control_points
      if(is.matrix(control_points) && nrow(control_points)) {
        lmax <- max(0, control_points[, 2], na.rm = TRUE)
        lmin <- min(0, control_points[, 2], na.rm = TRUE)
      }
      if(length(private$contacts)) {
        lmax <- max(
          unlist(lapply(as.list(private$contacts), "[[", "positions")),
          lmax)
      }
      length <- max(length, private$.min_length, lmax - lmin, na.rm = TRUE)
      return(length)
    },
    get_control_points = function(length = NA) {
      length <- private$adjust_length(length = length)
      control_points <- private$control_points
      ncpts <- 0
      if(is.matrix(control_points) && nrow(control_points)) {
        ncpts <- nrow(control_points)
      }

      if( ncpts == 0 ) {
        control_points <- rbind(
          c(0, 0, 0, 0, 0.5),
          c(0, length, 0, 1, 0.5)
        )
      } else {
        control_points <- private$control_points
        control_points <- control_points[order(control_points[, 2]), , drop = FALSE]
        if( control_points[1, 2] > 0 ) {
          tp <- control_points[1, ]
          tp[2] <- 0
          control_points <- rbind(tp, control_points)
          ncpts <- ncpts + 1
        }
        if( control_points[ncpts, 2] < length ) {
          tp <- control_points[ncpts, ]
          tp[2] <- length
          control_points <- rbind(control_points, tp)
        }
      }
      p <- control_points[, 2]
      p[p < 0] <- length + p[p < 0]
      control_points[, 2] <- p
      control_points[, 4] <- p / length
      return( control_points )
    }
  ),
  active = list(
    min_length = function(v) {
      if(!missing(v)) {
        if(!is.finite(v) || v < 0) {
          stop("Electrode min length must be non-negative")
        }
        private$.min_length <- v
      }
      private$adjust_length()
    }
  ),
  public = list(
    prefix = character(),
    target_position = NULL,
    entry_position = NULL,
    initialize = function(prefix = NULL) {
      self$prefix <- prefix
      private$.min_length <- 0
      self$target_position <- c(0, 0, 0)
      self$entry_position <- c(0, 1, 0)
      private$contacts <- dipsaus::fastmap2()
    },
    add_contact = function(
    order, start_position, end_position,
    start_angle = 0, end_angle = 2 * pi
    ) {
      order <- as.integer(order)
      if(is.na(order) || order <= 0) {
        stop("add_contact: `order` must be positive integer")
      }
      if( start_position < 0 ) {
        stop("add_contact: `start_position` must be non-negative")
      }
      if( end_position < start_position ) {
        stop("add_contact: `end_position` must be > end_position")
      }
      if( start_position == end_position ) {
        end_position <- end_position + 0.001
      }
      if( start_angle < 0 || start_angle > 2 * pi) {
        stop("add_contact: `start_angle` must be >= 0 && <= 2 pi")
      }
      if( end_angle < 0 || end_angle > 2 * pi) {
        stop("add_contact: `end_angle` must be >= 0 && <= 2 pi")
      }

      private$contacts[[as.character(order)]] <- list(
        positions = c(start_position, end_position),
        angles = sort(c(start_angle, end_angle))
      )
    },
    add_control_point = function(
    position, diameter
    ) {
      stopifnot2(diameter >= 0,
                 msg = "add_control_point: `diameter` must be non-negative")
      # private$control_points
      private$control_points <- rbind(
        private$control_points,
        c(0, position, 0, 0, diameter / 2)
      )
    },

    generate_texture = function( background, length = NA,
                                 height = NULL, width = 256 ) {
      background <- grDevices::col2rgb(background, FALSE)
      if(is.na(length)) { length <- 0 }
      length <- private$adjust_length(length = length)
      if(length(height) != 1) {
        height <- 2^ceiling(log2(length * 10))
      }
      height <- ceiling(height)
      width <- ceiling(width)
      height_factor <- height / length
      width_factor <- width / (2 * pi)

      img <- array(0, dim = c(height, width, 4))
      img[,,1] <- background[[1]] / 255
      img[,,2] <- background[[2]] / 255
      img[,,3] <- background[[3]] / 255
      img[,,4] <- 0

      for(order in names(private$contacts)) {
        contact <- private$contacts[[ order ]]
        # positions = c(start_position, end_position),
        # angles = sort(c(start_angle, end_angle))
        h1 <- floor(contact$positions[[1]] * height_factor)
        h2 <- ceiling(contact$positions[[2]] * height_factor)
        w1 <- floor(contact$angles[[1]] * width_factor)
        w2 <- ceiling(contact$angles[[2]] * width_factor)
        img[seq(h1, h2), seq(w1, w2), ] <- 1
      }

      return( img[seq(height, 1),,,drop = FALSE] )
    },

    generate_geometry = function(
      name, subject_code = NULL, length = NA,
      target_position = NULL, entry_position = NULL,
      insertion_depth = 0, background = "black", ...
    ) {
      rconn <- rawConnection(raw(0), open = "r+")
      on.exit({
        close(rconn)
      })
      img <- self$generate_texture( background = background, length = length,... )
      png::writePNG(img, target = rconn)
      control_points <- private$get_control_points(length = length)
      re <- TubeGeom$new(
        name = sprintf("%s%s", paste(self$prefix, collapse = ""), name),
        control_data = control_points,
        image_uri = sprintf(
          "data:image/png;base64,%s",
          jsonlite::base64_enc(input = rawConnectionValue(rconn))
        )
      )
      if(length(target_position) != 3) {
        target_position <- self$target_position
      }
      if(length(entry_position) != 3) {
        entry_position <- self$entry_position
      }
      dir <- entry_position - target_position
      trans_mat <- calculate_rotation(c(0, 1, 0), dir)
      mat1 <- matrix(byrow = TRUE, nrow = 4, c(
        1, 0, 0, 0,
        0, 1, 0, -insertion_depth,
        0, 0, 1, 0,
        0, 0, 0, 1
      ))
      trans_mat[seq_len(3), 4] <- target_position
      re$trans_mat <- trans_mat %*% mat1
      re$subject_code <- subject_code
      re$clickable <- TRUE
      re
    }
  )
)

#' Create a prototype for visualizing electrode shaft
#' @param prefix geometry prefix
#' @param min_length minimum length in millimeters
#' @param geom_control_points control points in millimeters, used to control the
#' shape of the electrode, with zero being the target point.
#' @param geom_control_diameters diameter for each control point in millimeters,
#' must share the same length as \code{geom_control_points}
#' @param contacts a list of electrode positions; see example
#' @examples
#'
#' proto <- new_electrode_prototype(
#'   prefix = "sDEA-2mm-",
#'   geom_control_points = c(0, 1.2, 10.2, 10.201, -3, -2, -0.1),
#'   geom_control_diameters = c(0, 0.2, 0.2, 1.1, 1.1, 1.5, 1.5),
#'   contacts = list(
#'     list(
#'       order = 1,
#'       start_position = 0.2,
#'       size = 10,
#'       description = "microwire"
#'     ),
#'     list(
#'       order = 2,
#'       start_position = 10.2,
#'       size = 1.32,
#'       description = "macro-1"
#'     ),
#'     list(
#'       order = 3,
#'       start_position = 12.2,
#'       size = 1.32,
#'       description = "macro-2"
#'     ),
#'     list(
#'       order = 4,
#'       start_position = 14.2,
#'       size = 1.32,
#'       description = "macro-3"
#'     ),
#'     list(
#'       order = 5,
#'       start_position = 16.2,
#'       size = 1.32,
#'       description = "macro-4"
#'     )
#'   )
#' )
#'
#' geom <- proto$generate_geometry(
#'   "shaft-1",
#'   subject_code = "N27",
#'   target_position = c(8.6, 38.7, -42.8),
#'   entry_position = c(49, 49.3, -25.5),
#'   length = 100
#' )
#'
#' n27_path <- file.path(
#'   default_template_directory(),
#'   "N27"
#' )
#' if(interactive() && file.exists(n27_path)) {
#'   brain <- threeBrain(n27_path, subject_code = "N27")
#'   brain$plot(additional_geoms = list(geom))
#' }
#'
#' @export
new_electrode_prototype <- function(
    prefix = "", min_length = 0,
    geom_control_points = NULL,
    geom_control_diameters = NULL,
    contacts = list()
) {

  if(min_length < 0) {
    stop("Electrode shaft minimal length must be non-negative.")
  }

  proto <- ElectrodePrototype$new(prefix = prefix)
  proto$min_length <- min_length

  if(length(geom_control_points) != length(geom_control_diameters)) {
    stop("Electrode shaft control points must share the same vector length as diameters")
  }
  if(length(geom_control_points)) {
    lapply(seq_along(geom_control_points), function(ii) {
      proto$add_control_point(
        geom_control_points[[ ii ]],
        geom_control_diameters[[ ii ]]
      )
    })
  }

  order <- 0
  for(item in contacts) {
    if(is.list(item)) {
      if(length(item$order) != 1 || is.numeric(item$order)) {
        item$order <- order + 1
      }
      if(length(item$end_position) != 1) {
        item$end_position <- item$start_position + item$size
      }
      proto$add_contact(
        order = item$order,
        start_position = item$start_position,
        end_position = item$end_position,
        start_angle = c(item$start_angle, 0)[[1]],
        end_angle = c(item$end_angle, 2*pi)[[1]]
      )
      if( order < item$order ) {
        order <- item$order
      }
    }
  }

  return(proto)
  # for(i in 1:16) {
  #   start_position <- 11.2 + (i - 1) * 2

  # }
  # proto$add_contact(
  #   order = 17,
  #   start_position = 0,
  #   end_position = 11.2
  # )
}


