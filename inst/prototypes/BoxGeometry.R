config <- list(
  name = "BoxGeometry",

  # number of vertices and face indices
  n = c(40L, 28L),

  # internal geometry name
  geometry = "CustomGeometry",

  # whether using UV mapping to derive outlines rather than interactively determine the outlines
  fix_outline = TRUE,

  transform = diag(1, 4L),

  # geometry vertex positions: n_vertices x 3
  position = structure(c(
    0.5, 0.5, 0.15, 0.5, 0.5, 0.05, 0.5, 0.5, -0.05,
    0.5, 0.5, -0.15, 0.5, -0.5, 0.15, 0.5, -0.5, 0.05, 0.5, -0.5,
    -0.05, 0.5, -0.5, -0.15, -0.5, 0.5, -0.15, -0.5, 0.5, -0.05,
    -0.5, 0.5, 0.05, -0.5, 0.5, 0.15, -0.5, -0.5, -0.15, -0.5, -0.5,
    -0.05, -0.5, -0.5, 0.05, -0.5, -0.5, 0.15, -0.5, 0.5, -0.15,
    0.5, 0.5, -0.15, -0.5, 0.5, -0.05, 0.5, 0.5, -0.05, -0.5, 0.5,
    0.05, 0.5, 0.5, 0.05, -0.5, 0.5, 0.15, 0.5, 0.5, 0.15, -0.5,
    -0.5, 0.15, 0.5, -0.5, 0.15, -0.5, -0.5, 0.05, 0.5, -0.5, 0.05,
    -0.5, -0.5, -0.05, 0.5, -0.5, -0.05, -0.5, -0.5, -0.15, 0.5,
    -0.5, -0.15, -0.5, 0.5, 0.15, 0.5, 0.5, 0.15, -0.5, -0.5, 0.15,
    0.5, -0.5, 0.15, 0.5, 0.5, -0.15, -0.5, 0.5, -0.15, 0.5, -0.5,
    -0.15, -0.5, -0.5, -0.15
  ), dim = c(3L, 40L)),

  # face indices: n_face x 3
  index = structure(c(
    0L, 4L, 1L, 4L, 5L, 1L, 1L, 5L, 2L, 5L, 6L, 2L, 2L, 6L, 3L, 6L, 7L, 3L, 8L,
    12L, 9L, 12L, 13L, 9L, 9L, 13L, 10L, 13L, 14L, 10L, 10L,
    14L, 11L, 14L, 15L, 11L, 16L, 18L, 17L, 18L, 19L, 17L, 18L,
    20L, 19L, 20L, 21L, 19L, 20L, 22L, 21L, 22L, 23L, 21L, 24L,
    26L, 25L, 26L, 27L, 25L, 26L, 28L, 27L, 28L, 29L, 27L, 28L,
    30L, 29L, 30L, 31L, 29L, 32L, 34L, 33L, 34L, 35L, 33L, 36L,
    38L, 37L, 38L, 39L, 37L), dim = c(3L, 28L)),

  # UV texture coordinates (range from 0,1) out-of-range UV will be treated as no texture (black)
  uv = structure(c(
    0, 1, -1, 2, -1, 2, 0, 1, 0, 0, -1, -1, -1, -1, 0, 0, 1, 1,
    2, 2, 2, 2, 1, 1, 1, 0, 2, -1, 2, -1, 1, 0, 1, 1, 0, 1, 2,
    2, -1, 2, 2, 2, -1, 2, 1, 1, 0, 1, 1, 0, 0, 0, 2, -1, -1,
    -1, 2, -1, -1, -1, 1, 0, 0, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0,
    1, 1, 1, 0, 0, 1, 0), dim = c(2L, 40L)),

  # Vertex normals (optional)
  normal = structure(c(
    1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
    0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
    0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1,
    0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0,
    0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
    0, 0, -1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1,
    0, 0, -1, 0, 0, -1, 0, 0, -1), dim = c(3L, 40L)),

  # texture dimensions (int x int)
  texture_size = c(1L, 1L),

  # texture map: how channel is mapped to texture pixels; default is auto
  channel_map = NULL,

  control_points = structure(c(
    1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
    0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
    0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1,
    0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0,
    0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
    0, 0, -1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1,
    0, 0, -1, 0, 0, -1, 0, 0, -1), dim = c(3L, 40L))
)

electrode <- ElectrodePrototype$new()$from_list(config)
electrode$as_json(to_file = "inst/prototypes/BoxGeometry.json")

if(interactive()) {
  electrode$set_texture_size(c(2,20))
  invisible(electrode$get_texture(seq_len(electrode$n_channels), plot = TRUE))

  electrode$preview_texture()

  if( system.file(package = "rgl") != '' ) {
    electrode$preview_3d()
  }
}


