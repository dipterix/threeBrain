#' Plot slices of volume
#' @param volume path to volume (underlay)
#' @param overlays images to overlay on top of the underlay, can be either
#' a vector of paths to the overlay volume images, or a sequence of named lists.
#' Each list item has \code{'volume'} (path to the volume) and \code{'color'}
#' (color of the overlay)
#' @param overlay_alpha transparency of the overlay; default is 0.3
#' @param transform rotation of the volume in scanner \code{'RAS'} space
#' @param positions vector of length 3 or matrix of 3 columns, the \code{'RAS'}
#' position of cross-hairs
#' @param zclip clip image densities; if specified, values outside of this
#' range will be clipped into this range
#' @param fun function with two arguments that will be executed after each
#' image is drawn; can be used to draw cross-hairs or annotate each image
#' @param nc number of "columns" in the plot when there are too many positions,
#' must be positive integer; default is \code{NA} (automatically determined)
#' @param zoom zoom-in radio, default is 1
#' @param pixel_width output image pixel resolution; default is \code{0.5},
#' one pixel is 0.5 millimeters wide
#' @param col color palette, can be a sequence of colors
#' @param normalize range for volume data to be normalized; either \code{NULL}
#' (no normalize) or a numeric vector of length two
#' @param zlim image plot value range, default is identical to \code{normalize}
#' @param main image titles
#' @param title_position title position; choices are \code{"left"} or \code{"top"}
#' @param which which plane to plot; default is \code{NULL}, which will trigger
#' new plots and add titles; set to \code{1} for \code{'Axial'} plane,
#' \code{2} for \code{'Sagittal'}, and \code{3} for \code{'Coronal'}.
#' @param ... additional arguments passing into \code{\link[graphics]{image}}
#' @returns Nothing
#' @export
plot_slices <- function(
    volume, overlays = NULL, transform = NULL, positions = NULL, zoom = 1, pixel_width = 0.5,
    col = c("black", "white"), normalize = NULL, zclip = NULL, overlay_alpha = 0.3,
    zlim = normalize, main = "", title_position = c("left", "top"),
    fun = NULL, nc = NA, which = NULL, ...) {
  # DIPSAUS DEBUG START
  # volume <- "~/rave_data/raw_dir/YAB/rave-imaging/fs/mri/brain.finalsurfs.mgz"
  # list2env(list(transform = NULL, positions = NULL, zoom = 1, pixel_width = 0.5,
  #               col = c("black", "white"), normalize = NULL, zclip = NULL,
  #               zlim = NULL, main = ""), envir=.GlobalEnv)
  # more_args <- list()
  # fun <- NULL
  # positions = rnorm(12)
  # nc <- 1
  # title_position <- "top"
  # overlays <- "~/rave_data/raw_dir/YAB/rave-imaging/fs/mri/aseg.mgz"
  #
  # # test with overlays
  # brain <- ravecore::rave_brain("YAEL/AnonSEEG")
  # root_path <- "/Users/dipterix/Library/CloudStorage/Box-Box/RAVEExternal/YAEL-Andrew-Stanford/rave_data/raw_dir/AnonSEEG/rave-imaging/atlases/OCD Response Tract Atlas (Li 2020)/mixed/"
  # pixel_width <- 1
  # volume <- file.path(brain$base_path, "mri", "T1.mgz")
  # overlays <- list.files(root_path, pattern = "\\.nii.gz$", full.names = TRUE)
  # overlay_alpha <- 0.3

  # Make sure `par` is reset on exit
  oldpar <- graphics::par(no.readonly = TRUE)
  on.exit({ graphics::par(oldpar) })

  title_position <- match.arg(title_position)

  if( is.character(volume) ) {
    volume <- read_volume(volume)
  }
  if(!inherits(volume, "threeBrain.volume")) {
    stop("`volume` must be character or threeBrain.volume")
  }

  pal <- grDevices::colorRampPalette(col)(256)

  more_args <- list(...)
  more_args$axes <- FALSE
  more_args$asp <- 1
  more_args$col <- pal
  more_args$zlim <- zlim
  more_args$useRaster <- TRUE
  more_args$main <- ''
  more_args$xlab <- ""
  more_args$ylab <- ""
  default_add <- isTRUE(more_args$add)
  # more_args$add <- FALSE

  canvas_ratio <- 3
  n_plots <- 3
  if( default_add ) {
    # assuming length(which) == 1 and you want to add to plot
    canvas_ratio <- 1
    n_plots <- 1
  } else {
    if(length(which) > 0) {
      canvas_ratio <- 1
      n_plots <- length(which)
    }
  }


  overlays <- lapply(seq_along(overlays), function(ii) {
    item <- overlays[[ ii ]]
    default_color <- col2hexStr(DEFAULT_COLOR_DISCRETE[[(ii - 1L) %% length(DEFAULT_COLOR_DISCRETE) + 1L]], alpha = overlay_alpha)
    if(is.character(item)) {
      ovol <- read_volume(item)
      return(list(
        volume = ovol,
        color = default_color,
        world2ijk = solve(ovol$Norig)
      ))
    }
    if(!is.list(item)) { return(NULL) }
    if(inherits(item, "threeBrain.volume")) {
      return(list(
        volume = item,
        color = default_color,
        world2ijk = solve(item$Norig)
      ))
    }
    if(!"volume" %in% names(item)) {
      return(NULL)
    }
    if(length(item$color) != 1) {
      item$color <- default_color
    } else {
      item$color <- col2hexStr(item$color, alpha = overlay_alpha)
    }
    item$world2ijk <- solve(item$volume$Norig)
    return( item )
  })

  if(is.null(transform)) {
    transform <- diag(1, 4)
  } else {
    transform[seq_len(3), 4] <- 0
    transform[4, ] <- c(0, 0, 0, 1)
  }

  if(length(zclip) >= 2) {
    zclip <- range(zclip)
  } else if (length(zclip) == 1) {
    zclip <- abs(zclip) * c(-1, 1)
  }

  if(!length(positions)) {
    positions <- c(0,0,0)
  }
  if(!is.matrix(positions)) {
    positions <- matrix(positions, ncol = 3, byrow = TRUE)
  }

  npts <- nrow(positions)


  rg <- range(volume$data, na.rm = TRUE)
  if(length(normalize) == 2) {
    nu <- function(slice) {
      slice <- (slice - rg[[1]]) * (normalize[[2]] - normalize[[1]]) / (rg[[2]] - rg[[1]]) + normalize[[1]]
      if( length(zclip) == 2 ) {
        slice[slice < zclip[[1]]] <- zclip[[1]]
        slice[slice > zclip[[2]]] <- zclip[[2]]
      }
      slice
    }
  } else {
    normalize <- rg
    nu <- function(slice) {
      if( length(zclip) == 2 ) {
        slice[slice < zclip[[1]]] <- zclip[[1]]
        slice[slice > zclip[[2]]] <- zclip[[2]]
      }
      slice
    }
  }
  shape <- dim(volume$data)
  world2ijk <- solve(volume$Norig)
  transform_inv <- solve(transform)
  cumshape <- cumprod(c(1, shape))[seq_len(3)]
  if(length(main) == 0) {
    main <- ""
  }
  main <- rep(main, ceiling(npts / length(main)))

  x <- seq(-127.5, 127.5, by = abs(pixel_width * zoom)) / zoom
  nx <- length(x)

  more_args$x <- x
  more_args$y <- x

  pos <- rbind(t(as.matrix(expand.grid(x, x, KEEP.OUT.ATTRS = FALSE))), 0, 1)

  if(!length(nc) || is.na(nc[[1]])) {
    nc <- grDevices::n2mfrow(npts, asp = 1/n_plots)[[2]]
  } else {
    nc <- nc[[1]]
  }
  nc <- min(max(round(nc), 1), npts)
  nr <- ceiling(npts / nc)

  padding_left <- 0
  padding_top <- 0

  if(!length(which)) {
    if( title_position == "left") {
      lmat <- matrix(seq_len(nr * nc), ncol = nc, byrow = FALSE)
      lmat <- t(apply(lmat, 1, function(l) {
        l <- (l - 1) * 4
        as.vector(rbind(l + 1, l + 2, l + 3, l + 4))
      }))
      dim(lmat) <- c(nr, nc * 4)
      graphics::layout(
        lmat,
        widths = rep(c(graphics::lcm(0.8), 1, 1, 1), times = nc)
      )
      padding_left <- 0.8
    } else {
      lmat <- matrix(seq_len(nr * nc), ncol = nc, byrow = TRUE)
      lmat <- apply(lmat, 2, function(l) {
        l <- (l - 1) * 4
        c(rep(l + 1, each = 3), t(outer(l, c(2,3,4), FUN = "+")))
      })
      dim(lmat) <- c(nr * 3, nc * 2)
      lmat <- t(lmat)
      graphics::layout(
        lmat,
        heights = rep(c(graphics::lcm(0.8), 1), times = nc)
      )
      padding_top <- 0.8
    }

    # The function calls on.exit({ graphics::par(oldpar) }) so no need to reset here
    graphics::par(
      bg = pal[[1]],
      fg = pal[[length(pal)]],
      col.main = pal[[length(pal)]],
      col.axis = pal[[1]],
      mar = c(0,0,0,0)
    )
  }

  # Calculate plt
  pin <- graphics::par("din")
  pin[[1]] <- (pin[[1]] - padding_left / 2.54) / nc / canvas_ratio
  pin[[2]] <- pin[[2]] / nr
  if(pin[[1]] > pin[[2]]) {
    ratio <- pin[[2]] / pin[[1]]
    plt <- c( 0.5 - ratio / 2, 0.5 + ratio / 2, 0, 1 )
  } else {
    ratio <- pin[[1]] / pin[[2]]
    plt <- c( 0, 1, 0.5 - ratio / 2, 0.5 + ratio / 2 )
  }

  # The function calls on.exit({ graphics::par(oldpar) }) so no need to reset here
  adjust_plt <- function(reset = FALSE) {
    if( reset ) {
      graphics::par("plt" = c(0, 1, 0, 1))
    } else {
      graphics::par("plt" = plt)
    }
  }


  panel_last <- fun
  if(is.function(fun)) {
    fun_args <- names(formals(fun))
    if(length(fun_args) < 2 && !"..." %in% fun_args) {
      panel_last <- function(...) { fun() }
    }
  } else {
    panel_last <- function(...) {}
  }

  # create template positions to calculate world positions
  # pre-apply inverse of the rotation to template position
  wpos_axial <- transform_inv %*% pos  # varying RA, S=0 -> axial
  wpos_sagittal <- transform_inv %*% pos[c(3,1,2,4), , drop = FALSE] # varying AS, R=0 -> sagittal
  wpos_coronal <- transform_inv %*% pos[c(1,3,2,4), , drop = FALSE] # varying RS, A=0 -> coronal

  get_ijk <- function(point_position, which_slice, world2ijk, volume_data) {
    wpos <- switch(
      which_slice,
      "axial" = { wpos_axial + point_position },
      "sagittal" = { wpos_sagittal + point_position },
      "coronal" = { wpos_coronal + point_position },
      { stop("Invalid slice type") }
    )
    # world to voxel index
    IJK <- round( world2ijk[c(1, 2, 3), ] %*% wpos )

    # Remove invalid indices
    shape <- dim(volume_data)
    cumshape <- cumprod(c(1, shape))[seq_len(3)]
    sel <- IJK[1,] >= shape[[1]] | IJK[2,] >= shape[[2]] | IJK[3,] >= shape[[3]]
    IJK[, sel] <- NA
    IJK[!is.na(IJK) & IJK < 0] <- NA

    # actual indices
    idx <- cumshape %*% IJK + 1L
    slice <- volume_data[idx]
    dim(slice) <- c(nx, nx)
    slice
  }

  lapply(seq_len(npts), function(ii) {

    pos_pt <- c(positions[ii, ], 0)

    adjust_plt(reset = TRUE)

    if(!length(which)) {
      graphics::plot.new()
      if(title_position == "top") {
        graphics::mtext(side = 1, line = -1, text = main[[ii]], las = 0)
      } else {
        graphics::mtext(side = 4, line = -1.5, text = main[[ii]], las = 0)
      }
    }

    if(!length(which) || 1 %in% which) {
      # Axial
      # translate x transform_inv x translate^-1 x Norig

      underlay <- get_ijk(pos_pt, which_slice = "axial", world2ijk = world2ijk, volume$data)
      more_args$add <- default_add
      more_args$col <- pal
      more_args$z <- nu(underlay)
      adjust_plt()
      do.call(graphics::image, more_args)

      more_args$z <- NULL
      more_args$add <- TRUE
      lapply(overlays, function(item) {
        if(!is.list(item)) { return() }
        overlay <- get_ijk(point_position = pos_pt, which_slice = "axial", world2ijk = item$world2ijk, volume_data = item$volume$data)
        invalids <- is.na(overlay) | overlay < 0.5
        if(!all(invalids)) {
          overlay[invalids] <- NA
          more_args$col <- item$color
          more_args$z <- overlay
          do.call(graphics::image, more_args)
        }
      })

      panel_last( ii, 1 )
    }


    if(!length(which) || 2 %in% which) {
      # Sagittal
      underlay <- get_ijk(pos_pt, which_slice = "sagittal", world2ijk = world2ijk, volume$data)
      more_args$add <- default_add
      more_args$col <- pal
      more_args$z <- nu(underlay)
      adjust_plt()
      do.call(graphics::image, more_args)

      more_args$z <- NULL
      more_args$add <- TRUE
      lapply(overlays, function(item) {
        if(!is.list(item)) { return() }
        overlay <- get_ijk(pos_pt, which_slice = "sagittal", world2ijk = item$world2ijk, item$volume$data)
        invalids <- is.na(overlay) | overlay < 0.5
        if(!all(invalids)) {
          overlay[invalids] <- NA
          overlay_color <- item$color
          more_args$col <- overlay_color
          more_args$z <- overlay
          do.call(graphics::image, more_args)
        }
      })

      panel_last( ii, 1 )
    }

    if(!length(which) || 3 %in% which) {
      # Coronal
      underlay <- get_ijk(pos_pt, which_slice = "coronal", world2ijk = world2ijk, volume$data)
      more_args$add <- default_add
      more_args$col <- pal
      more_args$z <- nu(underlay)
      adjust_plt()
      do.call(graphics::image, more_args)

      more_args$z <- NULL
      more_args$add <- TRUE
      lapply(overlays, function(item) {
        if(!is.list(item)) { return() }
        overlay <- get_ijk(pos_pt, which_slice = "coronal", world2ijk = item$world2ijk, item$volume$data)
        invalids <- is.na(overlay) | overlay < 0.5
        if(!all(invalids)) {
          overlay[invalids] <- NA
          overlay_color <- item$color
          more_args$col <- overlay_color
          more_args$z <- overlay
          do.call(graphics::image, more_args)
        }
      })

      panel_last( ii, 1 )
    }

    NULL
  })

  invisible()
}
