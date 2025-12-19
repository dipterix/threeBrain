prototype <- threeBrain::load_prototype("PRECISION33X31")
model_ras <- t(prototype$.__enclos_env__$private$.contact_center)
model_svd <- svd2(model_ras)
# range(model_ras - model_svd$u %*% diag(model_svd$d) %*% t(model_svd$v)) # sanity check

fsaverage <- threeBrain::merge_brain(template_subject = "fsaverage")

fsaverage_lh_pial <- ieegio::as_ieegio_surface(file.path(fsaverage$template_object$base_path, "surf", "lh.pial"))
fsaverage_lh_pial$geometry$vertices <- fsaverage_lh_pial$geometry$transforms[[1]] %*% fsaverage_lh_pial$geometry$vertices
fsaverage_lh_pial$geometry$transforms[[1]][] <- diag(1, 4)
fsaverage_rh_pial <- ieegio::as_ieegio_surface(file.path(fsaverage$template_object$base_path, "surf", "rh.pial"))
fsaverage_rh_pial$geometry$vertices <- fsaverage_rh_pial$geometry$transforms[[1]] %*% fsaverage_rh_pial$geometry$vertices
fsaverage_rh_pial$geometry$transforms[[1]][] <- diag(1, 4)

# fsaverage <- threeBrain::merge_brain(template_subject = "cvs_avg35_inMNI152")
# fsaverage$template_object$plot()
#
# fsaverage_lh_pial <- ieegio::as_ieegio_surface(file.path(fsaverage$template_object$base_path, "surf", "lh.pial"))
# mat_to_mni305 <- solve(ravecore::MNI305_to_MNI152)
# fsaverage_lh_pial$geometry$vertices <- mat_to_mni305 %*% fsaverage_lh_pial$geometry$transforms[[1]] %*% fsaverage_lh_pial$geometry$vertices
# fsaverage_lh_pial$geometry$transforms[[1]][] <- diag(1, 4)
# fsaverage_rh_pial <- ieegio::as_ieegio_surface(file.path(fsaverage$template_object$base_path, "surf", "rh.pial"))
# fsaverage_rh_pial$geometry$vertices <- mat_to_mni305 %*% fsaverage_rh_pial$geometry$transforms[[1]] %*% fsaverage_rh_pial$geometry$vertices
# fsaverage_rh_pial$geometry$transforms[[1]][] <- diag(1, 4)

svd2 <- function(mat) {
  model_svd <- svd(mat)
  sel <- model_svd$d < 0
  model_svd$u[, sel] <- -model_svd$u[, sel]
  model_svd$d[sel] <- -model_svd$d[sel]
  model_svd
}

get_transform <- function(ras, rigid = FALSE) {

  # electrode_path <- "~/Downloads/zip/NSR-001-001/rave/meta/electrodes.csv"
  # electrode_table <- read.csv(electrode_path)
  # ras <- as.matrix(electrode_table[, c("MNI305_x", "MNI305_y", "MNI305_z")])
  ras <- as.matrix(ras)[, 1:3, drop = FALSE]

  # Get transforms in 4x4 matrix from model to tkr_ras
  translate <- colMeans(ras)

  # center the tkr_ras, to calculate rotation matrix
  ras_centered <- sweep(ras, MARGIN = 2L, STATS = translate, FUN = "-")
  rotation <- (t(model_svd$u) %*% ras_centered) / model_svd$d

  scaling <- apply(rotation, 1L, function(v) {
    sqrt(sum(v^2))
  })
  scaling <- as.vector(scaling)
  scaling[!is.finite(scaling)] <- 1

  # for precision array, the rank is 2
  if( rigid ) {
    rotation <- rotation / scaling
  }
  rotation[!is.finite(rotation)] <- 0

  # hence we need to calculate the normal
  v <- ravetools::new_vector3()$from_array(rotation[1, ])
  r3 <- v$cross(rotation[2, ])$normalize()$to_array()
  rotation[3, ] <- r3

  rotation <- model_svd$v %*% rotation

  # sanity check: this matrix should be nearly identity_3x3, if rigid
  rotation %*% t(rotation) - diag(1, 3)

  model_to_ras <- rbind(
    cbind(t(rotation), translate),
    c(0, 0, 0, 1)
  )

  # sanity check: this diff should be small
  # range(range(cbind(model_ras, 1) %*% t(model_to_ras) - cbind(ras, 1)))
  dimnames(model_to_ras) <- NULL
  model_to_ras
}

