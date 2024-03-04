as_row_matrix <- function(x, nr, nc = NULL, storage_mode = NULL) {
  call <- as.list(match.call())[-1]
  name <- deparse1(call[["x"]])
  if(is.vector(x)) {
    x <- matrix(unlist(x), nrow = nr)
  } else {
    x <- as.matrix(x)
    dimnames(x) <- NULL
    if(nrow(x) != nr) { x <- t(x) }
  }
  if(!is.null(storage_mode)) {
    storage.mode(x) <- storage_mode
  }
  stopifnot2(nrow(x) == nr, msg = sprintf("`%s` must have %d rows", name, nr))
  if(length(nc)) {
    stopifnot2(ncol(x) == nc, msg = sprintf("`%s` must have %d columns", name, nc))
  }
  x
}

register_points_rigid <- function(m_cp, t_cp) {
  # n_points <- nrow(m_cp)
  m_center <- colMeans(m_cp)
  m_centered <- sweep(m_cp, 2L, m_center, "-")

  t_center <- colMeans(t_cp)
  t_centered <- sweep(t_cp, 2L, t_center, "-")

  # Add to diagonal elements to avoid hand change
  svd <- svd(crossprod(m_centered, t_centered))
  t_v <- svd$v
  m_v <- svd$u

  if( det(m_v) * det(m_v) < 0 ) {
    # need to change hands because the eigenvalue is 0 and U/V may change hands
    t_v[,3] <- -t_v[,3]
  }

  # t(m_centered) %*% t_centered - m_v %*% diag(svd$d) %*% t(t_v) # == 0
  # rotation = t(m33)
  # m33 <- svd$v %*% t(svd$u); det(m33)
  m33 <- t_v %*% t(m_v)

  # t_centered %*% solve(t(m33))
  # m_centered %*% t(m33)

  # [m33, t] %*% [m_center; 1] = [t_center] => m33 %*% m_center + t = t_center
  translation <- t_center - m33 %*% m_center

  m44 <- rbind(cbind(m33, translation), c(0, 0, 0, 1))
  m44 %*% t(cbind(m_cp, 1))

  # (m44 %*% t(cbind(m_cp, 1)))[1:3,] - t(t_cp)
  # (solve(m44) %*% t(cbind(t_cp, 1)))[1:3, ] - t(m_cp)
  m44

}



