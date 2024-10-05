
# ---- Abbott 6170/6172 (1-3-3-1), 1.5mm size with 0.5 edge-to-edge spacing ----

# marker information
markers <- data.frame(
  width = c(1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 0.5, 1.0, 0.5),

  # The distance between tip to the edge of the contact is around 1mm?
  # 1mm, the 2nd row is around 1+1.5+0.5=3, ...
  distance_to_tip = 1 + c(
    # dis                   # Proximal marker
    0,   2,   2,   2,   4,   4,   4,   6,           10, 10.5, 11.5),
  # clockwise viewing from proximal end
  angle_start = c(
    0,    20, 260, 140,  20, 260, 140,   0,         0,30,0),
  angle_end = c(
    360, 100, 340, 220, 100, 340, 220,   0,         0, 90, 0),
  is_contact = c(
    TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, FALSE,FALSE,FALSE),
  # order = 1 will be fixed, 0 ignored
  anchor_order = c(1, 0, 0, 0, 0, 0, 0,  2,         0,0,0)
)

overall_length <- 400 # 300/400 mm

# Lead diameters mm
diameter <- 1.29  # 1.295

type <- "DBS-Abbott-6170"
description <- paste(c(
  "Abbott Infinity 6170/6172 (8 contacts)",
  "Design           : 1-3-3-1",
  "Contact length   : 1.5  mm",
  "Contact spacing  : 0.5  mm",
  "Tip size         : 1.0  mm*",
  sprintf("Diameter         : %.2f mm", diameter)
), collapse = "\n      ")


# ---- Abbott 6171/6173 (1-3-3-1), 1.5mm size with 1.5 edge-to-edge spacing ----
#
# marker information
markers <- data.frame(
  width = c(1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 0.5, 1.0, 0.5),

  # The distance between tip to the edge of the contact is around 1mm?
  # 1mm, the 2nd row is around 1+1.5+0.5=3, ...
  distance_to_tip = 1 + c(
    0,   3,   3,   3,   6,   6,   6,   9,           15, 15.5, 16.5),
  # counter-clockwise from proximal end
  angle_start = c(
    0,    20, 260, 140,  20, 260, 140, 0,           0, 30, 0),
  angle_end = c(
    360, 100, 340, 220, 100, 340, 220, 0,           0, 90, 0),
  is_contact = c(
    TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, FALSE, FALSE, FALSE),
  # order = 1 will be fixed, 0 ignored
  anchor_order = c(1, 0, 0, 0, 0, 0, 0,  2,         0,0,0)
)

overall_length <- 400 # 300/400 mm

# Lead diameters mm
diameter <- 1.29

type <- "DBS-Abbott-6171"
description <- paste(c(
  "Abbott Infinity 6171/6173 (8 contacts)",
  "Design           : 1-3-3-1",
  "Contact length   : 1.5  mm",
  "Contact spacing  : 1.5  mm",
  "Tip size         : 1.0  mm*",
  sprintf("Diameter         : %.2f mm", diameter)
), collapse = "\n      ")
cat(description)

# ---- Start creating mesh ---------------------------------------------------

up_direction <- c(
  cos( pi / 3 ), sin( pi / 3 ), 0
)

# constants or fixed values
width_segments <- 36
radius <- diameter / 2.0

if(sum(up_direction^2) > 0) {
  up_direction <- up_direction / sqrt(sum(up_direction^2))
}

# ---- Construct position ----------------------------------------------------
# disc shape (first point points to anterior)
x0 <- c( cos((seq_len(width_segments) - 1) * 2 * pi / width_segments), 0.9999)
y0 <- c( sin((seq_len(width_segments) - 1) * 2 * pi / width_segments), 0.0001)

# plot(x0, y0, pch = 20, asp = 1, xlab = "Left <---> Right", ylab = "P <---> A")
# text(x0* 0.9, y0 * 0.9, labels = seq_along(x0) - 1, cex = 0.5)

# Important points along the electrode shaft, unit is 0.01mm
# |-|---contact-----|-|
z_resolution <- 0.01
z_paths <- as.vector(
  rbind(
    markers$distance_to_tip - z_resolution * markers$is_contact,
    markers$distance_to_tip,
    markers$distance_to_tip + markers$width,
    markers$distance_to_tip + markers$width + z_resolution * markers$is_contact
  )
)

