raveio::raveio_setopt("raw_data_dir", "/Volumes/BeauchampServe/rave_data/raw")
raveio::raveio_setopt("data_dir", "/Volumes/BeauchampServe/rave_data/ent_data/")

project_name <- "mTurkWords"
subject_code <- "YEZ"
template_name <- "cvs_avg35_inMNI152"

electrodes <- "36-39,46-49,93-99,111-113,139-140,142,145-152,205-208"

max_distance <- 3

# ---- Load data ---------------------------------------------------------------
subject <- raveio::RAVESubject$new(project_name = project_name,
                                   subject_code = subject_code)
brain <- raveio::rave_brain(subject)

electrode_coords <- brain$electrodes$raw_table[
  brain$electrodes$raw_table$Electrode %in% dipsaus::parse_svec(electrodes),
]

# Load surfaces
# Run with Coord_xyz
obj_pial <- brain$add_surface("pial")
obj_white <- brain$add_surface("smoothwm")
if(is.null(obj_white)) {
  obj_white <- brain$add_surface("white")
}
obj_sphere_reg <- brain$add_surface("sphere.reg")
obj_sphere <- brain$add_surface("sphere")

# Load surfaces into memory
pial <- list(
  left = obj_pial$load_mesh("left"),
  right = obj_pial$load_mesh("right")
)
white <- list(
  left = obj_white$load_mesh("left"),
  right = obj_white$load_mesh("right")
)
sphere_reg <- list(
  left = obj_sphere_reg$load_mesh("left"),
  right = obj_sphere_reg$load_mesh("right")
)
sphere <- list(
  left = obj_sphere$load_mesh("left"),
  right = obj_sphere$load_mesh("right")
)

sulc <- list(
  left = freesurferformats::read.fs.curv(file.path(brain$base_path, "surf", "lh.sulc")),
  right = freesurferformats::read.fs.curv(file.path(brain$base_path, "surf", "rh.sulc"))
)
curv <- list(
  left = freesurferformats::read.fs.curv(file.path(brain$base_path, "surf", "lh.curv")),
  right = freesurferformats::read.fs.curv(file.path(brain$base_path, "surf", "lh.curv"))
)
aparc_2009 <- list(
  left = freesurferformats::read.fs.annot("/Volumes/BeauchampServe/rave_data/raw/YEZ/rave-imaging/fs/label/lh.aparc.a2009s.annot"),
  right = freesurferformats::read.fs.annot("/Volumes/BeauchampServe/rave_data/raw/YEZ/rave-imaging/fs/label/rh.aparc.a2009s.annot")
)

stats <- structure(
  names = names(aparc_2009),
  lapply(names(aparc_2009), function(hemi) {
    aparc <- aparc_2009[[hemi]]
    ROI_table <- aparc$colortable_df#[aparc$colortable_df$struct_name %in% c('S_temporal_sup', aparc$colortable_df$struct_name[grepl("temp_sup", aparc$colortable_df$struct_name)]),]

    sel <- aparc$label_codes %in% ROI_table$code
    sts_nodes <- aparc$vertices[sel] + 1
    sts_color <- aparc$hex_colors_rgb[sel]

    # # Find lowest sulc
    # sv <- curv[[hemi]][sts_nodes]
    # pos <- white[[hemi]]$vertices[sts_nodes, , drop = FALSE]
    #
    # # A-P for each 1mm, find valley
    # rg <- range(pos[, 2])
    # rg <- c(floor(rg[[1]]), ceiling(rg[[2]]))
    # by <- 0.5
    # anteriors <- seq(rg[[1]], rg[[2]] - by, by = by)
    # pos_a <- pos[, 2]
    # valley_subidx <- sapply(anteriors, function(a) {
    #   sel <- which(pos_a > a & pos_a < (a+by))
    #   if(!length(sel)) { return(NA) }
    #   idx <- which.max(sv[sel])
    #   sel[idx]
    # })
    # valley_subidx <- valley_subidx[!is.na(valley_subidx)]
    #
    # valley_idx <- sts_nodes[valley_subidx]

    list(
      nodes = sts_nodes,
      # valley = valley_idx,
      color = sts_color
    )
  })
)



# ---- Fix the hemisphere ------------------------------------------------------
tkr_ras <- as.matrix(electrode_coords[, c("Coord_x", "Coord_y", "Coord_z")])