ElectrodePrototype <- R6::R6Class(
  classname = "ElectrodePrototype",
  private = list(
    .n_vertices = 0L,
    .position = NULL,
    .index = NULL,
    .uv = NULL,
    .normal = NULL,
    .texture_size = NULL,
    .channel_map = NULL,
    .channel_numbers = NULL,
    .contact_center = NULL,
    .transform = NULL,
    .model_control_points = NULL,
    .world_control_points = NULL,
    .type = character(),

    # for preview use
    id = NULL
  ),
  public = list(
    name = character(),
    fix_outline = TRUE,
    .last_texture = NULL,
    initialize = function( type, n_vertices = 4 ) {
      self$type <- type
      n_vertices <- as.integer(n_vertices)
      stopifnot2(isTRUE(n_vertices > 3), msg = "Number of vertices must be greater than 3.")
      private$.n_vertices <- n_vertices
      # innitialize
      private$.transform <- diag(1, 4)
      private$.position <- array(0, c(3L, n_vertices))
      private$.texture_size <- c(1L, 1L)
      private$.model_control_points <- numeric(0L)
      private$.world_control_points <- numeric(0L)
      private$id <- sprintf("threeBrain-electrode-proto-%s", rand_string(10))
    },

    copy = function( other ) {
      self$from_list( other$as_list(flattern = TRUE) )
    },

    set_transform = function( m44, byrow = FALSE ) {
      stopifnot2(is.numeric(m44) && !anyNA(m44), msg = "Transform must be a 4x4 numeric matrix with no NA")
      if(is.matrix(m44)) {
        dm <- dim(m44)
        stopifnot2(dm[[2]] == 4L, msg = "Transform must be a 4x4 matrix")
        stopifnot2(dm[[1]] %in% c(3L, 4L), msg = "Transform must be a 4x4 matrix")
        if(dm[[1]] == 3L) {
          m44 <- rbind(m44, c(0,0,0,1))
        }
      } else {
        m44 <- matrix(as.vector(m44), nrow = 4, ncol = 4, byrow = byrow)
      }
      private$.transform <- m44
    },

    set_model_control_points = function( x, y, z ) {
      pos <- cbind(x, y, z)
      pos <- unique(pos)
      stopifnot2(nrow(pos) >= 3, msg = "Needs at least 3 unique control points")
      svd <- svd(crossprod(pos))
      if( sum(abs(svd$d > 1e-5)) < 2 ) {
        stop("The matrix rank of the control points must be at least 2 (you need at least 3 points that are not on the same line) to calculate the transform in 3D.")
      }
      private$.model_control_points <- pos
    },

    reset_world_control_points = function() {
      private$.world_control_points <- numeric(0L)
    },

    set_transform_from_points = function( x, y, z ) {
      # DIPSAUS DEBUG START
      # self <- new_electrode_prototype(
      #   base_prototype = "BoxGeometry",
      #   modifier = list(
      #     texture_size = c(20, 20),
      #     transform = diag(c(10,10,1,1)),
      #     channel_map = expand.grid(1:5, 1:5)
      #   )
      # )
      # private <- self$.__enclos_env__$private

      m_cp <- private$.model_control_points
      if(!is.matrix(m_cp)) {
        stop("Please run electrode$set_model_control_points first to set control points on model coordinates")
      }

      t_cp <- cbind(x, y, z)

      sel <- which(rowSums(is.na(t_cp)) == 0)
      sel <- sel[sel <= nrow(m_cp)]

      m_cp <- m_cp[sel, , drop = FALSE]
      t_cp <- t_cp[sel, , drop = FALSE]

      nm <- nrow(m_cp)
      nt <- nrow(t_cp)

      n <- min(nm, nt)

      stopifnot2(
        n >= 3,
        msg = "Please specify at least 3 control points to calculate the rigid transform"
      )

      m44 <- register_points_rigid(m_cp = m_cp, t_cp = t_cp)

      # # rotation
      # # linear regression, (normalized_coords) %*% m33 = points
      # xtx <- crossprod(normalized_coords)
      # if(abs(det(xtx)) < 1e-6) {
      #   # linearity
      #   svd <- svd(normalized_coords)
      #   # normalized_coords == svd$u %*% diag(svd$d) %*% t(svd$v)
      #   svd$d[abs(svd$d) < 1e-6] <- NA
      #   # [1,]    0    0   -1    0
      #   # [2,]   -5    0    0    0
      #   # [3,]    0   40    0    0
      #   # [4,]    0    0    0    1
      #
      #   # m33 <- t(svd$v %*% diag(1 / svd$d) %*% t(svd$u) %*% points)
      #   m33 <- t((t(svd$u) %*% points) / svd$d)
      #
      #   sel <- is.na(colSums(m33))
      #   if(any(sel)) {
      #     sub <- m33[, !sel]
      #     v <- ravetools::new_vector3()
      #     v$from_array(sub[, 1])$cross(sub[, 2])$normalize()
      #     v <- v[]
      #     m33[,sel] <- v
      #
      #     # make sure the transform does not change hand
      #     if(det(m33) * det(svd$v) < 0) {
      #       m33[,sel] <- -v
      #     }
      #   }
      #
      #   m33 <- m33 %*% t(svd$v)
      # } else {
      #   m33 <- solve(xtx) %*% crossprod(normalized_coords, points)
      #   m33 <- t(m33)
      # }
      #
      # if(rigid) {
      #   m33 <- t(apply(m33, 1L, function(x) {
      #     x / sqrt(sum(x^2))
      #   }))
      # }
      #
      # m44 <- diag(1, 4)
      # m44[seq_len(3), seq_len(3)] <- m33

      if( !all(is.finite(m44)) ) {
        stop("Cannot calculate the transform from control points. Please make sure the rank of control points is at least 2.")
      }
      private$.world_control_points <- t_cp
      self$set_transform( m44 )
    },

    set_position = function(position) {
      position <- as_row_matrix(position, nr = 3, nc = private$.n_vertices)
      private$.position <- position
    },

    set_index = function(index, index_start = NA) {
      index <- as_row_matrix(index, nr = 3, nc = NULL, storage_mode = "integer")
      if(is.na(index_start)) {
        index_start <- min(index)
      }
      stopifnot2(isTRUE(min(index) >= index_start), msg = "`index` contains invalid face index")
      stopifnot2(isTRUE(max(index) - index_start < private$.n_vertices), msg = "`index` contains invalid face index")
      private$.index <- index - index_start
    },

    set_normal = function( normal = "auto" ) {
      if(is.null(normal)) {
        private$.normal <- NULL
      } else if(identical(normal, "auto")){
        if(is.null(private$.normal)) {
          mesh <- ravetools::vcg_update_normals( self$as_mesh3d( apply_transform = FALSE, with_texture = FALSE ) )
          private$.normal <- mesh$normal
        }
      } else {
        private$.normal <- as_row_matrix(normal, nr = 3, nc = private$.n_vertices)
      }
    },

    set_uv = function( uv ) {
      private$.uv <- as_row_matrix(uv, nr = 2, nc = private$.n_vertices)
    },

    set_texture_size = function( texture_size ) {
      texture_size <- as.integer(texture_size)
      stopifnot2(length(texture_size) == 2 && all(!is.na(texture_size) & texture_size >= 1),
                 msg = "`texture_size` must be rows and columns of the electrode in integer")
      self$.last_texture <- NULL
      private$.texture_size <- texture_size
    },

    set_channel_map = function(channel_map, center_positions, channel_numbers) {
      if(!missing(channel_map)) {
        if(!is.null(channel_map)) {
          channel_map <- as_row_matrix(channel_map, nr = 4, storage_mode = "integer")
          channel_map[ is.na(channel_map) | channel_map < 1 | channel_map > private$.texture_size ] <- NA
        }
        self$.last_texture <- NULL
        private$.channel_map <- channel_map
      }

      n_channels <- self$n_channels
      if( missing(center_positions) ) {
        if( is.matrix(private$.contact_center) && ncol(private$.contact_center) == n_channels ) {
          center_positions <- private$.contact_center
        } else {
          center_positions <- NULL
        }
      }
      if(length(center_positions)) {
        center_positions <- as_row_matrix(center_positions, nr = 3L)
        if( ncol(center_positions) != n_channels ) {
          stop(sprintf("Number of contacts should be the same as number of channels (%d). Please set texture size and make sure `center_positions` has the same row as `channel_map`.", self$n_channels))
        }
        private$.contact_center <- center_positions
      } else {
        private$.contact_center <- NULL
      }
      if(missing(channel_numbers)) {
        channel_numbers <- private$.channel_numbers
        if(length(channel_numbers) != n_channels) {
          channel_numbers <- NULL
        }
      }
      if(length(channel_numbers)) {
        channel_numbers <- as.integer(channel_numbers)
        if(length(channel_numbers) < n_channels ) {
          channel_numbers <- c( channel_numbers, rep(NA_integer_, n_channels - length(channel_numbers)) )
        } else if( length(channel_numbers) > n_channels ) {
          channel_numbers <- channel_numbers[seq_len(n_channels)]
        }
        channel_numbers[ is.na(channel_numbers) | channel_numbers < 1 | channel_numbers > n_channels ] <- NA_integer_
        private$.channel_numbers <- channel_numbers
      } else {
        private$.channel_numbers <- NULL
      }

      # if(isFALSE(update_transform)) { return(self) }
      # if( !length(private$.contact_center) || ncol(private$.contact_center) < 3 ){ return(self) }
      # if( !length(private$.channel_numbers) || sum(!is.na(private$.channel_numbers)) < 3 ) { return(self) }
      # if(is.na(update_transform)) {
      #   if(!all(self$transform == diag(1L, 4))) { return(self) }
      # }
      #

    },


    set_contact_channels = function(channel_numbers, contact_orders) {
      if(!length(channel_numbers)) {
        private$.channel_numbers <- NULL
        return(invisible(self))
      }
      if(missing(contact_orders) || !length(contact_orders)) {
        contact_orders <- seq_along(channel_numbers)
      } else {
        contact_orders <- as.integer(contact_orders)
      }
      n_channels <- self$n_channels
      sel <- !is.na(contact_orders) & contact_orders > 0 & contact_orders <= n_channels
      contact_orders <- contact_orders[sel]
      channel_numbers <- channel_numbers[sel]
      cnum <- rep(NA_integer_, n_channels)
      if(length(channel_numbers)) {
        cnum[contact_orders] <- channel_numbers
      }
      private$.channel_numbers <- cnum
      return(invisible(self))
    },

    get_contact_positions = function( channels, apply_transform = TRUE ) {
      cpos <- private$.contact_center
      if(!length(cpos)) { return(NULL) }
      if(!missing(channels)) {
        if(!length(channels)) { return(matrix(numeric(0L), ncol = 3)) }
        cnum <- private$.channel_numbers
        if(!length(cnum)) {
          cnum <- seq_len(self$n_channels)
        }
        cpos <- sapply(channels, function(ch) {
          if( is.na(ch) ) { return(c(NA_real_, NA_real_, NA_real_)) }
          sel <- which(!is.na(cnum) & cnum == ch)
          if( length(sel) ) {
            return(cpos[, sel[[1]]])
          } else {
            return(c(NA_real_, NA_real_, NA_real_))
          }
        })
      }
      if( apply_transform ) {
        cpos <- self$transform %*% rbind(cpos, 1)
      }
      return(t(cpos[seq_len(3), , drop = FALSE]))
    },

    as_mesh3d = function( apply_transform = TRUE, with_texture = TRUE, ... ) {
      if( apply_transform ) {
        pos <- self$transform %*% rbind(private$.position, 1)
      } else {
        pos <- private$.position
      }
      uv <- private$.uv
      uv[uv < 0 | uv > 1] <- NA
      uv[1,] <- 1 - uv[1,]
      if(with_texture && !is.null(self$.last_texture)) {
        texture_file <- file.path(tempdir(check = TRUE), sprintf("%s.png", private$id))
        grDevices::png(filename = texture_file, units = "px", width = 256, height = 256)
        graphics::par(mar = c(0,0,0,0))
        self$preview_texture(...)
        grDevices::dev.off()
        texture_file <- normalizePath(texture_file)
      } else {
        texture_file <- NULL
      }
      structure(class = "mesh3d", list(
        vb = pos[c(1, 2, 3), , drop = FALSE],
        it = private$.index + 1L,
        normals = private$.normal,
        texcoords = uv,
        meshColor = "faces",
        material = list(
          color = "#CCCCCC", lit = FALSE,
          texture = texture_file,
          textype = "rgb", texmode = "replace", texmipmap = FALSE,
          front = "filled", back = "culled", size = 1
        )
      ))
    },

    get_texture = function(value, plot = FALSE, ...) {
      dim <- private$.texture_size
      if(is.null(private$.channel_map)) {
        re <- array(value, dim = dim)
      } else {
        re <- array(NA, dim = dim)
        n_channels <- ncol(private$.channel_map)
        for(ii in seq_len(n_channels)) {
          map <- private$.channel_map[, ii]
          if(!anyNA(map)) {
            re[
              (map[[1]] - 1) + seq_len(map[[3]]),
              (map[[2]] - 1) + seq_len(map[[4]])
            ] <- value[[ii]]
          }
        }
        # idx <- private$.channel_map[1, ] + dim[[1]] * (private$.channel_map[2, ] - 1L)
        # idx_valid <- !is.na(idx)
        # if(any(idx_valid)) {
        #   re[idx[idx_valid]] <- value[idx_valid]
        # }
      }
      if(is.factor(value)) {
        attr(re, "levels") <- levels(value)
      } else if(is.character(value)) {
        attr(re, "levels") <- sort(unique(unlist(value)))
      }
      self$.last_texture <- re
      if(plot) {
        self$preview_texture(...)
      }
      re
    },

    preview_texture = function(..., axes = FALSE, xlab = "", ylab = "", col = NULL, sub = NULL) {
      if(is.null(self$.last_texture)) {
        stop("Please run electrode$get_texture first.")
      }
      re <- self$.last_texture
      lv <- attr(re, "levels")
      dim <- self$texture_size
      asp <- dim[[1]] / dim[[2]]
      if( !is.null(lv) ) {
        # discrete
        if(!length(col)) {
          col <- DEFAULT_COLOR_DISCRETE
        }
        col <- rep(col, ceiling(length(lv) / length(col)))[seq_along(lv)]
        x <- re[seq(dim[[1]], 1), , drop = FALSE]
        dm <- dim(x)
        x <- array(as.integer(factor(as.vector(x), levels = lv)), dim = dm)
      } else if(!length(col)) {
        # continuous
        col <- grDevices::colorRampPalette(DEFAULT_COLOR_CONTINUOUS)(64)
        x <- re[seq(dim[[1]], 1), , drop = FALSE]
      }

      if(is.null(sub)) {
        sub <- sprintf("Prototype: %s", self$type)
      }

      graphics::image(
        x = seq_len(dim[[1]]) - 0.5,
        y = seq_len(dim[[2]]) - 0.5,
        z = x, asp = asp, axes = axes,
        xlab = xlab, ylab = ylab, col = col, sub = sub, ...)
      graphics::segments(
        y0 = c(0, 0, dim[[2]], dim[[2]]),
        y1 = c(dim[[1]], 0, dim[[2]], 0),
        x0 = c(0, 0, dim[[1]], dim[[1]]),
        x1 = c(0, dim[[1]], 0, dim[[1]]),
        lty = 3, col = "gray50", lwd = 3
      )
    },

    preview_3d = function(radius = 0.5, ...) {
      mesh <- self$as_mesh3d(apply_transform = FALSE, ...)
      m_cp <- private$.model_control_points
      sphere <- ravetools::vcg_sphere()
      sphere$vb[1:3, ] <- sphere$vb[1:3, ] * radius
      ravetools::rgl_view({
        ravetools::rgl_call("shade3d", mesh)
        lapply(seq_len(nrow(m_cp)), function(ii) {
          pos <- m_cp[ii, ]
          sphere$vb[1:3, ] <- sphere$vb[1:3, ] + pos
          ravetools::rgl_call("shade3d", sphere, col = "green")
          ravetools::rgl_call("text3d", pos, texts = sprintf("Marker_%d", ii),
                              cex = max(0.5, min(radius * 4, 1)), pos = 1, depth_test = "always")
          ravetools::rgl_call("title3d", main = sprintf("Prototype: %s", self$type), floating = TRUE)
        })
      })
    },

    as_list = function(flattern = FALSE) {
      model_control_points <- private$.model_control_points
      if(is.matrix(model_control_points)) {
        model_control_points <- t(model_control_points)
      }
      world_control_points <- private$.world_control_points
      if(is.matrix(world_control_points)) {
        world_control_points <- t(world_control_points)
      }

      if( flattern ) {
        position <- as.vector(private$.position)
        index <- as.vector(private$.index)
        uv <- as.vector(private$.uv)
        normal <- as.vector(private$.normal)
        channel_map <- as.vector(private$.channel_map)
        transform <- as.vector(t(self$transform))
        model_control_points <- as.vector(model_control_points)
        world_control_points <- as.vector(world_control_points)
        contact_center <- as.vector(private$.contact_center)
      } else {
        position <- private$.position
        index <- private$.index
        uv <- private$.uv
        normal <- private$.normal
        channel_map <- private$.channel_map
        transform <- self$transform
        contact_center <- private$.contact_center
      }
      list(
        type = self$type,
        name = self$name,
        geometry = "CustomGeometry",
        n = c(ncol(private$.position), ncol(self$index)),
        fix_outline = self$fix_outline,
        transform = transform,
        position = position,
        index = index,
        uv = uv,
        normal = normal,
        texture_size = self$texture_size,
        channel_map = channel_map,
        channel_numbers = as.vector(private$.channel_numbers),
        contact_center = contact_center,
        model_control_points = model_control_points,
        world_control_points = world_control_points
      )
    },
    from_list = function(li) {
      n_vertices <- as.integer(li$n[[1]])
      stopifnot2(n_vertices > 3, msg = "Invalid number of vertices (must > 3)")
      self$.last_texture <- NULL
      self$type <- li$type
      private$.n_vertices <- n_vertices
      self$fix_outline <- isTRUE(as.logical(li$fix_outline))
      self$set_transform(li$transform)
      self$set_position(li$position)
      self$set_index(li$index)
      self$set_uv(li$uv)
      self$set_normal(li$normal)
      self$set_texture_size(li$texture_size)
      self$set_channel_map(li$channel_map, li$contact_center, li$channel_numbers)
      if(length(li$model_control_points)) {
        mcp <- matrix(data = li$model_control_points, nrow = 3L, dimnames = NULL)
        self$set_model_control_points(x = mcp[1, ], y = mcp[2, ], z = mcp[3, ])
      }
      if(length(li$world_control_points) >= 9) {
        tcp <- matrix(data = li$world_control_points, nrow = 3L, dimnames = NULL)
        tryCatch({
          self$set_transform_from_points(x = tcp[1, ], y = tcp[2, ], z = tcp[3, ])
        }, error = function(e) {
          warning(e)
        })
      }
      self
    },
    as_json = function(to_file = NULL, flattern = TRUE) {
      li <- self$as_list(flattern = flattern)
      # all matrices are col-major except for transform
      if(!flattern) {
        li$transform <- t(li$transform)
      }
      json <- to_json(li, matrix = "rowmajor", auto_unbox = TRUE, to_file = to_file)
      if(is.null(to_file)) {
        return(json)
      } else {
        return(invisible(json))
      }
    },
    from_json = function(json, is_file = FALSE) {
      if( is_file ) {
        li <- from_json(from_file = json)
      } else {
        li <- from_json(txt = json)
      }
      self$from_list(li)
    },

    validate = function() {
      if(length(self$type) != 1 || !nzchar(self$type)) {
        stop("Electrode prototype `type` shouldn't be empty.")
      }
      if(!is.matrix(private$.model_control_points) || nrow(private$.model_control_points) < 3L ) {
        warning("Electrode prototype control points (model) must be a matrix with at least 3 points. Please use `set_model_control_points` to set them")
      }
      invisible()
    }

  ),
  active = list(
    type = function(v) {
      if(!missing(v)) {
        private$.type <- toupper(v)
      }
      private$.type
    },
    n_vertices = function() {
      private$.n_vertices
    },
    n_channels = function() {
      if(is.null(private$.channel_map)) {
        return(prod(private$.texture_size))
      } else {
        return(ncol(private$.channel_map))
      }
    },
    channel_numbers = function() {
      if(length(private$.channel_numbers)) {
        return(private$.channel_numbers)
      }
      return(seq_len(self$n_channels))
    },
    position = function(v) {
      if(!missing(v)) {
        stop("Please use x$set_position(...) to set vertex positions")
      }
      pos <- self$transform %*% rbind(private$.position, 1)
      pos[seq_len(3), , drop = FALSE]
    },
    index = function() { private$.index },
    uv = function() { private$.uv },
    normal = function() { private$.normal },
    texture_size = function() { private$.texture_size },
    channel_map = function() { private$.channel_map },
    transform = function() { private$.transform },
    control_points = function() {
      if( !length(private$.model_control_points) ) { return(NULL) }
      mcp <- private$.model_control_points
      tcp <- private$.world_control_points
      n <- nrow(mcp)
      if(length(tcp) && is.matrix(tcp)) {
        if( nrow(tcp) < n ) {
          tcp_ <- array(NA_real_, c(n, 3L))
          tcp_[seq_len(nrow(tcp)), ] <- tcp
        } else {
          tcp_ <- tcp[seq_len(n), , drop = FALSE]
        }
      } else {
        tcp_ <- array(NA_real_, c(n, 3L))
      }

      data.frame(
        model_x = mcp[, 1],
        model_y = mcp[, 2],
        model_z = mcp[, 3],
        tkr_R = tcp_[, 1],
        tkr_A = tcp_[, 2],
        tkr_S = tcp_[, 3]
      )
    }
  )
)

