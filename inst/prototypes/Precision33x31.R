s <- readLines("~/Dropbox (PennNeurosurgery)/RAVE/Samples/Precision001_Zhengjia/Precision_array_mapping.xml")

channel_info_ <- stringr::str_match(trimws(s), "<ElectrodeSite channelNumber=\"([0-9]+)\" x=\"([0-9-]+)\" y=\"([0-9-]+)\" electrodeSize=\"([0-9]+)um\"[ ]{0,}/>")
channel_info_ <- channel_info_[complete.cases(channel_info_), ]
channel_info <- data.frame(
  channel = 1:1024,
  x = as.numeric(channel_info_[,3]),
  y = as.numeric(channel_info_[,4]),
  diameter = as.numeric(channel_info_[,5]),
  port = rep(1:8, each = 128)
)
anchors <- channel_info[which(channel_info$y < 0 | channel_info$y > 31), ]

lines = matrix(ncol = 2, byrow = TRUE, c(
  5, -18,
  5, -15,
  -5, -9,
  -5, 33,
  5, 39,
  27, 39,
  37,33,
  37,-9,
  27,-15,
  27,-18,
  0, 0,
  32, 0,
  0,30,
  32, 30
))


plot(lines, pch = 20, col = 'gray', asp = 1, xlim = range(lines[,1]), ylim = range(lines[,2]), xlab = "x", ylab = 'y')
for(i in seq_len(9)) {
  segments(lines[i, 1], lines[i, 2], lines[i + 1, 1], lines[i + 1, 2])
}

points(12.25, 36)
text(12.25, 36, "Distal edge", cex = 0.4, adj = 0)
points(9.9, 35)
text(9.9, 35, "Electrodes facing out of page", cex = 0.4, adj = 0)
points(9.25, -4)
text(9.25, -4, "Precision Neuroscience", cex = 0.4, adj = 0)
points(12, -5)
text(12, -5, "Layer 7 1024ch Array", cex = 0.4, adj = 0)

points(
  x = channel_info$x,
  y = channel_info$y,
  pch = 20,
  cex = channel_info$diameter / 150,
  col = channel_info$port + 1
)

abline(v = c(0, 32), lty = 2, col = 'gray80')
abline(h = c(0, 30), lty = 2, col = 'gray80')

text(lines, label = seq_len(nrow(lines)))

# anchors <- rbind(c(-200.1, -195.4, -35.82),
#       c(-193.1, -197, -36.65),
#       c(-186.9, -193.9, -39.15))
# dist(anchors)

large_contact <- channel_info$diameter > 50

index = matrix(ncol = 3, byrow = TRUE, c(
  1,10,2,
  2,10,9,
  2,9,8,
  2,8,3,
  3,8,11,
  3,11,13,
  3,13,4,
  11,8,12,
  12,8,14,
  14,8,7,
  11,12,13,
  13,12,14,
  4,13,14,
  4,14,7,
  4,7,6,
  4,6,5
))
bidx <- c(1,2,15, 15,2,16)

# column matrix `pos`
position_transform <- function(pos) {
  t((t(pos) - c(16, 15)) / c(32, 30) * c(13, 12.1))
}

config <- list(
  name = "PrecisionArray",

  # number of vertices and face indices
  n = c(28L, 15L),

  # internal geometry name
  geometry = "CustomGeometry",

  # whether using UV mapping to derive outlines rather than interactively determine the outlines
  fix_outline = TRUE,

  transform = diag(1, 4L),

  position = t(rbind(cbind(position_transform(lines), 0.01), cbind(position_transform(lines), -0.01))),

  index = c(
    as.vector(t(index)),
    as.vector(t(index[,c(1,3,2)] + 14)),
    do.call("c", lapply(0:8, function(x){bidx + x})),
    1,15,10,
    15,24,10
  ),

  uv = t(rbind(lines, lines) + 0.5)  / c(33, 31),

  texture_size = c(33, 31) * 3,

  channel_map = rbind(
    channel_info$x * 3 + 2 - large_contact,
    channel_info$y * 3 + 2 - large_contact,
    ifelse(large_contact, 3, 1),
    ifelse(large_contact, 3, 1)
  ),

  contact_center = t(cbind(position_transform(cbind(channel_info$x, channel_info$y)), 0)),

  # row matrix
  model_control_points = matrix(nrow = 3, byrow = FALSE,
                                as.vector(rbind(t(position_transform(anchors[c(5,2,1),c("x", "y")])), 0)))
)

proto <- threeBrain:::ElectrodePrototype$new()$from_list(config)

a <- invisible(proto$get_texture(seq_len(proto$n_channels), plot = TRUE))

proto$preview_3d()
# mesh <- proto$as_mesh3d(apply_transform = FALSE)
# mesh$texcoords <- mesh$texcoords * proto$texture_size / (proto$texture_size + 1)
# ravetools::rgl_view({
#   ravetools::rgl_call("shade3d", mesh)
# })

# proto$as_json("inst/prototypes/Precision33x31.json")

