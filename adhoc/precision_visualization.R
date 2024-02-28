brain <- raveio::rave_brain("YAEL/Precision001", surfaces = "sphere.reg")
brain$electrodes$geometries
# brain <- threeBrain::threeBrain("~/rave_data/raw_dir/DemoSubject/rave-imaging/fs/", "DemoSubject")
tbl <- brain$electrodes$raw_table
row <- tbl[1,]
row$Electrode = 4
tbl <- rbind(tbl, row)
tbl$Geometry <- c("", "", "", "Precision33X31_G")
brain$set_electrodes(tbl)
electrode <- brain$electrodes$objects[[4]]
# electrode$prototype$set_contact_center(new_electrode_prototype("Precision33x31")$.__enclos_env__$private$.contact_center)

brain$set_electrode_values(tbl)
# electrode$position[1] <- electrode$position[1] - 5
# electrode$subtype <- "CustomGeometry"
# electrode$prototype <- new_electrode_prototype(
#   base_prototype = "Precision33x31",
#   modifier = list(
#     # texture_size = c(9, 100),
#     # transform = diag(c(10,10,1,1)),
#     # channel_map = cbind(expand.grid(c(1,4,7), 1:12 * 2), 2, 1),
#     rotation = function( prototype ) {
#       # prototype$set_model_control_points(
#       #   x = c(-1, 1, 0),
#       #   y = c(0, 0, 2),
#       #   z = c(0, 0, 0)
#       # )
#       prototype$set_transform_from_points(
#         x = tbl$Coord_x,
#         y = tbl$Coord_y,
#         z = tbl$Coord_z
#       )
#
#     }
#   )
# )
# electrode$prototype$transform
# electrode$prototype$as_json()

# electrode$prototype$as_json(file.path(brain$base_path, "RAVE", "geometry", "Precision33x31_G.json"), flattern = TRUE)

self <- electrode$prototype
electrode$prototype$transform

v <- rep(1:8, each = 128)
electrode$set_value(
  value = list(letters[v],letters[v + 3], letters[v + 2]),
  time_stamp = c(0,0.5,1),
  name = "LabelPrefix"
)

time_stamp = seq(0, 1, by = 0.05)
electrode$set_value(
  value = lapply(time_stamp, function(t) {
    sin(seq(-5, 5, length.out = electrode$prototype$n_channels) + 3.142 * t) * 5
  }),
  time_stamp = time_stamp,
  name = "DistanceShifted"
)
electrode$keyframes$LabelPrefix$.__enclos_env__$private$.values
electrode$prototype$get_texture(v)
electrode$prototype$texture_size
electrode$prototype$preview_texture()
electrode$prototype$preview_3d()

electrode$keyframes$LabelPrefix$value_names
electrode$keyframes$LabelPrefix$.__enclos_env__$private$.values

c <- ColorMap$new(name = "LabelPrefix", .list = dipsaus::drop_nulls(brain$electrodes$objects))
c$value_names
brain$plot(
  debug = TRUE,
  controllers = list(
    "Display Data" = "LabelPrefix"
  )
)