#' @title Create or load new electrode prototype from existing configurations
#' @param base_prototype base prototype, this can be a string of prototype type
#' (see \code{\link{list_electrode_prototypes}}), path to the prototype
#' configuration file, configuration in 'json' format, or an electrode prototype
#' instance
#' @param modifier internally used
#' @returns An electrode prototype instance
#'
#' @examples
#'
#'
#' available_prototypes <- list_electrode_prototypes()
#' if("Precision33x31" %in% names(available_prototypes)) {
#'
#'   # Load by type name
#'   new_electrode_prototype("Precision33x31")
#'
#'   # load by path
#'   path <- available_prototypes[["Precision33x31"]]
#'   new_electrode_prototype(path)
#'
#'   # load by json string
#'   json <- readLines(path)
#'   new_electrode_prototype(json)
#'
#' }
#'
#'
#'
#' @export
new_electrode_prototype <- function(
    base_prototype, modifier = NULL) {

  prototype <- ElectrodePrototype$new("")
  if(inherits(base_prototype, "ElectrodePrototype")) {
    prototype$copy( base_prototype )
  } else if (is.list(base_prototype)) {
    prototype$from_list(base_prototype)
  } else if(is.character(base_prototype)) {
    plist <- list_electrode_prototypes()
    f <- plist[[ base_prototype ]]
    if(length(f) == 1 && file.exists(f)) {
      prototype$from_json(json = f, is_file = TRUE)
    } else {
      if(file.exists(base_prototype)) {
        prototype$from_json(json = base_prototype, is_file = TRUE)
      } else {
        tryCatch({
          prototype$from_json(json = base_prototype, is_file = FALSE)
        }, error = function(e) {
          stop("Invalid `base_prototype`; must be instance of one of the followings: `ElectrodePrototype`, json file path, json string, or builtin shape names")
        })
      }
    }
  } else {
    stop("Invalid `base_prototype`; must be instance of one of the followings: `ElectrodePrototype`, json file path, json string, or builtin shape names")
  }
  prototype$validate()

  if(is.list(modifier)) {

    lapply(names(modifier), function(nm) {
      cf <- modifier[[nm]]
      if(is.function(cf)) {
        cf <- cf(prototype)
      } else {
        f <- prototype[[sprintf("set_%s", nm)]]
        if(is.function(f)) {
          f(cf)
        }
      }
      return()
    })

    nms <- names(modifier)
    sel <- sprintf("set_%s", nms) %in% names(prototype)
    if(any(sel)) {

    }
  }

  prototype

}