map_subject_to_fsaverage <- function(electrode_path) {
  # electrode_path <- "~/Downloads/zip/NSR-001-001/rave/meta/electrodes.csv"
  electrode_table <- utils::read.csv(electrode_path)
  scode <- basename(dirname(dirname(dirname(electrode_path))))

  mni305_ras <- as.matrix(electrode_table[, c("MNI305_x", "MNI305_y", "MNI305_z")])
  dimnames(mni305_ras) <- NULL

  transform <- get_transform(mni305_ras)

  # For calculating contact locations
  # model_plane_sizes <- list(width = 15.4376, height = 17.7466, shape = c(39, 45) * 2 - 1)
  model_plane_sizes <- list(width = 15.4376, height = 17.7466, shape = c(39, 45))
  # model_plane_sizes <- list(width = 15.4376, height = 17.7466, shape = c(6, 6))

  # For calculating recording area
  # model_plane_sizes <- list(width = 13, height = 12.1, shape = c(33, 38))
  model_plane <- ravetools::plane_geometry(width = model_plane_sizes[['width']],
                                           height = model_plane_sizes[['height']],
                                           shape = model_plane_sizes[['shape']])
  # plot(model_ras[,1:2])
  # points(t(model_plane$vb[1:2, ]), pch = 20, col = 'red')

  transformed_plane <- model_plane
  transformed_plane$vb <- (transform %*% rbind(transformed_plane$vb, 1))[1:3, ]

  transformed_norm <- transform %*% c(0, 0, 1, 0)
  transformed_norm <- transformed_norm[1:3] / sqrt(sum(transformed_norm^2))

  if(mean(mni305_ras[, 1]) > 0) {
    # right hemisphere
    fsaverage_surface <- fsaverage_rh_pial
  } else {
    fsaverage_surface <- fsaverage_lh_pial
  }
  projected <- ravetools::project_plane(
    target = fsaverage_surface,
    width = model_plane_sizes[['width']],
    height = model_plane_sizes[['height']],
    shape = model_plane_sizes[['shape']],
    initial_positions = t(transformed_plane$vb[1:3, ]),
    translate_first = FALSE,
    diagnostic = FALSE, n_iters = 1
  )

  # transformed_plane$vb[1:3, ] <- t(projected)
  # ieegio::write_surface(transformed_plane, con = sprintf("~/Downloads/zip/morphed/%s.gii", scode))
  # return()

  # find contact locations
  # kdtree <- ravetools::vcg_kdtree_nearest(target = model_plane, query = model_ras, k = 3)
  # projected_mni305 <- t(sapply(seq_len(nrow(model_ras)), function(ii) {
  #   idx <- kdtree$index[ii, ]
  #   p1 <- projected[idx[[1]],]
  #   p2 <- projected[idx[[2]],]
  #   p3 <- projected[idx[[3]],]
  #   dist <- kdtree$distance[ii, ]
  #   res <- locate_from_triangle_distances(p1, p2, p3, dist)
  #   colSums(rbind(p1, p2, p3) * res$barycentric)
  # }))
  kdtree <- ravetools::vcg_kdtree_nearest(target = model_plane, query = model_ras, k = 1)
  projected_mni305 <- projected[kdtree$index, ]

  electrode_table2 <- data.frame(
    Electrode = electrode_table$Electrode,
    x = projected_mni305[, 1],
    y = projected_mni305[, 2],
    z = projected_mni305[, 3],
    Label = electrode_table$Label,
    Radius = 0.25,
    SCode = scode
  )

  # fsaverage$template_object$set_electrodes(electrode_table2, coord_sys = "MNI305")
  # fsaverage$plot()
  path <- file.path(dirname(electrode_path), "electrodes_fsaverage.csv")
  write.csv(electrode_table2, path)

  # Also generate spheres as gii
  base_sphere <- ravetools::vcg_sphere()
  base_sphere$vb <- base_sphere$vb[1:3, ] * 0.7
  n_verts <- ncol(base_sphere$vb)
  n_electrodes <- nrow(projected_mni305)

  electrode_nodes <- apply(projected_mni305, 1, function(center) {
    base_sphere$vb + center
  })
  electrode_nodes <- matrix(electrode_nodes, nrow = 3, byrow = FALSE)
  electrode_faces <- matrix(rep(base_sphere$it, times = n_electrodes) + rep((seq_len(n_electrodes) - 1) * n_verts, each = length(base_sphere$it)), nrow = 3)

  s <- ieegio::as_ieegio_surface(t(electrode_nodes), faces = t(electrode_faces), face_start = 1)
  plot(s)

  ieegio::write_surface(s, con = sprintf("~/Downloads/zip/morphed/%s.gii", scode))

  electrode_table2
}

electrode_files <- list.files(
  "~/Downloads/zip/",
  full.names = TRUE,
  recursive = TRUE,
  all.files = FALSE,
  ignore.case = TRUE,
  include.dirs = FALSE,
  pattern = "electrodes\\.csv$"
)

coordinates <- lapply(electrode_files, function(electrode_path) {
  cat(electrode_path, "\n")
  path <- file.path(dirname(electrode_path), "electrodes_fsaverage.csv")
  # if(file.exists(path)) {
  #   data.table::fread(path)
  # } else {
    map_subject_to_fsaverage(electrode_path)
  # }
})
coordinates <- data.table::rbindlist(coordinates)
coordinates$Electrode <- seq_len(nrow(coordinates))
fsaverage$template_object$set_electrodes(coordinates, coord_sys = "MNI305")
fsaverage$template_object$set_electrode_values(coordinates[, c("Electrode", "SCode")])
widget <- fsaverage$plot(atlases = NULL)
threeBrain::save_brain(widget, "~/Downloads/zip/viewer2.html")
