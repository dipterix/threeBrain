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

  if( det(t_v) * det(m_v) < 0 ) {
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

normalize_vector3 <- function(v) {
  if(length(v) != 3) { return(c(0, 0, 0))}
  l <- sqrt(sum(v^2))
  if( !is.finite(l) || l == 0 ) {
    return(c(0, 0, 0))
  }
  return( v / l )
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
    .marker_map = NULL,
    .channel_numbers = NULL,
    .contact_center = NULL,
    .contact_sizes = NULL,
    .transform = NULL,
    .model_control_points = NULL,
    .model_control_point_orders = NULL,
    .world_control_points = NULL,
    .fix_control_index = NULL,

    # either direction of the electrode or the normal if 2D
    .model_direction = NULL,

    # used for rank-1 electrodes (e.g. DBS) to calculate transform
    # For example, DBS electrode has segment that faces anterior anyway
    .model_up = NULL,
    .world_up = NULL,
    .type = character(),

    # for preview use
    id = NULL

  ),
  public = list(
    name = character(),
    description = "No description",
    default_interpolation = NULL,
    fix_outline = TRUE,

    model_rigid = TRUE,
    viewer_options = list(),

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
      self$from_list( other$as_list() )
    },

    set_viewer_options = function(opt) {
      self$viewer_options <- as.list(opt)
    },

    set_transform = function( m44, byrow = TRUE ) {
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

    set_model_control_points = function( x, y, z, fixed_point = NULL, order = NULL ) {
      pos <- cbind(x, y, z)
      pos <- unique(pos)
      stopifnot2(nrow(pos) >= 2L, msg = "Needs at least 2 unique control points")
      svd <- svd(crossprod(pos))
      if( sum(abs(svd$d > 1e-5)) < 1 ) {
        stop("The matrix rank of the control points must be at least 2 (you need at least 2 points that are not identical) to calculate the transforms.")
      }
      npos <- nrow(pos)
      if(length(fixed_point)) {
        fixed_point <- as.integer(fixed_point[[1]])
        if( fixed_point < 1 || fixed_point > npos ) {
          stop("`fixed_point` must be an integer or `NULL`")
        }
      }
      order <- as.integer(order)
      if(length(order) > 0) {
        stopifnot2(length(order) == npos, msg = "`set_model_control_points`: `order` must be integers and/or NAs with size of control points.")
      }
      private$.model_control_points <- pos
      private$.model_control_point_orders <- order
      private$.fix_control_index <- fixed_point
    },

    reset_world_control_points = function() {
      private$.world_control_points <- numeric(0L)
    },

    set_transform_from_points = function( x, y, z, up = NULL ) {
      # DIPSAUS DEBUG START
      # brain <- ravecore::rave_brain("devel/mni152_b")
      # self <- brain$electrodes$geometries$`SEEG-16_R_NAC`
      # private <- self$.__enclos_env__$private
      # t_cp <- private$.world_control_points

      m_cp <- private$.model_control_points
      if(!is.matrix(m_cp)) {
        stop("Please run electrode$set_model_control_points first to set control points on model coordinates")
      }

      t_cp <- cbind(x, y, z)

      sel <- which(rowSums(is.na(t_cp)) == 0)

      if(length(private$.fix_control_index)) {
        idx <- private$.fix_control_index[[1]]
        if(!sel[[ idx ]]) {
          m_fixed <- NULL
          t_fixed <- NULL
        } else {
          m_fixed <- m_cp[idx, , drop = TRUE]
          t_fixed <- t_cp[idx, , drop = TRUE]
        }
      } else {
        m_fixed <- NULL
        t_fixed <- NULL
      }

      sel <- sel[sel <= nrow(m_cp)]

      m_cp <- m_cp[sel, , drop = FALSE]
      t_cp <- t_cp[sel, , drop = FALSE]

      nm <- nrow(m_cp)
      nt <- nrow(t_cp)

      n <- min(nm, nt)

      stopifnot2(
        n >= 2,
        msg = "Please specify at least 2 or 3 control points to calculate the rigid transform"
      )

      if( is.null(m_fixed) || is.null(t_fixed) ) {
        m_fixed <- colMeans( m_cp )
        t_fixed <- colMeans( t_cp )
      }

      m44 <- register_points_rigid(m_cp = m_cp, t_cp = t_cp)

      if( !all(is.finite(m44)) ) {
        if( n >= 3 ) {
          stop("Cannot calculate the transform from control points. Please make sure the rank of control points is at least 2.")
        } else {
          warning("Cannot calculate rotation matrix. More control points are needed.")
          return()
        }
      }

      # check rank of the model
      qr_decomp <- qr(m_cp)

      if(
        qr_decomp$rank == 1 &&
        sum(cross_prod(self$model_direction, self$model_up) ^ 2) > 0.5
      ) {
        # we need to account for rotations along `self$model_direction`
        model_z <- normalize_vector3( self$model_direction )
        model_x <- normalize_vector3( cross_prod(self$model_up, model_z) )
        model_y <- normalize_vector3( cross_prod(model_z, model_x) )
        basis <- cbind(model_x, model_y, model_z)
        m33 <- solve(m44[1:3, 1:3]) %*% self$transform[1:3, 1:3] %*% solve(basis)
        m33[m33 < -1] <- -1
        m33[m33 > 1] <- 1

        # rotation: euler angle from ZYX order
        a_y <- asin( - m33[3, 1] )

        if ( abs( a_y ) < 0.9999999 ) {

          a_x <- atan2( m33[3, 2], m33[3, 3] )
          a_z <- atan2( m33[2, 1], m33[1, 1] )

        } else {

          a_x <- 0
          a_z <- atan2( - m33[1, 2], m33[2, 2] )

        }

        euler_z <- matrix(
          nrow = 3, byrow = TRUE,
          c(
            cos( a_z ), - sin( a_z ), 0,
            sin( a_z ), cos( a_z ),   0,
            0, 0, 1
          )
        )


        m33 <- m44[1:3, 1:3] %*% euler_z %*% basis
        m44[1:3, 1:3] <- m33

      }

      if( length(m_fixed) ) {
        m44[1:3, 4] <- 0
        m44[1:3, 4] <- t_fixed - (m44 %*% c(m_fixed, 1))[1:3]
      }

      if(length(up) != 3) {
        up <- private$.world_up
      }
      up <- normalize_vector3( up )
      if(
        n >= 1 && qr_decomp$rank == 1 && sum(up^2) > 0.5 &&
        sum((self$model_up) ^ 2) > 0.5 && sum((self$model_direction) ^ 2) > 0.5
      ) {
        # We want  m44 (model_up, 0.0) = up ( or close to )
        model_z <- normalize_vector3( self$model_direction )
        model_x <- normalize_vector3( cross_prod(self$model_up, model_z) )
        model_y <- normalize_vector3( cross_prod(model_z, model_x) )

        target_z <- normalize_vector3( ( m44 %*% c(model_z, 0) )[1:3] )
        target_x <- normalize_vector3( cross_prod(up, target_z) )
        target_y <- normalize_vector3( cross_prod(target_z, target_x) )

        t_basis <- cbind(target_x, target_y, target_z)
        m_basis <- cbind(model_x, model_y, model_z)

        # r33 x m_basis = t_basis
        m_qr <- qr( m_basis )
        t_qr <- qr( t_basis )
        if( m_qr$rank == 3 && t_qr$rank == 3 ) {
          # no linearity
          r33 <- t_basis %*% solve( m_basis )
          m44[1:3, 1:3] <- r33
          m44[1:3, 4] <- 0
          m44[1:3, 4] <- t_fixed - (m44 %*% c(m_fixed, 1))[1:3]
        }
      }

      private$.world_control_points <- t_cp
      private$.world_up <- up
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

    set_channel_map = function(channel_map, center_positions) {
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
      channel_numbers <- private$.channel_numbers
      if(length(channel_numbers) != n_channels) {
        private$.channel_numbers <- NULL
      }
    },

    set_marker_map = function(marker_map) {
      # only for visualization purposes
      if(!missing(marker_map)) {
        if(!is.null(marker_map)) {
          marker_map <- as_row_matrix(marker_map, nr = 4, storage_mode = "integer")
          marker_map[ is.na(marker_map) | marker_map < 1 | marker_map > private$.texture_size ] <- NA
        }
        private$.marker_map <- marker_map
      }
    },

    set_contact_sizes = function( sizes ) {
      if(!is.numeric(sizes)) {
        warning("Contact sizes must be numeric (mm).")
        return(invisible(self))
      }
      sizes <- as.numeric(sizes)
      if(!length(sizes)) {
        private$.contact_sizes <- NULL
        return(invisible(self))
      }
      n_channels <- self$n_channels
      if(length(sizes) == 1) {
        private$.contact_sizes <- rep(sizes, n_channels)
        return(invisible(self))
      }
      if(length(sizes) != n_channels) {
        stop("Number of contact sizes not matches with the number of channels")
      }
      private$.contact_sizes <- as.vector(sizes)
      return(invisible(self))
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
      # DIPSAUS DEBUG START
      # brain <- ravecore::rave_brain("devel/mni152_b")
      # self = brain$electrodes$geometries$`SEEG-16_R_NAC`
      # private <- self$.__enclos_env__$private
      # apply_transform <- TRUE
      cpos <- private$.contact_center
      if(!length(cpos)) { return(NULL) }
      if(missing(channels)) {
        channels <- private$.channel_numbers
        if(!length(channels)) {
          channels <- seq_len(self$n_channels)
        }
      }
      if(!length(channels)) { return(matrix(numeric(0L), ncol = 3)) }

      if( apply_transform ) {
        cpos <- self$transform %*% rbind(cpos, 1)
      }

      cnum <- private$.channel_numbers
      cpos <- sapply(channels, function(ch) {
        if( is.na(ch) ) { return(c(NA_real_, NA_real_, NA_real_)) }
        sel <- which(!is.na(cnum) & cnum == ch)
        if( length(sel) ) {
          sel <- sel[[1]]

          # sel2 control point is a contact
          if( apply_transform && length(private$.model_control_point_orders) > 0 ) {
            sel2 <- which( private$.model_control_point_orders == sel )
            if( length(sel2) ) {
              sel2 <- sel2[[1]]
              # Need to check if we do have such control point
              if( length(private$.world_control_points) >= sel2 * 3 ) {
                return( private$.world_control_points[sel2, ] )
              }
            }
          }

          return( cpos[1:3, sel[[1]]] )
        } else {
          return(c(NA_real_, NA_real_, NA_real_))
        }
      })
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
        oldpar <- graphics::par(mar = c(0, 0, 0, 0))
        on.exit({ graphics::par(oldpar) })
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

        # ensure markers
        if(!is.null(private$.marker_map)) {
          n_iters <- ncol(private$.marker_map)
          for(ii in seq_len(n_iters)) {
            map <- private$.marker_map[, ii]
            if(!anyNA(map)) {
              i <- (map[[1]] - 1) + seq_len(map[[3]])
              i[i > dim[[1]]] <- i[i > dim[[1]]] - dim[[1]]
              j <- (map[[2]] - 1) + seq_len(map[[4]])
              j[j > dim[[2]]] <- j[j > dim[[2]]] - dim[[2]]
              re[ i, j ] <- 0
            }
          }
        }

        n_channels <- ncol(private$.channel_map)
        for(ii in seq_len(n_channels)) {
          map <- private$.channel_map[, ii]
          if(!anyNA(map)) {
            i <- (map[[1]] - 1) + seq_len(map[[3]])
            i[i > dim[[1]]] <- i[i > dim[[1]]] - dim[[1]]
            j <- (map[[2]] - 1) + seq_len(map[[4]])
            j[j > dim[[2]]] <- j[j > dim[[2]]] - dim[[2]]
            re[ i, j ] <- value[[ii]]
          }
        }
        # idx <- private$.channel_map[1, ] + dim[[1]] * (private$.channel_map[2, ] - 1L)
        # idx_valid <- !is.na(idx)
        # if(any(idx_valid)) {
        #   re[idx[idx_valid]] <- value[idx_valid]
        # }
      }

      if(is.factor(value)) {
        attr(re, "levels") <- unique(c(levels(value), "0"))
      } else if(is.character(value)) {
        attr(re, "levels") <- unique(c(sort(unique(unlist(value))), "0"))
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

    to_list = function(...) {
      self$as_list()
    },

    as_list = function(...) {
      model_control_points <- private$.model_control_points
      if(is.matrix(model_control_points)) {
        model_control_points <- t(model_control_points)
      }
      world_control_points <- private$.world_control_points
      if(is.matrix(world_control_points)) {
        world_control_points <- t(world_control_points)
      }

      list(
        type = self$type,
        name = self$name,
        description = self$description,
        geometry = "CustomGeometry",
        n = c(ncol(private$.position), ncol(self$index)),
        fix_outline = self$fix_outline,
        transform = as.vector(t(self$transform)),
        position = as.vector(private$.position),
        index = as.vector(private$.index),
        uv = as.vector(private$.uv),
        normal = as.vector(private$.normal),
        texture_size = self$texture_size,
        channel_map = as.vector(private$.channel_map),
        marker_map = as.vector(private$.marker_map),
        channel_numbers = as.vector(private$.channel_numbers),
        contact_center = as.vector(private$.contact_center),
        contact_sizes = self$contact_sizes,
        model_control_points = as.vector(model_control_points),
        model_control_point_orders = private$.model_control_point_orders,
        world_control_points = as.vector(world_control_points),
        fix_control_index = private$.fix_control_index,
        model_direction = self$model_direction,
        model_rigid = self$model_rigid,
        model_up = self$model_up,
        world_up = private$.world_up,
        default_interpolation = self$default_interpolation,
        viewer_options = self$viewer_options
      )
    },
    from_list = function(li) {
      n_vertices <- as.integer(li$n[[1]])
      stopifnot2(n_vertices > 3, msg = "Invalid number of vertices (must > 3)")
      self$.last_texture <- NULL
      self$type <- li$type
      private$.n_vertices <- n_vertices
      self$fix_outline <- isTRUE(as.logical(li$fix_outline))
      self$set_position(li$position)
      self$set_index(li$index)
      self$set_uv(li$uv)
      self$set_normal(li$normal)
      self$set_texture_size(li$texture_size)
      self$set_channel_map(li$channel_map, li$contact_center)
      self$set_marker_map(li$marker_map)
      self$set_contact_channels(li$channel_numbers)
      self$set_contact_sizes(li$contact_sizes)
      if(length(li$model_control_points)) {
        mcp <- matrix(data = li$model_control_points, nrow = 3L, dimnames = NULL)
        self$set_model_control_points(
          x = mcp[1, ], y = mcp[2, ], z = mcp[3, ],
          fixed_point = li$fix_control_index,
          order = li$model_control_point_orders
        )
      }
      self$model_direction <- li$model_direction
      self$model_up <- li$model_up

      if(length(li$world_control_points) >= 6) {
        tcp <- matrix(data = li$world_control_points, nrow = 3L, dimnames = NULL)
        tryCatch({
          self$set_transform(li$transform)
          self$set_transform_from_points(x = tcp[1, ], y = tcp[2, ], z = tcp[3, ], up = li$world_up)
        }, error = function(e) {
          warning(e)
        })
      }
      self$set_transform(li$transform)
      tryCatch({
        self$description <- li$description
      }, error = function(e){})

      self$default_interpolation <- li$default_interpolation
      self$model_rigid <- !isFALSE(li$model_rigid)
      self$set_viewer_options(li$viewer_options)
      self
    },
    as_json = function(to_file = NULL, ...) {
      li <- self$as_list()
      json <- to_json(li, matrix = "rowmajor", auto_unbox = TRUE, to_file = to_file)
      if(is.null(to_file)) {
        return(json)
      } else {
        return(invisible(json))
      }
    },
    from_json = function(json, is_file = FALSE) {
      threeBrain <- asNamespace("threeBrain")
      if( is_file ) {
        li <- threeBrain$from_json(from_file = json)
      } else {
        li <- threeBrain$from_json(txt = json)
      }
      self$from_list(li)
    },

    update_from = function( other ) {
      if(inherits(other, "ElectrodePrototype")) {
        other <- other$as_list()
      } else {
        other <- as.list(other)
      }

      n_channels <- self$n_channels
      if(length(other$channel_numbers) == n_channels) {
        self$set_contact_channels( other$channel_numbers )
      } else {
        warning(sprintf("The number of electrode contacts [%s] mismatches with prototype [%s]",
                        length(other$channel_numbers), n_channels))
      }
      if(length(other$world_control_points) >= 6) {
        tcp <- matrix(data = other$world_control_points, nrow = 3L, dimnames = NULL)
        tryCatch({
          self$set_transform(other$transform)
          self$set_transform_from_points(x = tcp[1, ], y = tcp[2, ], z = tcp[3, ], up = other$world_up)
        }, error = function(e) {
          warning(e)
        })
      }
      self$set_transform(other$transform)
      invisible(self)
    },

    validate = function() {
      if(length(self$type) != 1 || !nzchar(self$type)) {
        stop("Electrode prototype `type` shouldn't be empty.")
      }
      if(!is.matrix(private$.model_control_points) || nrow(private$.model_control_points) < 2L ) {
        warning("Electrode prototype control points (model) must be a matrix with at least 2-3 points. Please use `set_model_control_points` to set them")
      }
      invisible()
    },

    format = function(...) {
      self$as_json()
    },

    print = function(..., details = TRUE) {
      n_mcp <- length(private$.model_control_points) / 3
      n_anchors <- 0
      if(length(private$.model_control_point_orders)) {
        n_anchors <- sum(is.na( private$.model_control_point_orders ))
      }
      if(sum((self$model_direction) ^ 2) > 0) {
        dir <- self$transform %*% c(self$model_direction, 0.0)
        euler_axis <- paste(sprintf("%.1f", dir[1:3]), collapse = ", ")
      } else {
        euler_axis <- "None"
      }
      pos <- paste(sprintf("%.1f", self$transform[1:3, 4]), collapse = ", ")
      mat <- apply(format(self$transform, ...), 1L, function(x) {
        sprintf("      [%s]", paste(x, collapse = "\t"))
      })
      cat(
        sep = "",
        "<Electrode Geometry Prototype>\n",
        sprintf("  Type        : %s\n", self$type),
        sprintf("  Description : %s\n", self$description),
        sprintf("  Channels    : %d\n", self$n_channels),
        sprintf("  Anchors     : %d contacts, %d non-contacts\n", n_mcp - n_anchors, n_anchors)
      )
      if( details ) {
        cat(
          sep = "",
          sprintf("  Mesh info   : %d vertices, %d triangle faces\n",
                  private$.n_vertices, length(private$.index) / 3),
          sprintf("  Euler axis  : [%s]\n", euler_axis),
          sprintf("  Position    : [%s]\n", pos),
          "  Matrix      : (model to tk-registered RAS)\n",
          paste(mat, collapse = "\n"), "\n"
        )
      }
      invisible(self)
    },

    save_as_default = function( force = FALSE ) {
      existing_protos <- list_electrode_prototypes()
      type <- toupper(self$type)
      path <- existing_protos[[ type ]]

      root_path <- prototype_search_paths()[[1]]
      target_path <- file.path(root_path, sprintf("%s.json", type))

      if(length(path) == 1 && file.exists(path)) {
        if( force ) {
          if( file.exists(target_path) ) {
            file.rename(target_path, paste0(
              target_path,
              strftime(Sys.time(), format = ".%y%m%d_%H%M%S.bkup")
            ))
          }
        } else {
          warning(
            "Electrode geometry prototype [",
            type,
            "] already exists at\n  -> ",
            existing_protos[[type]],
            "\nThis function should be used only if you want to create/edit electrode prototypes. \n",
            "If you just want to load a geometry prototype, please use\n",
            "  -> threeBrain::load_prototype('", type, "')\n",
            "Please consider renaming `type` or overwrite by calling `prototype$save_as_default(force = TRUE)`"
          )
          return()
        }
      }

      self$as_json(to_file = target_path)
      invisible(normalizePath(target_path))
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
    contact_sizes = function() {
      if(!length(private$.contact_sizes)) { return(rep(0.1, self$n_channels))}
      return(private$.contact_sizes)
    },
    model_direction = function( dir ) {
      if(!missing(dir)) {
        if(is.null(dir)) {
          private$.model_direction <- c(0, 0, 0)
        } else {
          dir <- as.double(dir[])
          if(length(dir) != 3L || anyNA(dir)) {
            stop("Electrode direction/normal must have length of 3 and cannot contain NA")
          }
          if(sum(dir^2) > 0) {
            # normalize
            dir <- dir / sqrt(sum(dir^2))
          }
          private$.model_direction <- dir
        }
      }
      if(length(private$.model_direction) != 3) {
        private$.model_direction <- c(0, 0, 0)
      }
      private$.model_direction
    },
    model_up = function( dir ) {
      if(!missing(dir)) {
        if(is.null(dir)) {
          private$.model_up <- c(0, 0, 0)
        } else {
          dir <- as.double(dir[])
          if(length(dir) != 3L || anyNA(dir)) {
            stop("Electrode `up` direction must have length of 3 and cannot contain NA")
          }
          if(sum(dir^2) > 0) {
            # normalize
            dir <- dir / sqrt(sum(dir^2))
          }
          private$.model_up <- dir
        }
      }
      if(length(private$.model_up) != 3) {
        private$.model_up <- c(0, 0, 0)
      }
      private$.model_up
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
    # marker_map = function() { private$.marker_map },
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

      # TODO add column contact order
      # channel_numbers <- self$channel_numbers
      # if( length(order) != n)
      order <- private$.model_control_point_orders
      channels <- NA
      tryCatch({
        if(length(order) == n) {
          channels <- self$channel_numbers[ order ]
        }
      }, error = function(e) {})

      data.frame(
        model_x = mcp[, 1],
        model_y = mcp[, 2],
        model_z = mcp[, 3],
        tkr_R = tcp_[, 1],
        tkr_A = tcp_[, 2],
        tkr_S = tcp_[, 3],
        Channel = channels
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


#' @title List or load all electrode prototypes
#' @description
#' List all built-in and user-customized electrode prototypes. User paths
#' will be searched first, if multiple prototype configuration files are found
#' for the same type.
#' @param type electrode type, character
#' @returns \code{list_electrode_prototypes} returns a named list, names are
#' the prototype types and values are the prototype configuration paths;
#' \code{load_prototype} returns the prototype instance if \code{type} exists,
#' or throw an error.
#'
#' @examples
#'
#' availables <- list_electrode_prototypes()
#' if( "sEEG-16" %in% names(availables) ) {
#'   proto <- load_prototype( "sEEG-16" )
#'
#'   print(proto, details = FALSE)
#' }
#'
#'
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
      pnames <- toupper(pnames)
      re[ pnames ] <<- file.path(path, fnames)
    }
  })
  re
}

#' @rdname list_electrode_prototypes
#' @export
load_prototype <- function( type ) {
  li <- list_electrode_prototypes()
  path <- li[[ toupper(type) ]]
  if(!length(path)) { stop("No such electrode geometry prototype: ", type) }
  prototype <- ElectrodePrototype$new("")
  prototype$from_json(json = path, is_file = TRUE)
}

