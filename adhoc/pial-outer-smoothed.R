fs_path <- "~/Dropbox (PENN Neurotrauma)/RAVE/Samples/raw/PAV010/rave-imaging/fs/"

surfaces <- c("lh.pial", "rh.pial")

# store filled data
tfile <- tempfile(fileext = ".mgz")

for(surface in surfaces) {
  if(file.exists(tfile)) {
    unlink(tfile, force = TRUE)
  }
  fill_surface(surface = file.path(fs_path, "surf", surface), save_as = tfile, resolution = 256L, delta = 3)
  generate_smooth_envelope(filled_volume_path = tfile, save_as = file.path(fs_path, "surf", sprintf("%s-outer-smoothed", surface)), inflate = 2)
  # unlink(tfile, force = TRUE)
}


brain <- raveio::rave_brain('devel/PAV010')
brain$add_surface("pial-outer-smoothed")
brain$plot()
