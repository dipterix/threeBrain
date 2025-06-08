model_file <- read.csv("~/Downloads/126_ch_electrode_geometry.csv")

x <- rep(seq(0, 32, length.out = 64), 64)
y <- rep(seq(0, 30, length.out = 64), each = 64)
channel_info <- data.frame(
  channel = model_file[, 1],
  x = model_file[, 2],
  y = model_file[, 3],
  # diameter = as.numeric(channel_info_[,5]),
  diameter = model_file[, 5],
  port = rep(1, each = 126)
)
anchors <- channel_info[c(1, 21, 106, 126), ]

# electrodes are 3mm apart
lines <- matrix(ncol = 2, byrow = TRUE, c(
  -3, -3,
  -3, 21,
  54, 21,
  54, -3
  # 5, -18,
  # 5, -15,
  # -5, -9,
  # -5, 33,
  # 5, 39,
  # 27, 39,
  # 37,33,
  # 37,-9,
  # 27,-15,
  # 27,-18,
  # 0, 0,
  # 32, 0,
  # 0,30,
  # 32, 30
))


plot(lines, pch = 20, col = 'gray', asp = 1, xlim = range(lines[,1]), ylim = range(lines[,2]), xlab = "x", ylab = 'y')
for(i in seq_len(9)) {
  segments(lines[i, 1], lines[i, 2], lines[i + 1, 1], lines[i + 1, 2])
}

points(12.25, 20)
text(12.25, 20, "Distal edge", cex = 0.4, adj = 0)
points(9.9, 19)
text(9.9, 19, "Electrodes facing out of page", cex = 0.4, adj = 0)


points(
  x = channel_info$x,
  y = channel_info$y,
  pch = 20,
  cex = channel_info$diameter / 150,
  col = channel_info$port + 1
)
text(
  x = channel_info$x,
  y = channel_info$y,
  channel_info$channel
)

abline(v = c(0, 51), lty = 2, col = 'gray80')
abline(h = c(0, 18), lty = 2, col = 'gray80')

text(lines, label = seq_len(nrow(lines)))

# anchors <- rbind(c(-200.1, -195.4, -35.82),
#       c(-193.1, -197, -36.65),
#       c(-186.9, -193.9, -39.15))
# dist(anchors)

# large_contact <- channel_info$diameter > 50

# face index, starting index is 1
index <- matrix(ncol = 3, byrow = TRUE, c(
  1, 4, 2,
  2, 4, 3
))
# bidx <- c(1,2,15, 15,2,16)

config <- list(
  type = "Spencer-126",
  name = "Spencer-MXene-7x18",

  # number of vertices and face indices
  n = c(4L, 2L),

  # internal geometry name
  geometry = "CustomGeometry",

  # whether using UV mapping to derive outlines rather than interactively determine the outlines
  fix_outline = TRUE,

  transform = diag(1, 4L),

  position = t(cbind(lines, 0)),

  index = t(index),

  uv = t(lines + 3) / c(57, 24),

  texture_size = c(57, 24),

  # x, y, width, height in texture_size
  channel_map = rbind(
    channel_info$x + 3,
    channel_info$y + 3,
    2,
    2
  ),

  contact_center = t(cbind(channel_info$x, channel_info$y, 0)),
  contact_sizes = rep(0.5, length(channel_info$x)),

  # row matrix
  model_control_points = cbind(
    c(0, 18, 0),
    c(51, 18, 0),
    c(51, 0, 0),
    c(0, 0, 0)
  )
)

proto <- threeBrain:::ElectrodePrototype$new("")$from_list(config)
proto$validate()

a <- invisible(proto$get_texture(seq_len(proto$n_channels), plot = TRUE))

proto$preview_3d()
proto$save_as_default(force = TRUE)
