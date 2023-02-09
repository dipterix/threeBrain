
as_mesh3d <- function(surface, ...) {
  if(!is.list(surface)) {
    if(isTRUE(is.character(surface))) {
      surface <- freesurferformats::read.fs.surface(surface, ...)
    } else {
      stop("as_mesh3d: surface must be character to freesurfer surface file, fs.surface, or mesh3d.")
    }
  }
  if(inherits(surface, "fs.surface")) {
    surface <- structure(list(
      vb = rbind(t(surface$vertices), 1.0),
      it = t(surface$faces)
    ), class = "mesh3d")
  }
  if(inherits(surface, "mesh3d")) {
    return(surface)
  }
  stop("as_mesh3d: unknown surface")
}

as_integer3 <- function(x) {
  if(length(x) == 3 && all(is.finite(x) & abs(x - round(x)) < 1e-4)) {
    return(round(x))
  }
  stop("as_integer3: `x` must be an integer vector of length 3, no NA,NaN,Inf is allowed")
}

isolated_index <- function(x, dimension = dim(x), delta = 2) {
  tmp <- dipsaus::deparse_svec(x, concatenate = FALSE)
  tmp <- unlist(lapply(tmp, function(s) {
    s <- dipsaus::parse_svec(s)
    if(length(s) <= delta) { return(s) }
    return(NULL)
  }))
  if(length(tmp)) {
    tmp <- arrayInd(tmp, .dim = dimension)
  } else {
    tmp <- integer(0)
    dim(tmp) <- c(0L, length(dimension))
  }
  tmp
}