is_metal <- as.vector(rbind(
  as.integer(!markers$is_contact),
  1,
  1,
  as.integer(!markers$is_contact)
))

sel <- !duplicated(z_paths)
z_paths <- z_paths[sel]
is_metal <- is_metal[sel]

# tip
tip_paths <- c(0, radius * (1 - cos(pi / 8 * seq_len(4))))
for(z in tip_paths) {
  if(any(z_paths == z)) { next }
  idx1 <- which(z_paths > z)
  idx2 <- which(z_paths < z)
  if(!length(idx2)) {
    z_paths <- c(z, z_paths)
    is_metal <- c(0, is_metal)
  } else {
    z_paths <- c(z_paths[idx2], z, z_paths[-idx2])
    is_metal0 <- is_metal[max(idx2)]
    is_metal <- c(is_metal[idx2], is_metal0, is_metal[-idx2])
  }
}
sel <- z_paths >= 0
z_paths <- z_paths[sel]
is_metal <- is_metal[sel]
z_radius <- sqrt(radius^2 - ifelse(z_paths > radius, 0, radius - z_paths)^2)

# plot(x = z_paths, y = z_paths * 0, pch = ".")
# segments(x0 = z_paths, y0 = -z_radius, x1 = z_paths, y1 = z_radius, col = is_metal + 1)
# segments(x0 = z_paths, y0 = 0, x1 = c(z_paths[-1], z_paths[[length(z_paths)]]+0.01), y1 = 0, col = is_metal + 1)

# construct the mesh position
# z_paths[[1]] has to be 0, but also need a disc at the tail of the electrode
n_discs <- length(z_paths)
pos_x <- as.vector(sapply(seq_len(n_discs), function(ii) {
  if(ii < n_discs) {
    ii <- ii + 1
  }
  x0 * z_radius[ii]
}))
pos_y <- as.vector(sapply(seq_len(n_discs), function(ii) {
  if(ii < n_discs) {
    ii <- ii + 1
  }
  y0 * z_radius[ii]
}))
pos_z <- rep(c(z_paths[-1], overall_length), each = width_segments + 1)

positions <- rbind(0, cbind(pos_x, pos_y, pos_z), c(0, 0, overall_length))
n_pos <- nrow(positions)
# ---- UV --------------------------------------------------------------------
disc_u <- seq(0, width_segments) / width_segments
contact_tail_to_tip <- z_paths[[length(z_paths)]] + max(z_resolution * 2, 0.5)
z_v <- c(z_paths[-1] / contact_tail_to_tip, 2)

uv <- rbind(
  c(0, 0),
  cbind(
    rep(disc_u, n_discs),
    rep(z_v, each = width_segments + 1)
  ),
  c(2, 2)
)
uv[uv > 1] <- 2

# ---- Face index ------------------------------------------------------------
# tip
index_tip <- rbind(
  cbind(0, seq_len(width_segments), seq_len(width_segments) + 1),
  c(0, width_segments + 1, 1)
)

# cap
index_cap <- n_pos - 1 - index_tip

# disc to disc
index_d2d <- rbind(
  cbind(
    seq(0, width_segments - 1),
    seq(width_segments + 1, width_segments + width_segments),
    seq(1, width_segments)
  ),
  cbind(
    seq(1, width_segments),
    seq(width_segments + 1, width_segments + width_segments),
    seq(width_segments + 2, width_segments + width_segments + 1)
  ),
  c(width_segments, width_segments + width_segments + 1, 0),
  c(0, width_segments + width_segments + 1, width_segments + 1)
)
index <- rbind(
  index_tip,
  do.call(
    "rbind",
    lapply(seq_len(n_discs - 1), function(disc_ii) {
      n_skip <- (disc_ii - 1) * (width_segments + 1)
      (n_skip + 1) + index_d2d
    })
  ),
  index_cap
)

index <- index[, c(1, 3, 2)]

# ---- Texture mapping --------------------------------------------------------
# 360 degrees
texture_size <- c(360, ceiling(contact_tail_to_tip / z_resolution))

