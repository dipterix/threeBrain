subject_id = "YAEL/Precision012"
atlas_path = "adhoc/YBA/YBA_1.nii"
radius = 5

subject = ravecore::as_rave_subject(subject_id)
colormap = threeBrain::load_colormap(system.file("palettes", "datacube2", "YBA690ColorLUT.json", package = 'threeBrain'))
brain = ravecore::rave_brain(subject)


ravecore::generate_atlases_from_template(subject, dirname(atlas_path), as_job = FALSE, surfaces = FALSE)
labels = brain$electrodes$get_atlas_labels(
  file.path(subject$imaging_path, "atlases", basename(atlas_path)),
  lut = colormap,
  radius = radius
)
head(labels)

labels$Electrode = brain$electrodes$raw_table$Electrode
write.csv(labels, file = file.path(subject$meta_path, "YBA.csv"))


# visualization
labels <- read.csv(file.path(subject$meta_path, "YBA.csv"))


label_text <- sort(unique(labels$Label1))
colors <- sapply(label_text, function(lbl) {
  x <- colormap$map[[colormap$get_key(lbl) + 1]]
  rgb(x$R, x$G, x$B, maxColorValue = 255)
})
labels$Label1 <- factor(labels$Label1, levels = label_text)

brain$set_electrode_values(labels)
brain$plot(
  palettes = list(Label1 = colors),
  voxel_colormap = colormap,
  controllers = list(
    "Display Data" = "Label1"
  )
)