#' Fill in a surface with given volume size
#' @description Ray-marching through each margin to find a volume that are
#' inside of a water-tight mesh
#' @param surface a 'FreeSurfer' surface object, or file path to the object,
#' or a \code{'rgl'} \code{'mesh3d'} object; must be closed, water-tight
#' @param save_as path to file where the results should be saved; the format
#' is 'FreeSurfer' \code{'mgz'}; default is \code{NULL} (no save)
#' @param resolution volume resolution; default is to store results in a
#' \code{256 x 256 x 256} cube
#' @param delta threshold to remove isolated points that are wrongfully created
#' @param IJK2RAS a \code{4 x 4} volume 'IJK' index to anatomical 'RAS'
#' transform; default is automatically determined
#' @param verbose whether to verbose the progress; default is true
#' @returns A list of filled volume with \code{IJK2RAS} matrix; if
#' \code{save_as} is valid, a \code{'mgz'} file will be saved
#'
#' @examples
#'
#'
#' library(threeBrain)
#' if(file.exists(file.path(default_template_directory(), "N27"))) {
#'
#'   lh_pial <- file.path(default_template_directory(),
#'                        "N27", "surf", "lh.pial.asc")
#'   save_as <- tempfile(fileext = ".mgz")
#'
#'   fill_surface(lh_pial, save_as)
#'
#'   # you can view `save_as` in FreeSurfer viewer
#'
#' }
#'
#'
#' @export
fill_surface <- function(
    surface, save_as = NULL, resolution = 256, delta = 2, IJK2RAS = NULL, verbose = TRUE) {

  if(!dipsaus::package_installed("Rvcg")) {
    stop("Package `Rvcg` not installed. Please run \n  install.packages('Rvcg')")
  }

  # DIPSAUS DEBUG START
  # surface <- '~/Dropbox (PENN Neurotrauma)/RAVE/Samples/raw/PAV010/rave-imaging/fs/surf/lh.pial'
  # resolution <- 256
  # IJK2RAS <- matrix(nrow = 4, byrow = TRUE, c(
  #   -1, 0, 0, resolution / 2,
  #   0, 0, 1, -resolution / 2,
  #   0, -1, 0, resolution / 2,
  #   0, 0, 0, 1
  # ))
  # save_as <- tempfile()
  # verbose <- TRUE

  debug <- function(...){
    if(verbose) {
      cat(...)
    }
  }

  ncores <- dipsaus::detectCores()
  surface <- as_mesh3d(surface)

  if(is.null(IJK2RAS)) {
    IJK2RAS <- matrix(nrow = 4, byrow = TRUE, c(
      -1, 0, 0, resolution / 2,
      0, 0, 1, -resolution / 2,
      0, -1, 0, resolution / 2,
      0, 0, 0, 1
    ))
  }
  # IJK starts from 0, R starts from 1
  surface$vb <- solve(IJK2RAS) %*% surface$vb + 1

  # We don't need surface to be too fine grain
  surface <- Rvcg::vcgUniformRemesh(surface, voxelSize = 1, discretize = TRUE, mergeClost = TRUE, multiSample = TRUE, silent = !verbose)
  min_avg_edgelength <- min(Rvcg::vcgMeshres(surface)$edgelength)

  surface_range <- range(surface$vb[-4, ])
  surface_range[[1]] <- floor(surface_range[[1]])
  surface_range[[2]] <- ceiling(surface_range[[2]])
  resolution <- ceiling(resolution)
  if(!is.finite(resolution) || resolution < ceiling(surface_range[[2]]) + 1) {
    stop("generate_outer_smooth: `resolution` is too small: at least ", ceiling(surface_range[[2]]) + 1, " voxels are required on each margin.")
  }

  # generate volume
  volume <- array(0L, dim = rep(resolution, 3))
  ray_pos0 <- t(as.matrix(expand.grid(
    seq(surface_range[[1]] - 1, surface_range[[2]] + 1),
    seq(surface_range[[1]] - 1, surface_range[[2]] + 1)
  )))

  ray_march <- function(ray_margin) {
    # margin 1: set rays from XY plane and ray-cast along Z -1 -> 1
    raydist_min <- max(surface_range[[1]] - 2, 0)
    raydist_max <- surface_range[[2]] + 1

    n_rays <- ncol(ray_pos0)
    ray_pos <- array(1, c(4, n_rays))
    if( ray_margin == 1 ) {
      ray_pos <- rbind(1, ray_pos0[1, ], ray_pos0[2, ], 1)
    } else if( ray_margin == 2 ) {
      ray_pos <- rbind(ray_pos0[1, ], 1, ray_pos0[2, ], 1)
    } else {
      ray_pos <- rbind(ray_pos0[1, ], ray_pos0[2, ], 1, 1)
    }
    ray_normal <- array(0, dim(ray_pos))
    ray_normal[c(ray_margin, 4L),] <- 1
    fill_values <- rep(0L, ncol(ray_pos))
    needs_negate <- NA
    while(n_rays > 0) {
      rays <- structure(list(
        vb = ray_pos,
        normals = ray_normal
      ), class = "mesh3d")

      intersects <- Rvcg::vcgRaySearch(
        x = rays, mesh = surface, threads = ncores, mindist = FALSE,
        mintol = raydist_min,
        maxtol = raydist_max
      )
      has_intersects <- intersects$quality == 1
      n_rays <- sum(has_intersects)
      if(n_rays == 0) { break }

      ray_pos <- ray_pos[, has_intersects, drop = FALSE]
      ray_normal <- ray_normal[, has_intersects, drop = FALSE]
      intersect_normals <- intersects$normals[, has_intersects, drop = FALSE]
      intersects <- intersects$vb[, has_intersects, drop = FALSE]
      fill_values <- fill_values[has_intersects]

      # calculate intersect direction
      intersect_innerprod <- colSums(
        ray_normal[1:3,,drop = FALSE] *
          intersect_normals[1:3,,drop = FALSE]
      )
      if(is.na(needs_negate)) {
        if(sum(intersect_innerprod > 0) > sum(intersect_innerprod < 0)) {
          needs_negate <- TRUE
        }
      }
      if(needs_negate) {
        intersect_innerprod <- -intersect_innerprod
      }

      new_pos <- intersects[ray_margin,]
      # sel <- new_pos <= ray_pos[ray_margin,]

      intersects[ray_margin,] <- floor(intersects[ray_margin,])
      intersects[4,] <- ray_pos[ray_margin,]

      # intersects index starts from 0
      intersects <- intersects - 1

      fill_idx <- lapply(seq_along(intersect_innerprod), function(ii) {
        last_value <- fill_values[[ii]]
        entering <- intersect_innerprod[[ii]] < -0.001
        if( last_value == 0L ) {
          if( entering ) {
            fill_values[[ii]] <<- 1L
          }
          return(NULL)
        }
        if( entering ) {
          # last intersect was singular point
          return(NULL)
        }
        # leaving
        x <- intersects[, ii]
        fill_values[[ii]] <<- 0L

        base_idx <- x[[1]] + x[[2]] * resolution + x[[3]] * (resolution^2) + 1
        additional_idx <- seq_len(x[[ray_margin]] - floor(x[[4]]))
        base_idx - additional_idx *  (resolution^(ray_margin - 1))
      })
      fill_idx <- unlist(fill_idx)

      if(length(fill_idx)) {
        volume[fill_idx] <- volume[fill_idx] + 1L
      }

      step_size <- abs(intersect_innerprod)
      step_size[step_size < 1e-4] <- 1e-4
      step_size <- step_size / 2 * min_avg_edgelength
      ray_pos[ray_margin,] <- new_pos + step_size
      raydist_min <- 0
      raydist_max <- surface_range[[2]] - min(new_pos)

      # print(c(n_rays, raydist_max))
      # image(volume[,,128])
      # image(volume[,128,])
      # image(volume[128,,])
      # plot.new()
    }
    volume
  }


  # par(mfrow = c(2,2), mar = rep(0, 4))
  debug("Ray-marching (1 of 3)\r")
  volume <- ray_march(1)
  debug("Ray-marching (2 of 3)\r")
  volume <- ray_march(2)
  debug("Ray-marching (3 of 3)\r")
  volume <- ray_march(3)
  volume[volume > 0L] <- 1L


  debug("Removing isolated voxels (1 of 2)\r")
  idx_falsepositive <- NULL

  volume_perm <- volume
  tmp <- isolated_index(volume_perm > 0, delta = delta)
  idx_falsepositive <- rbind(idx_falsepositive, tmp[, c(1,2,3)])

  volume_perm <- aperm(volume, c(2,1,3))
  tmp <- isolated_index(volume_perm > 0, delta = delta)
  idx_falsepositive <- rbind(idx_falsepositive, tmp[, c(2,1,3)])

  volume_perm <- aperm(volume, c(3, 1, 2))
  tmp <- isolated_index(volume_perm > 0, delta = delta)
  idx_falsepositive <- rbind(idx_falsepositive, tmp[, c(2,3,1)])

  if(length(idx_falsepositive)) {
    idx_falsepositive <- t(unique(idx_falsepositive)) - 1
    volume[idx_falsepositive * c(1, resolution, resolution^2) + 1] <- 0L
  }

  idx_falsenegative <- NULL
  debug("Removing isolated voxels (2 of 2)\r")
  volume_perm <- volume
  tmp <- isolated_index(volume_perm == 0, delta = delta)
  idx_falsenegative <- rbind(idx_falsenegative, tmp[, c(1,2,3)])

  volume_perm <- aperm(volume, c(2,1,3))
  tmp <- isolated_index(volume_perm == 0, delta = delta)
  idx_falsenegative <- rbind(idx_falsenegative, tmp[, c(2,1,3)])

  volume_perm <- aperm(volume, c(3, 1, 2))
  tmp <- isolated_index(volume_perm == 0, delta = delta)
  idx_falsenegative <- rbind(idx_falsenegative, tmp[, c(2,3,1)])

  if(length(idx_falsenegative)) {
    idx_falsenegative <- t(unique(idx_falsenegative)) - 1
    volume[idx_falsenegative * c(1, resolution, resolution^2) + 1] <- 1L
  }

  re <- structure(list(
    volume = volume,
    IJK2RAS = IJK2RAS
  ))

  if(length(save_as) == 1) {
    debug("Writing to:", save_as, "\n")
    freesurferformats::write.fs.mgh(filepath = save_as, data = volume, vox2ras_matrix = IJK2RAS, mri_dtype = 'MRI_UCHAR')
    return(invisible(re))
  } else {
    debug("Done filling surface               \n")
    return(re)
  }

}


