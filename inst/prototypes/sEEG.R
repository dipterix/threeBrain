# 0.0,0.0,2.0,1.5,2.0,1.5,2.0,1.5,2.0,1.5,2.0,1.5,2.0,1.5,2.0,1.5,2.0,1.5,2.0,1.5,2.0,1.5,2.0,1.5,2.0,1.5,2.0,1.5,2.0,1.5,2.0,1.5,2.0,30.0
# -1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,3
# 0.8

seeg_prototype <- function(
    center_position, widths, radius = 0.5, segments = 1,
    channel_order = seq_along(center_position), fix_contact = 1) {

  # DIPSAUS DEBUG START
  # center_position <- 0.75 + c(3.5 * 1:16)
  # widths <- 1.5
  # radius = 0.5
  # segments = 1
  # channel_order = seq_along(center_position)
  width_segments <- 12

  npos <- length(center_position)
  if(length(widths) == 1) {
    widths <- rep(widths, npos)
  }
  if(length(segments) == 1) {
    segments <- rep(segments, npos)
  }
  stopifnot(npos == length(widths))
  stopifnot(npos == length(segments))
  stopifnot(npos == length(channel_order))

  # widthSegment = 12, heightSegment = ?
  max_p <- max(center_position + widths / 2)
  max_e <- 200
  radius0 <- radius
  paths <- c(
    radius * (1 - cos(pi / 8 * (seq_len(5) - 1))),
    center_position, max_p, max_p + 0.01,
    max_e
  )
  radius <- c(
    radius * sin(pi / 8 * (seq_len(5) - 1)),
    rep(radius, npos + 3)
  )
  pr <- cbind(paths, radius)
  n_layers <- length(paths)

  x <- cos((seq_len(width_segments) - 1) * 2 * pi / width_segments)
  y <- sin((seq_len(width_segments) - 1) * 2 * pi / width_segments)

  uvu <- 1 / (width_segments - 1) * (seq_len(width_segments) - 1)
  uvu[[1]] <- 0.0001

  positions_n_uv <- apply(pr, 1L, function(zr) {
    z <- zr[[1]]
    r <- zr[[2]]

    if( z == 0 ) {
      x <- 0.0001
    }
    rbind(x * r, y * r, z, uvu, z / max_p)
  })

  nverts <- length(paths) * width_segments
  dim(positions_n_uv) <- c(5, nverts)
  positions_n_uv <- cbind(c(0,0,0,0,0), positions_n_uv, c(0, 0, max_e, 2, 2))
  nverts <- nverts + 2

  positions_n_uv[c(4,5), nverts + 1 - seq_len(width_segments * 2 + 1)] <- 2

  position <- positions_n_uv[1:3, ]
  uv <- positions_n_uv[4:5, ]

  # construct face index
  side_cover <- sapply(seq_len(width_segments), function(ii) {
    jj <- ifelse(ii == width_segments, 1, ii + 1)
    c(ii, 0, jj)
  })
  side_cover <- as.vector(side_cover)

  height_index_base <- sapply(seq_len(width_segments), function(ii) {
    jj <- ifelse(ii == width_segments, 1, ii + 1)
    c(ii, jj, ii + width_segments, jj, jj + width_segments, ii + width_segments)
  })
  height_index <- sapply(seq_len(n_layers - 1), function(layer) {
    height_index_base + (layer - 1) * width_segments
  })
  index <- c(side_cover, as.vector(height_index), nverts - side_cover - 1L)

  texture_size <- c(4, 256)
  uv_start <- (center_position - widths / 2) / max_p
  uv_end <- (center_position + widths / 2) / max_p

  texture_start <- floor(texture_size[[2]] * uv_start) + 1L
  texture_end <- ceiling(texture_size[[2]] * uv_end) + 1L
  channel_map <- rbind(1, texture_start, 4, texture_end - texture_start)

  mesh <- ravetools::vcg_update_normals(
    list(
      vb = position,
      it = index + 1L
    )
  )

  config <- list(
    type = "sEEG-16",
    name = "sEEG with 16 contacts (prototype)",

    # number of vertices and face indices
    n = c(nverts, length(index) - 1L),

    # internal geometry name
    geometry = "CustomGeometry",

    # whether using UV mapping to derive outlines rather than interactively determine the outlines
    fix_outline = TRUE,

    transform = diag(1, 4L),

    position = position,

    index = index,

    normal = mesh$normals[1:3, , drop = FALSE],

    uv = uv,

    texture_size = texture_size,

    channel_map = channel_map,

    contact_center = rbind(0, 0, center_position),
    contact_sizes = rep(radius0, npos),

    # row matrix
    model_control_points = rbind(0, 0, center_position),
    fix_control_index = fix_contact
  )

  proto <- threeBrain:::ElectrodePrototype$new("")$from_list(config)
  proto$validate()

  proto
}

proto <- seeg_prototype(
  center_position = 1 + c(3.5 * 0:15),
  widths = 2,
  radius = 0.5
)
a <- proto$get_texture(seq_len(proto$n_channels), plot = TRUE)

proto$as_json(to_file = "inst/prototypes/sEEG-16.json", flattern = TRUE)

# a <- invisible(proto$get_texture(seq_len(proto$n_channels), plot = TRUE))
#
# proto$preview_3d()
mesh <- proto$as_mesh3d()
mesh$vb[3,] <- mesh$vb[3,] / 50
ravetools::rgl_view({
  ravetools::rgl_call("wire3d", mesh, col = "red")
})



brain <- raveio::rave_brain("devel/mni152_b")
brain$electrodes$remote_geometry(prototype_name = "sEEG-16", delete = TRUE)
brain <- raveio::rave_brain("devel/mni152_b")
brain$plot(debug=TRUE)
