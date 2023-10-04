# threeBrain::download_template_subject("fsaverage")
atlas_type <- "aparc.a2009s+aseg"

map <- threeBrain::freeserfer_colormap()

val_map <- data.frame(
  label = c("Unknown",
            "ctx_lh_G_front_sup", "ctx_lh_S_front_sup",
            "ctx_lh_G_front_middle", "ctx_lh_S_front_middle",
            "ctx_lh_S_precentral-sup-part", "ctx_lh_G_precentral", "ctx_lh_S_precentral-inf-part",
            "ctx_lh_S_front_inf", "ctx_lh_Lat_Fis-ant-Vertical", "ctx_lh_G_front_inf-Opercular",
            "ctx_lh_G_front_inf-Triangul"),
  color = c("#000000",
            "#CF5246", "#CF5246",
            "#B51F2E", "#B51F2E",
            "#F7B799", "#FBD2BB", "#C0DCEB",
            "#053061", "#A0CCE2", "#3581BA", "#327DB7"
            )
)

cmaps <- structure(
  lapply(names(map$map), function(cid) {
    item <- map$map[[cid]]
    if(item$Label %in% val_map$label) {
      col <- val_map$color[val_map$label == item$Label]
      rgb <- col2rgb(col, alpha = FALSE)
      item$R <- rgb[[1]]
      item$G <- rgb[[2]]
      item$B <- rgb[[3]]
      item$color <- col
    } else {
      item$R <- 0
      item$G <- 0
      item$B <- 0
      item$color <- "#ffffff"
    }
    item
  }),
  names = names(map$map)
)
new_cmap <- threeBrain::create_colormap(gtype = "volume", dtype = "discrete", key = names(cmaps), value = sapply(cmaps, "[[", "Label"), color = sapply(cmaps, "[[", "color"))

brain <- threeBrain::threeBrain(
  path = file.path(threeBrain::default_template_directory(), "fsaverage"),
  subject_code = "fsaverage",
  atlas_types = atlas_type
)

# subject <- raveio::as_rave_subject(subject)
# brain <- threeBrain::threeBrain(path = subject$freesurfer_path,
#                                 subject_code = subject$subject_code, atlas_types = atlas_type)

wg <- brain$plot(
  voxel_colormap = new_cmap,
  controllers = list(
    "Voxel Type" = brain$atlas_types[[1]],
    "Voxel Display" = "hidden",
    "Surface Color" = "sync from voxels",
    "Blend Factor" = 0.6,
    "Sigma" = 1
  )
)

unlink("~/Desktop/junk/viewer2", recursive = TRUE)
threeBrain::save_brain(wg, "~/Desktop/junk/viewer2", as_zip = TRUE)