contact_info <- lapply(seq_len(nrow(markers)), function(row_ii) {
  # row_ii <- 2
  a00 <- markers$angle_start[[ row_ii ]]
  a01 <- markers$angle_end[[ row_ii ]]
  a0 <- a00 %% 360
  a1 <- a01 %% 360
  cz0 <- markers$distance_to_tip[[ row_ii ]]
  cw <- markers$width[[ row_ii ]]

  if(a0 == a1) {
    u0 <- 1
    w <- 360

    cx <- 0
    cy <- 0
    r <- max(radius, cw / 2)
  } else {
    u0 <- a0 + 1
    if( a0 < a1 ) {
      w <- a1 - u0
    } else {
      w <- 360 - a0 + a1
    }
    cx <- cos( (a00 + a01) / 360 * pi ) * radius
    cy <- sin( (a00 + a01) / 360 * pi ) * radius
    r <- min(radius, cw / 2)
  }

  cz <- cz0 + cw / 2
  v0 <- floor(cz0 / z_resolution) + 1
  h <- floor(cw / z_resolution)



  # first 4 are channel mapping, then (3) are contact center, then radius
  c(u0, v0, w, h, cx, cy, cz, r)
})
contact_info <- do.call("cbind", contact_info)
channel_map <- contact_info[1:4, markers$is_contact, drop = FALSE]
contact_center <- contact_info[5:7, markers$is_contact, drop = FALSE]
contact_sizes <- contact_info[8, markers$is_contact, drop = TRUE]

marker_map <- contact_info[1:4, !markers$is_contact, drop = FALSE]
if(!length(marker_map)) { marker_map <- NULL }

# ---- Anchors ----------------------------------------------------------------
anchors <- markers[markers$anchor_order > 0, ]
anchors <- anchors[order(anchors$anchor_order), ]
# anchors <- rbind(anchors, markers[markers$anchor_order <= 0, ])
model_control_points <- cbind(
  0, 0, anchors$distance_to_tip + anchors$width / 2
)
sel <- !duplicated(model_control_points)
model_control_points <- model_control_points[sel, , drop=FALSE]
anchor_order <- anchors$anchor_order[sel]
anchor_order[anchor_order <= 0] <- NA

config <- list(
  type = type,
  name = "",
  description = description,

  # number of vertices and face indices
  n = c(nrow(positions), nrow(index)),

  # internal geometry name
  geometry = "CustomGeometry",

  # whether using UV mapping to derive outlines rather than interactively determine the outlines
  fix_outline = FALSE,

  transform = diag(1, 4L),

  position = as.vector(t(positions)),

  index = as.vector(t(index)),

  normal = NULL,

  uv = as.vector(t(uv)),

  texture_size = texture_size,

  channel_map = as.vector(channel_map),

  marker_map = marker_map,

  contact_center = as.vector(contact_center),
  contact_sizes = contact_sizes,

  # row matrix
  model_direction = c(0, 0, 1),
  model_up = up_direction,  # anterior
  model_rigid = TRUE,

  model_control_points = as.vector(t(model_control_points)),

  model_control_point_orders = rep(NA, length(anchor_order)),

  fix_control_index = 1L,

  viewer_options = list(
    "Slice Mode" = "column-row-slice",
    "Frustum Near" = 0.5,
    "Frustum Far" = 0.5,
    "Voxel Display" = "anat. slices",
    "Symmetric Color Map" = TRUE,
    "Voxel Min" = -2097152,
    "Show Panels" = TRUE,
    "Overlay Coronal" = FALSE,
    "Overlay Sagittal" = FALSE,
    "Overlay Axial" = TRUE,
    "Camera Position" = "superior",
    "Crosshair Gap" = 12
  )
)

proto <- threeBrain:::ElectrodePrototype$new("")$from_list(config); proto
proto$validate()

a <- invisible(proto$get_texture(seq_len(proto$n_channels), plot = TRUE))

proto$preview_3d()

proto$save_as_default(force = TRUE)


mesh = proto$as_mesh3d()
mesh$material$back = "filled"
self = proto
ravetools::rgl_view({
  ravetools::rgl_call("shade3d", mesh)
})
