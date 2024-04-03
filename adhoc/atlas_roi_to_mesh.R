brain <- raveio::rave_brain("devel/mni152_b")
atlas_path <- file.path(brain$base_path, "RAVE/atlases/Harvard_Oxford_Thr25_2mm_Whole_Brain_Makris_2006")
scan2tkr <- brain$Torig %*% solve(brain$Norig)
fs <- list.files(path = file.path(atlas_path, "mri", "rh"))
raveio::lapply_async( fs, function(f) {
  src_path <- file.path(atlas_path, "mri", "rh", f)
  volume <- threeBrain::read_volume(src_path)
  vol <- ravetools::grow_volume(volume$data, 1)
  mesh <- ravetools::vcg_isosurface(vol, threshold_lb = 0.5, vox_to_ras = scan2tkr %*% volume$Norig)
  mesh2 <- ravetools::vcg_smooth_implicit(mesh)

  dst_path <- file.path(raveio::dir_create2(file.path(atlas_path, "surf")), sprintf("rh.%s", gsub("\\.(nii|nii\\.gz)$", "", f)))
  freesurferformats::write.fs.surface(
    filepath = dst_path,
    vertex_coords = t(mesh2$vb[1:3,,drop=FALSE]),
    faces = t(mesh2$it[1:3,,drop=FALSE])
  )
  f
}, callback = I)


write.csv(
  data.frame(
    Filename = c("rh.Accumbens_R_T1", "rh.Amygdala_R_T1"),
    Type = "surface",
    color = c("#ccff99", "#ff0000")
  ),
  file = "/Users/dipterix/rave_data/raw_dir/mni152_b/rave-imaging/fs/RAVE/atlases/Harvard_Oxford_Thr25_2mm_Whole_Brain_Makris_2006/colormap.csv"
)

ravetools::rgl_view({
  ravetools::rgl_call("shade3d", mesh2)
})
