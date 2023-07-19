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
    volume <- read_nii2(file, head_only = header_only)
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
  structure(
    list(
      header = header,
      data = data,
      Norig = Norig,
      Torig = Torig
    ),
    class = c("threeBrain.volume", "list")
  )
}


#' @title Get 'voxel' to world matrix
#' @param x path to imaging files
#' @param type world space type; choices are \code{'scanner'} (same as
#' \code{'sform'} or \code{'qform'} in) or \code{'NIfTI'} file headers;
#' or \code{'tkr'} (used to shared surface nodes)
#' @returns A four by four matrix
#' @export
get_ijk2ras <- function(x, type = c("scanner", "tkr")) {
  type <- match.arg(type)

  if( inherits(x, "ants.core.ants_image.ANTsImage")) {
    tmpfile <- tempfile(fileext = ".nii.gz")
    on.exit({
      unlink(tmpfile)
    })
    x$to_file(normalizePath(tmpfile, mustWork = FALSE))
    x <- read_volume(tmpfile, header_only = TRUE)
  }

  if(is.character(x)) {
    x <- read_volume(x, header_only = TRUE)
  }
  if(inherits(x, "threeBrain.volume")) {
    if(type == "scanner") {
      return(x$Norig)
    } else {
      return(x$Torig)
    }
  }
  if( inherits(x, "mghheader") ) {
    # Norig: IJK to scanner-RAS
    Norig <- x$vox2ras_matrix
    if(type == "scanner") {
      return(Norig)
    } else {
      # Torig: IJK to tkr-RAS
      Torig <- Norig[1:4, 1:3]
      Torig <- cbind(Torig, -Torig %*% x$internal$Pcrs_c)
      Torig[4, 4] <- 1
      return(Torig)
    }
  }
  if( inherits(x, "oro.nifti") ) {
    sform_code <- c(x@sform_code, 0)[[1]]
    qform_code <- c(x@qform_code, 0)[[1]]

    # https://github.com/dipterix/threeBrain/issues/15
    if(sform_code == 0 && qform_code == 0) {
      Norig <- diag(c(x@pixdim[seq(2,4)], 1))
    } else {
      use_sform <- TRUE
      prefered_code <- c(1, 4, 2, 5, 3, 0)

      if(which(prefered_code == sform_code) >
         which(prefered_code == qform_code)) {
        use_sform <- FALSE
      }
      if( use_sform ) {
        Norig <- rbind(
          x@srow_x,
          x@srow_y,
          x@srow_z,
          c(0,0,0,1)
        )
      } else {
        Norig <- oro.nifti::qform(x)
      }
    }

    if(type == "scanner") {
      return(Norig)
    } else {
      # Torig: IJK to tkr-RAS
      Torig <- Norig[1:4, 1:3]
      Torig <- cbind(Torig, -Torig %*% oro.nifti::dim_(x)[c(2,3,4)] / 2)
      Torig[4, 4] <- 1
      return(Torig)
    }
  }

  stop("get_ijk2ras: Unsupported format")
}

as_subcortical_label <- function(x, remove_hemisphere = FALSE) {
  x <- vapply(as.character(x), function(k) {
    if(grepl("^[0-9]+$", k)) {
      return(as.character(freesurfer_lut$from_key(k, label_only = TRUE)))
    } else {
      return(k)
    }
  }, "")

  x <- tolower(x)

  if( remove_hemisphere ) {
    x <- gsub("^(ctx|wm)[_-][lr]h", "\\1", x)
    x <- gsub("^(left|right)[_-]", "", x)
  } else {
    x <- gsub("^(ctx|wm)[_-]lh", "lh.\\1", x)
    x <- gsub("^(ctx|wm)[_-]rh", "rh.\\1", x)
    x <- gsub("^left[_-]", "lh.", x)
    x <- gsub("^right[_-]", "rh.", x)
  }
  x
}

#' @title Approximate 'sub-cortical' surfaces from 'parcellation'
#' @param atlas path to imaging 'parcellation', can be \code{'nii'} or \code{'mgz'} formats
#' @param save_prefix parent folder to save the resulting surface
#' @param index 'parcellation' index, see 'FreeSurfer' look-up table
#' @param label character label or name of the 'sub-cortical' structure, usually automatically derived from \code{index}
#' @param IJK2RAS an 'Affine' matrix from 'voxel' index to \code{'tkrRAS'}, usually automatically derived from \code{atlas}
#' @param grow amount to grow (dilate) before generating mesh
#' @param remesh,smooth,smooth_delta,... passed to \code{\link[ravetools]{mesh_from_volume}}
#' @returns A surface mesh, containing 'atlas' index, label, surface nodes and face indices.
#' @export
generate_subcortical_surface <- function(atlas, index, save_prefix = NULL, label = NULL, IJK2RAS = NULL, grow = 1,
                                         remesh = TRUE, smooth = TRUE, smooth_delta = 3, ...) {

  if(is.character(atlas)) {
    atlas <- read_volume(atlas)
  }

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


  grow <- as.integer(grow)
  if( grow >= 1) {
    ravetools <- asNamespace("ravetools")
    mask <- ravetools$grow_volume(mask, grow)
  }

  mesh <- ravetools::mesh_from_volume(
    volume = mask,
    output_format = "freesurfer",
    IJK2RAS = IJK2RAS,
    threshold = 0.5,
    remesh = remesh,
    smooth = smooth,
    smooth_delta = smooth_delta,
    ...
  )

  # save_path <- file.path(path, "surf", "subcortical")
  # if(!dir.exists(save_path)) {
  #   dir.create(save_path, showWarnings = FALSE, recursive = TRUE)
  # }
  mesh$atlas_label <- as_subcortical_label(label)
  mesh$atlas_index <- as_subcortical_label(index)
  if(length(save_prefix) == 1) {
    freesurferformats::write.fs.surface(
      filepath = file.path(save_prefix, sprintf("%s-%s", label, index)),
      vertex_coords = mesh$vertices,
      faces = mesh$faces,
      format = "bin"
    )
  }

  invisible(mesh)
}


# idx <- unique(as.vector(atlas$data))
# lapply(idx, function(id) {
#   generate_subcortical_surface(n27_path, atlas, id)
#   return()
# })