#' @title Generate smooth envelope around surface
#' @description Alternative to 'Matlab' version of \code{'pial-outer-smoothed'},
#' use this function along with \code{\link{fill_surface}}.
#' @param filled_volume_path path to \code{'mgz'} with filled volume, see
#' \code{save_as} in \code{\link{fill_surface}}
#' @param save_as save final envelope to path
#' @param inflate number of \code{'voxels'} to inflate before fitting envelope;
#' must be a non-negative integer
#' @param verbose whether to verbose the progress; default is true
#' @returns Nothing, the result is saved to \code{save_as}
#'
#' @examples
#'
#' library(threeBrain)
#' if(file.exists(file.path(default_template_directory(), "N27"))) {
#'
#'   lh_pial <- file.path(default_template_directory(),
#'                        "N27", "surf", "lh.pial.asc")
#'   tmp_volume <- tempfile(fileext = ".mgz")
#'
#'   fill_surface(lh_pial, tmp_volume)
#'
#'   save_as <- tempfile(fileext = ".pial-outer-smoothed")
#'   generate_smooth_envelope(tmp_volume, save_as)
#'
#'   # see file `save_as` as leptomeningeal approximation
#'
#' }
#'
#' @export
generate_smooth_envelope <- function(filled_volume_path, save_as, inflate = 2, verbose = TRUE) {

  # filled_volume_path <- tempfile()
  # fill_surface(surface, save_as = filled_volume_path, delta = 3, resolution = 256L)

  if(!dipsaus::package_installed("Rvcg")) {
    stop("Package `Rvcg` not installed. Please run \n  install.packages('Rvcg')")
  }

  force(save_as)

  debug <- function(...) {
    if(verbose) {
      cat(...)
    }
  }


  # using tkrRAS
  volume <- freesurferformats::read.fs.mgh(filepath = filled_volume_path, with_header = TRUE)
  volume_data <- volume$data[,,,1]
  volume_shape <- dim(volume_data)
  cum_shape <- cumprod(c(1, volume_shape))[seq_along(volume_shape)]

  # Calculate IJK to tkrRAS
  Norig <- volume$header$vox2ras_matrix
  Torig <- Norig[1:4, 1:3]
  Torig <- cbind(Torig, -Torig %*% volume$header$internal$Pcrs_c)
  Torig[4, 4] <- 1

  debug("Inflating volume with radius of ", inflate, "\n")

  # inflate volume_data
  inflate <- max(ceiling(inflate), 0)
  shifts <- as.matrix(expand.grid(
    seq(-inflate, inflate, by = 1L),
    seq(-inflate, inflate, by = 1L),
    seq(-inflate, inflate, by = 1L)
  ))
  idx0 <- which(volume_data > 0)

  for(ii in seq_len(nrow(shifts))) {
    shift <- shifts[ii, , drop = TRUE]
    idx <- idx0 + sum(shift * cum_shape)
    volume_data[idx] <- 1
  }

  # generate surface from envelop
  debug("Generating surface from volume...\n")
  envelope <- Rvcg::vcgIsosurface(volume_data, threshold = 0.5, IJK2RAS = Torig)
  # rgl::close3d(); rgl::open3d()
  # mat <- matrix(1:4, 2, 2)
  # mat <- rbind(matrix(1:4, 2, 2))
  # rgl::layout3d(mat, height = c(1,1), sharedMouse = TRUE)

  debug("Smoothing envelope + re-mesh (1 of 3)\n")
  envelope_smoothed <- Rvcg::vcgSmooth(
    envelope,
    "surfPreserveLaplace",
    lambda = 10,
    delta = 20
  )
  # rgl::shade3d(envelope_smoothed, col = 3); rgl::next3d()

  # remesh: merge small edges
  envelope_remeshed <- Rvcg::vcgIsotropicRemeshing(envelope_smoothed, TargetLen = 2.5)
  # rgl::shade3d(envelope_remeshed, col = 3); rgl::next3d()

  debug("Smoothing envelope + re-mesh (2 of 3)\n")
  envelope_smoothed <- Rvcg::vcgSmooth(
    envelope_remeshed, type = "surfPreserveLaplace",
    lambda = 10,
    delta = 20
  )
  # rgl::shade3d(envelope_smoothed, col = 3);
  envelope_remeshed <- Rvcg::vcgUniformRemesh(envelope_smoothed, voxelSize = 1L, discretize = FALSE, multiSample = TRUE, mergeClost = TRUE, silent = !verbose)
  # rgl::shade3d(envelope_remeshed, col = 3); rgl::next3d()

  # save
  freesurferformats::write.fs.surface(
    filepath = save_as,
    vertex_coords = t(envelope_remeshed$vb[c(1,2,3),,drop = FALSE]),
    faces = t(envelope_remeshed$it[c(1,2,3),,drop = FALSE]),
    format = "bin"
  )

}