prototype_search_paths <- function() {
  paths <- file.path(
    c(
      '~/rave_data/others/three_brain',
      default_template_directory(),
      system.file(package = 'threeBrain')
    ),
    "prototypes"
  )
  paths <- paths[dir.exists(paths)]
  paths
}


#' @title List all electrode prototypes
#' @description
#' List all built-in and user-customized electrode prototypes. User paths
#' will be searched first, if multiple prototype configuration files are found
#' for the same type.
#' @returns A named list, names are the prototype types and values are the
#' prototype configuration paths.
#'
#' @examples
#'
#' list_electrode_prototypes()
#'
#'
#' @export
list_electrode_prototypes <- function() {
  re <- list()

  root_paths <- rev(prototype_search_paths())
  root_paths <- root_paths[dir.exists(root_paths)]

  if(!length(root_paths)) { return(re) }

  root_paths <- normalizePath(root_paths, mustWork = FALSE)
  root_paths <- unique(root_paths)

  lapply(root_paths, function(path) {
    fnames <- list.files(path, pattern = "\\.json$", ignore.case = TRUE,
                         include.dirs = FALSE, full.names = FALSE,
                         all.files = FALSE, recursive = FALSE)

    if(length(fnames)) {
      pnames <- gsub("\\.json$", "", fnames, ignore.case = TRUE)
      re[ pnames ] <<- file.path(path, fnames)
    }
  })
  re
}


