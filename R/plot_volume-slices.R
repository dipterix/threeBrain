#' Plot slices of volume
#' @param volume path to volume
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
#' @param ... additional arguments passing into \code{\link[graphics]{image}}
#' @returns Nothing
#' @export
plot_slices <- function(
    volume, transform = NULL, positions = NULL, zoom = 1, pixel_width = 0.5,
    col = c("black", "white"), normalize = NULL, zclip = NULL,
    zlim = normalize, main = "", title_position = c("left", "top"),
    fun = NULL, nc = NA, ...) {
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

  title_position <- match.arg(title_position)

  if( is.character(volume) ) {
    volume <- read_volume(volume)
  }
  if(!inherits(volume, "threeBrain.volume")) {
    stop("`volume` must be character or threeBrain.volume")
  }
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
  pal <- grDevices::colorRampPalette(col)(256)

  x <- seq(-127.5, 127.5, by = abs(pixel_width * zoom)) / zoom
  nx <- length(x)

  pos <- rbind(t(as.matrix(expand.grid(x, x, KEEP.OUT.ATTRS = FALSE))), 0, 1)

  more_args <- list(...)
  more_args$axes <- FALSE
  more_args$asp <- 1
  more_args$col <- pal
  more_args$zlim <- zlim
  more_args$useRaster <- TRUE
  more_args$main <- ''
  more_args$x <- x
  more_args$y <- x
  more_args$add <- FALSE

  oldpar <- graphics::par(no.readonly = TRUE)

  if(!length(nc) || is.na(nc[[1]])) {
    nc <- grDevices::n2mfrow(npts, asp = 1/3)[[2]]
  } else {
    nc <- nc[[1]]
  }
  nc <- min(max(round(nc), 1), npts)
  nr <- ceiling(npts / nc)
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
  }

  graphics::par(
    bg = pal[[1]],
    fg = pal[[length(pal)]],
    col.main = pal[[length(pal)]],
    col.axis = pal[[1]],
    mar = c(0,0,0,0)
  )
  on.exit({ do.call(graphics::par, oldpar) })

  # Calculate plt
  pin <- graphics::par("din")
  pin[[1]] <- (pin[[1]] - 0.8 / 2.54) / nc / 3
  pin[[2]] <- pin[[2]] / nr
  if(pin[[1]] > pin[[2]]) {
    ratio <- pin[[2]] / pin[[1]]
    plt <- c( 0.5 - ratio / 2, 0.5 + ratio / 2, 0, 1 )
  } else {
    ratio <- pin[[1]] / pin[[2]]
    plt <- c( 0, 1, 0.5 - ratio / 2, 0.5 + ratio / 2 )
  }
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

  lapply(seq_len(npts), function(ii) {
    pos_pt <- c(positions[ii, ], 0)

    adjust_plt(reset = TRUE)
    graphics::plot.new()
    if(title_position == "top") {
      graphics::mtext(side = 1, line = -1, text = main[[ii]], las = 0)
    } else {
      graphics::mtext(side = 4, line = -1.5, text = main[[ii]], las = 0)
    }

    # Axial
    # translate x transform_inv x translate^-1 x Norig
    IJK <- round(world2ijk[c(1, 2, 3), ] %*% (transform_inv %*% pos + pos_pt)) + 1L
    sel <- IJK[1,] > shape[[1]] | IJK[2,] > shape[[2]] | IJK[3,] > shape[[3]]
    IJK[,sel] <- NA
    IJK[IJK < 1] <- NA
    idx <- t(IJK - 1) %*% cumshape + 1
    slice <- nu(volume$data[idx])

    dim(slice) <- c(nx, nx)
    more_args$z <- slice
    adjust_plt()
    do.call(graphics::image, more_args)
    panel_last( ii, 1 )

    # Sagittal
    IJK <- round(world2ijk[c(1, 2, 3), ] %*% (pos[c(3,1,2,4), , drop = FALSE] + pos_pt)) + 1L
    sel <- IJK[1,] > shape[[1]] | IJK[2,] > shape[[2]] | IJK[3,] > shape[[3]]
    IJK[,sel] <- NA
    IJK[IJK < 1] <- NA
    idx <- t(IJK - 1) %*% cumshape + 1
    slice <- nu(volume$data[idx])

    dim(slice) <- c(nx, nx)
    more_args$z <- slice
    adjust_plt()
    do.call(graphics::image, more_args)
    panel_last( ii, 2 )

    # Coronal
    IJK <- round(world2ijk[c(1, 2, 3), ] %*% (pos[c(1,3,2,4), , drop = FALSE] + pos_pt)) + 1L
    sel <- IJK[1,] > shape[[1]] | IJK[2,] > shape[[2]] | IJK[3,] > shape[[3]]
    IJK[,sel] <- NA
    IJK[IJK < 1] <- NA
    idx <- t(IJK - 1) %*% cumshape + 1
    slice <- nu(volume$data[idx])

    dim(slice) <- c(nx, nx)
    more_args$z <- slice
    adjust_plt()
    do.call(graphics::image, more_args)
    panel_last( ii, 3 )

    NULL
  })

  invisible()
}
