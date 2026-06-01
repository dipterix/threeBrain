# ravemanager::version_info()

subject <- ravecore::new_rave_subject("YAEL", "OCD2")
brain <- ravecore::rave_brain(subject)

burn_seeg <- function(brain, underlay = NULL, resample = NULL,
                      antialias_type = c("reduced", "threshold", "ignore", "fill")) {

  antialias_type <- match.arg(antialias_type)

  coord_table <- brain$electrodes$raw_table

  geometry_fnames <- sprintf("%s_%s", coord_table$Prototype, coord_table$LabelPrefix)
  geometry_fnames <- unique(toupper(geometry_fnames))

  if (is.null(underlay)) {
    underlay <- ieegio::read_volume(brain$volumes$T1$group$group_data$volume_data$absolute_path)
  } else {
    underlay <- ieegio::as_ieegio_volume(underlay)
  }

  if (length(resample) == 3) {
    underlay <- ieegio::resample_volume(underlay, new_dim = resample, na_fill = 0)
  }

  volume_res <- array(0.0, dim = dim(underlay))

  for (geometry_fname in geometry_fnames) {
    # geometry_fname <- geometry_fnames[[1]]
    geometry <- brain$electrodes$geometries[[geometry_fname]]
    prototype <- threeBrain::load_prototype(geometry$type)

    z_pos <- sort(unique(prototype$position[3, ]))

    # for each key point, calculate the radius
    ppos <- prototype$position
    cpos <- prototype$control_points[, 1:3]
    key_radius <- vapply(z_pos, function(z) {
      sel <- which(ppos[3, ] == z)
      sqrt(sum((ppos[1:2, sel[[1]]])^2))
    }, 0.0)

    radius_given_z <- function(p3) {
      idx <- which.min(abs(z_pos - p3))

      if (z_pos[[idx]] == p3) {
        return(key_radius[[idx]])
      }
      if (z_pos[[idx]] < p3) {
        if (idx == length(z_pos)) {
          return(0)
        }
        z1 <- z_pos[[idx]]
        z2 <- z_pos[[idx + 1]]
        r1 <- key_radius[[idx]]
        r2 <- key_radius[[idx + 1]]
      } else {
        if (idx == 1) {
          return(0)
        }
        z1 <- z_pos[[idx - 1]]
        z2 <- z_pos[[idx]]
        r1 <- key_radius[[idx - 1]]
        r2 <- key_radius[[idx]]
      }
      a <- (p3 - z1) / (z2 - z1)

      a * r2 + (1 - a) * r1
    }

    # is electrode
    v_begin <- prototype$channel_map[2, ]
    v_end <- v_begin - 1 + prototype$channel_map[4, ]

    is_electrode <- function(z) {
      # find the nearest z
      # 26.7850 -> 1, 29 -> 0, 32.2850 -> 1
      diff <- abs(z_pos - z)
      idx <- order(diff, decreasing = FALSE)[c(1, 2)]
      zz <- sort(z_pos[idx])

      z1 <- zz[[1]]
      sel <- which(ppos[3, ] == z1)
      uv <- prototype$uv[, sel, drop = FALSE]
      uv1 <- uv[, colSums(uv > 1.1 | uv < -0.1) == 0, drop = FALSE]

      z2 <- zz[[2]]
      sel <- which(ppos[3, ] == z2)
      uv <- prototype$uv[, sel, drop = FALSE]
      uv2 <- uv[, colSums(uv > 1.1 | uv < -0.1) == 0, drop = FALSE]

      if (!length(uv1) || !length(uv2)) {
        return(0L)
      }

      a <- (z - z1) / (z2 - z1)

      v <- mean(uv2[2, ]) * a + (1 - a) * mean(uv1[2, ])

      vidx <- v * (prototype$texture_size[[2]] - 1) + 0.5

      if (any(v_begin <= vidx & v_end >= vidx)) {
        return(1L)
      }
      return(0L)
    }

    # constructing the key points
    key_protopos <- geometry$get_contact_positions(apply_transform = FALSE)
    ends <- rbind(0, 0, c(0, max(z_pos)), 1)
    key_protopos <- rbind(ends[1:3, 1], key_protopos, ends[1:3, 2])

    key_positions <- geometry$get_contact_positions(apply_transform = TRUE)
    ends <- geometry$transform %*% ends
    key_positions <- rbind(ends[1:3, 1], key_positions, ends[1:3, 2])
    key_positions <- brain$Norig %*% solve(brain$Torig) %*% t(cbind(key_positions, 1))
    key_positions <- t(key_positions[1:3, , drop = FALSE])

    curve_prototype <- ravetools::catmull_rom_3d(key_protopos, curve_type = "chordal")
    curve <- ravetools::catmull_rom_3d(key_positions, curve_type = "chordal")

    # plot(curve, use_rgl = FALSE)
    volume_tmp <- ieegio::burn_curve(
      image = underlay,
      curve = curve,
      thickness = function(t) {
        p <- curve_prototype$get_point(t)
        radius_given_z(p[[3]]) * 2
      },
      density = function(t) {
        p <- curve_prototype$get_point(t)
        is_electrode(p[[3]]) * 100 + 50
      },
      antialias_type = antialias_type
    )

    volume_res <- pmax(volume_res, volume_tmp[])

    rm(volume_tmp)
  }

  volume_res <- ieegio::as_ieegio_volume(volume_res, vox2ras = underlay$transforms$vox2ras)

  return(volume_res)
}


res <- burn_seeg(brain, resample = c(384, 384, 384))


ieegio::write_volume(res, "~/Downloads/junk.nii.gz")