dist_to_pial <- threeBrain:::calculate_distances(positions = tkr_ras, mesh_list = list(
  left = list(vertices = pial$left$vertices[stats$left$nodes,,drop = FALSE]),
  right = list(vertices = pial$right$vertices[stats$right$nodes,,drop = FALSE])
))
dist_to_pial$left$index <- stats$left$nodes[dist_to_pial$left$index]
dist_to_pial$right$index <- stats$right$nodes[dist_to_pial$right$index]
dist_to_white <- threeBrain:::calculate_distances(positions = tkr_ras, mesh_list = list(
  left = list(vertices = white$left$vertices[stats$left$nodes,,drop = FALSE]),
  right = list(vertices = white$right$vertices[stats$right$nodes,,drop = FALSE])
))
dist_to_white$left$index <- stats$left$nodes[dist_to_white$left$index]
dist_to_white$right$index <- stats$right$nodes[dist_to_white$right$index]

# Using white-matter for distance calculation
distances <- dist_to_white
hemisphere <- ifelse(distances$right$distance < distances$left$distance, "right", "left")
sel <- tolower(electrode_coords$Hemisphere) %in% c("right", "left")
hemisphere[sel] <- electrode_coords$Hemisphere[sel]
electrode_coords$Hemisphere <- hemisphere

calc_dijkstras <- function(hemi, obj, max_dist = 50) {
  is_hemi <- !is.na(hemisphere) & hemisphere == hemi
  node_hemi <- distances[[hemi]]$index[is_hemi]
  vert_hemi <- obj[[hemi]]$vertices
  face_hemi <- obj[[hemi]]$faces

  prefix <- electrode_coords$LabelPrefix[is_hemi]
  dijkstras_paths <- lapply(seq_len(length(node_hemi) - 1), function(ii) {
    idx <- which(prefix == prefix[[ii]])
    idx <- idx[idx > ii]
    if(!length(idx)) { return(NULL) }
    dijkstras_hemi <- ravetools::dijkstras_surface_distance(
      positions = vert_hemi,
      faces = face_hemi,
      start_node = node_hemi[[ii]],
      max_search_distance = max_dist,
      face_index_start = 1
    )

    dists <- sapply(idx, function(jj) {
      path <- ravetools::surface_path(dijkstras_hemi, target_node = node_hemi[[ jj ]])
      dist <- path$distance[[nrow(path)]]
      if(is.na(dist)) { dist <- Inf }
      dist
    })

    jj <- idx[which.min(dists)][[1]]
    path <- ravetools::surface_path(dijkstras_hemi, target_node = node_hemi[[ jj ]])

    path
  })

  dijkstras_paths

}

dijkstras <- list(
  left = calc_dijkstras('left', white),
  right = calc_dijkstras('right', white)
)

