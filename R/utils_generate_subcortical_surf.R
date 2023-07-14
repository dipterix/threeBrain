# DIPSAUS DEBUG START
# n27_path <- "/Users/dipterix/Dropbox (PennNeurosurgery)/BeauchampLabAtPenn/Electrode_Localization_Paper/Code/N27"
# brain <- threeBrain::threeBrain(
#   path = n27_path, subject_code = "N27",
#   surface_types = c(18,54,1035,2035,1026,1002,1023,1010,2026,2002,202,
#                     3,2010,1012,1014,1027,1032,2012,2014,2027,2032))
# print(brain$plot())
NULL

#
# aparc_aseg_path <- file.path(n27_path, "mri", "aparc+aseg.nii")
#
# aparc_aseg <- rpyANTs::as_ANTsImage(aparc_aseg_path)
# v <- aparc_aseg[] == 2027
# v2 <- ravetools:::grow_volume(volume = v, 5)
# v2 <- 1 - ravetools:::grow_volume(volume = 1 - v2, 5)
# mesh <- ravetools::mesh_from_volume(volume = v, output_format = "freesurfer", IJK2RAS = brain$Torig, threshold = 0.5, remesh = TRUE, smooth = TRUE)
# freesurferformats::write.fs.surface(filepath = file.path(n27_path, "surf", "rh.rostralmiddlefrontal"), vertex_coords = mesh$vertices, faces = mesh$faces, format = "bin")
#
# v <- aparc_aseg[] == 1027
# v2 <- ravetools:::grow_volume(volume = v, 5)
# v2 <- 1 - ravetools:::grow_volume(volume = 1 - v2, 5)
# mesh <- ravetools::mesh_from_volume(volume = v2, output_format = "freesurfer", IJK2RAS = brain$Torig, threshold = 0.5, remesh = TRUE, smooth = TRUE)
# freesurferformats::write.fs.surface(filepath = file.path(n27_path, "surf", "lh.rostralmiddlefrontal"), vertex_coords = mesh$vertices, faces = mesh$faces, format = "bin")
#
# brain <- threeBrain::threeBrain(path = n27_path, subject_code = "N27", surface_types = "rostralmiddlefrontal")
# brain$plot()
#
#


read_volume <- function(file, format = c("auto", "mgh", "nii"), header_only = FALSE) {
  format <- match.arg(format)
  if(format == "auto") {
    if(endsWith(file, "mgz") || endsWith(file, "mgh")) {
      format <- "mgh"
    } else {
      format <- "nii"
    }
  }

  data <- NULL
  header <- NULL

  if(format == "mgh") {
    if( header_only ) {
      header <- read_fs_mgh_header( file )
    } else {
      volume <- freesurferformats::read.fs.mgh(filepath = file, with_header = TRUE)
      data <- volume$data
      header <- volume$header
    }
    # Norig: IJK to scanner-RAS
    Norig <- header$vox2ras_matrix

    # Torig: IJK to tkr-RAS
    Torig <- Norig[1:4, 1:3]
    Torig <- cbind(Torig, -Torig %*% header$internal$Pcrs_c)
    Torig[4, 4] <- 1
  } else {
    volume <- read_nii2(file, head_only = head_only)
    if( !header_only ) {
      data <- volume$get_data()
    }
    header <- volume$header
    # Norig: IJK to scanner-RAS
    Norig <- volume$get_IJK_to_RAS()$matrix

    # Torig: IJK to tkr-RAS
    Torig <- Norig[1:4, 1:3]
    Torig <- cbind(Torig, -Torig %*% volume$get_shape() / 2)
    Torig[4, 4] <- 1
  }
  list(
    header = header,
    data = data,
    Norig = Norig,
    Torig = Torig
  )
}

as_subcortical_label <- function(x, remove_hemisphere = FALSE) {
  x <- vapply(as.character(x), function(k) {
    if(grepl("^[0-9]+$", k)) {
      return(freesurfer_lut$from_key(k, label_only = TRUE))
    } else {
      return(k)
    }
  }, "")

  if( remove_hemisphere ) {
    x <- gsub("^ctx[_-][lr]h", "ctx", x)
    x <- gsub("^(left|right)[_-]", "", x)
  } else {
    x <- gsub("^ctx[_-]lh", "lh.ctx", x)
    x <- gsub("^ctx[_-]rh", "rh.ctx", x)
    x <- gsub("^left[_-]", "lh.", x)
    x <- gsub("^right[_-]", "rh.", x)
  }
  x
}

generate_subcortical_surface <- function(path, atlas, index, label = NULL, IJK2RAS = NULL,
                                         remesh = TRUE, smooth = TRUE, ...) {

  # atlas_file <- "aparc+aseg.mgz"
  # atlas <- freesurferformats::read.fs.mgh(file.path(path, "mri", "aparc+aseg.mgz"), with_header = TRUE)
  # atlas_path <- file.path(path, "mri", atlas_file)
  # atlas <- read_volume(atlas_path, header_only = FALSE)
  if(!is.matrix(IJK2RAS)) {
    IJK2RAS <- atlas$Torig
  }

  # get label
  if(length(label) != 1 || is.na(label) || !nzchar(trimws(label))) {
    label <- freesurfer_lut$from_key(index)
  } else {
    label <- trimws(label)
  }
  label <- tolower(label)

  mask <- atlas$data == index
  mesh <- ravetools::mesh_from_volume(
    volume = mask,
    output_format = "freesurfer",
    IJK2RAS = IJK2RAS,
    threshold = 0.5,
    remesh = remesh,
    smooth = smooth,
    ...
  )

  save_path <- file.path(path, "surf", "subcortical")
  if(!dir.exists(save_path)) {
    dir.create(save_path, showWarnings = FALSE, recursive = TRUE)
  }
  label <- as_subcortical_label(label)
  freesurferformats::write.fs.surface(
    filepath = file.path(save_path, sprintf("%s-%s", label, index)),
    vertex_coords = mesh$vertices,
    faces = mesh$faces,
    format = "bin"
  )

  invisible(mesh)
}


# idx <- unique(as.vector(atlas$data))
# lapply(idx, function(id) {
#   generate_subcortical_surface(n27_path, atlas, id)
#   return()
# })