# visualize
snapshot <- function(hemi, obj, plot_orig = TRUE, plot_paths = TRUE, cex = 1) {
  is_hemi <- !is.na(hemisphere) & hemisphere == hemi
  tkr_hemi <- tkr_ras[is_hemi,, drop = FALSE]
  node_hemi <- distances[[hemi]]$index[is_hemi]

  label_predix <- factor(electrode_coords$LabelPrefix[is_hemi], levels = sort(unique(electrode_coords$LabelPrefix)))

  # white_proj_hemi <- distances[[hemi]]$position[is_hemi, , drop = FALSE]

  vert_hemi <- obj[[hemi]]$vertices
  # face_hemi <- obj[[hemi]]$faces
  # valley_node_hemi <- stats[[hemi]]$valley
  sulc_node_hemi <- stats[[hemi]]$nodes
  # curv_hemi <- curv[[hemi]][sulc_node_hemi]

  proj_hemi <- vert_hemi[node_hemi,, drop = FALSE]

  range_hemi <- apply(vert_hemi[sulc_node_hemi,,drop = FALSE], 2, range)
  range_hemi[1, ] <- floor(range_hemi[1, ])
  range_hemi[2, ] <- ceiling(range_hemi[2, ])

  # prefix <- electrode_coords$LabelPrefix[is_hemi]
  dijkstras_paths <- dijkstras[[hemi]]

  col <- rep(dipsaus::col2hexStr("gray90", alpha = 0.2), nrow(vert_hemi))
  col[sulc_node_hemi] <- dipsaus::col2hexStr(stats[[hemi]]$color, alpha = 0.2)

  # if(hemi == "left") {
  #   valley_sel <- sulc_node_hemi[curv_hemi > 0 & curv_hemi < 0.05]
  # } else {
  #   valley_sel <- sulc_node_hemi[curv_hemi < 0 & curv_hemi > -0.05]
  # }
  #
  # col[valley_sel] <- "black"
  # col[valley_node_hemi] <- "black"


  elec_cols <- threeBrain:::DEFAULT_COLOR_DISCRETE[as.integer(label_predix)]

  # Visualize projection
  # par(mfrow = c(2, 2), mar = c(0, 0, 0, 0))
  # Coronal
  lapply(list(
    c(1, 3), c(2, 3), c(1, 2)
  ), function(o) {

    # plot(vert_hemi[, o], pch = ".", asp = 1, axes = FALSE, col = col)
    # points(tkr_hemi[, o], pch = 1, col = elec_cols, cex = cex)
    # points(white_proj_hemi[, o], pch = 20, col = elec_cols, cex = cex)

    plot(vert_hemi[, o], pch = ".", asp = 1, axes = FALSE, col = col,
         xlim = range_hemi[, o[[1]]], ylim = range_hemi[, o[[2]]])
    if(plot_orig) {
      points(tkr_hemi[, o], pch = 1, col = elec_cols, cex = cex)
      arrows(x0 = tkr_hemi[, o[[1]]], x1 = proj_hemi[, o[[1]]], y0 = tkr_hemi[, o[[2]]], y1 = proj_hemi[, o[[2]]], col = elec_cols, length = 0.05)
    }
    points(proj_hemi[, o], pch = 20, col = elec_cols, cex = cex)

    # lapply(seq_along(node_hemi), function(ii) {
    #   path <- ravetools::surface_path(dijkstras_hemi, target_node = node_hemi[[ ii ]])
    #   if(length(path) > 0 && nrow(path) > 1) {
    #     path_coords <- vert_hemi[path$path, o, drop = FALSE]
    #     nr <- nrow(path_coords)
    #     x0 <- path_coords[1:(nr-1),1]
    #     y0 <- path_coords[1:(nr-1),2]
    #     x1 <- path_coords[2:nr,1]
    #     y1 <- path_coords[2:nr,2]
    #     segments(x0, y0, x1, y1, col = elec_cols[[ii]], lwd = 1)
    #   }
    # })
    if( plot_paths ) {
      lapply(dijkstras_paths, function(path) {
        if(length(path) > 0 && nrow(path) > 1) {
          path_coords <- vert_hemi[path$path, o, drop = FALSE]
          nr <- nrow(path_coords)
          x0 <- path_coords[1:(nr-1),1]
          y0 <- path_coords[1:(nr-1),2]
          x1 <- path_coords[2:nr,1]
          y1 <- path_coords[2:nr,2]
          segments(x0, y0, x1, y1, col = "black", lwd = 1)
        }
      })
    }

  })
  invisible(dijkstras_paths)
}
par(mfrow = c(3, 3), mar = c(0, 0, 0, 0))
cex = 2
# snapshot('left', pial, plot_orig = TRUE, plot_paths = FALSE, cex = cex)
# snapshot('left', pial, plot_orig = FALSE, plot_paths = TRUE, cex = cex)
# snapshot('left', sphere, plot_orig = FALSE, cex = cex)

snapshot('right', pial, plot_orig = TRUE, plot_paths = FALSE, cex = cex)
snapshot('right', pial, plot_orig = FALSE, plot_paths = TRUE, cex = cex)
snapshot('right', sphere, plot_orig = FALSE, cex = cex)



# ---- Map to template surfaces ------------------------------------------------
# electrode_coords$SurfaceElectrode <- TRUE
electrode_coords$DistanceShifted <- 0
sel <- !is.na(hemisphere) & hemisphere == "left"
electrode_coords[sel, c("Sphere_x", "Sphere_y", "Sphere_z")] <- sphere_reg$left$vertices[ distances$left$index[sel], , drop = FALSE ]
electrode_coords[sel, "DistanceShifted"] <- distances$left$distance[sel]
sel <- !is.na(hemisphere) & hemisphere == "right"
electrode_coords[sel, c("Sphere_x", "Sphere_y", "Sphere_z")] <- sphere_reg$right$vertices[ distances$right$index[sel], , drop = FALSE ]
electrode_coords[sel, "DistanceShifted"] <- distances$right$distance[sel]

brain <- raveio::rave_brain(subject)
brain$set_electrodes(electrode_coords, priority = "sphere")
brain$set_electrode_values()
brain$add_surface("sphere.reg")
brain$add_surface("inflated")
brain$add_surface("smoothwm")

template <- threeBrain::merge_brain(brain, template_subject = template_name)
template$template_object$add_surface("inflated")
template$template_object$add_surface("sphere.reg")
template$template_object$add_surface("smoothwm")
template$plot(additional_subjects = brain$subject_code)
merge_brain
