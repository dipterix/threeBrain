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

#' Read volume file in \code{'MGH'} or \code{'Nifti'} formats
#' @param file file path
#' @param format the file format
#' @param header_only whether only read headers; default is false
#' @returns A list of volume data and transform matrices; if
#' \code{header_only=TRUE}, then volume data will be substituted by the
#' header.
#' @export
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
#' @description
#' Superseded by \code{\link{volume_to_surf}}. Please do not use this function.
#'
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
    label <- as_subcortical_label(index, remove_hemisphere = FALSE)
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



#' @title Generate surface file from \code{'nii'} or \code{'mgz'} volume files
#' @seealso \code{\link{read_volume}}, \code{\link[ravetools]{vcg_isosurface}},
#' \code{\link[ravetools]{vcg_smooth_implicit}}
#'
#' @param volume path to the volume file, or object from \code{\link{read_volume}}.
#' @param save_to where to save the surface file; default is \code{NA} (no save).
#' @param format The format of the file if \code{save_to} is a valid path,
#' choices include
#' \describe{
#' \item{\code{'auto'}}{Default, supports \code{'FreeSurfer'} binary format and
#'        \code{'ASCII'} text format, based on file name suffix}
#' \item{\code{'bin'}}{\code{'FreeSurfer'} binary format}
#' \item{\code{'asc'}}{\code{'ASCII'} text format}
#' \item{\code{'ply'}}{'Stanford' \code{'PLY'} format}
#' \item{\code{'off'}}{Object file format}
#' \item{\code{'obj'}}{\code{'Wavefront'} object format}
#' \item{\code{'gii'}}{\code{'GIfTI'} format. Please avoid using \code{'gii.gz'} as the file suffix}
#' \item{\code{'mz3'}}{\code{'Surf-Ice'} format}
#' \item{\code{'byu'}}{\code{'BYU'} mesh format}
#' \item{\code{'vtk'}}{Legacy \code{'VTK'} format}
#' }
#' \code{'gii'}, otherwise \code{'FreeSurfer'} format. Please do not use
#' \code{'gii.gz'} suffix.
#' @param lambda \code{'Laplacian'} smooth, the higher the smoother
#' @param degree \code{'Laplacian'} degree; default is \code{2}
#' @param threshold_lb lower threshold of the volume (to create mask); default is \code{0.5}
#' @param threshold_ub upper threshold of the volume; default is \code{NA} (no upper bound)
#' @returns Triangle \code{'rgl'} mesh (vertex positions in native \code{'RAS'}). If \code{save_to} is a valid path, then the mesh will be saved to this location.
#' @examples
#'
#' library(threeBrain)
#' N27_path <- file.path(default_template_directory(), "N27")
#' if(dir.exists(N27_path)) {
#'   aseg <- file.path(N27_path, "mri", "aparc+aseg.mgz")
#'
#'   # generate surface for left-hemisphere insula
#'   mesh <- volume_to_surf(aseg, threshold_lb = 1034,
#'                          threshold_ub = 1036)
#'
#'   if(interactive()) {
#'     ravetools::rgl_view({
#'       ravetools::rgl_call("shade3d", mesh, color = "yellow")
#'     })
#'   }
#' }
#'
#'
#' @export
volume_to_surf <- function(
    volume, save_to = NA,
    lambda = 0.2, degree = 2, threshold_lb = 0.5, threshold_ub = NA,
    format = "auto") {
  # volume = '~/rave_data/raw_dir/testtest2/rave-imaging/atlases/AHEAD Atlas (Alkemade 2020)/lh/GPe_prob.nii.gz'

  if(length(save_to) != 1 || is.na(save_to) || !nzchar(save_to)) {
    save_to <- NA
  }

  if(is.character(volume)) {
    volume <- read_volume(volume)
  }
  vol_dim <- dim(volume$data)
  if(length(vol_dim) < 3) {
    vol_dim <- c(vol_dim, 1, 1, 1)[seq_len(3)]
  } else if (length(vol_dim) > 3) {
    vol_dim <- vol_dim[seq_len(3)]
    volume$data <- array(volume$data[seq_len(prod(vol_dim))], dim = vol_dim)
  }

  # Mesh
  mesh <- ravetools::vcg_isosurface(
    volume = volume$data,
    threshold_lb = threshold_lb,
    threshold_ub = threshold_ub,
    vox_to_ras = volume$Norig
  )

  # smooth
  if( isTRUE( lambda > 0 ) ) {
    mesh <- ravetools::vcg_smooth_implicit(
      mesh,
      lambda = lambda,
      use_mass_matrix = TRUE,
      fix_border = TRUE,
      use_cot_weight = FALSE,
      degree = degree
    )
  }
  mesh <- ravetools::vcg_update_normals(mesh)

  # ravetools::rgl_view({
  #   ravetools::rgl_call("shade3d", mesh, col = 'red')
  # })

  if(!is.na(save_to)) {
    freesurferformats::write.fs.surface(
      filepath = save_to,
      vertex_coords = t(mesh$vb[1:3, , drop = FALSE]),
      faces = t(mesh$it[1:3, , drop = FALSE]),
      format = format
    )
  }
  mesh

}



# idx <- unique(as.vector(atlas$data))
# lapply(idx, function(id) {
#   generate_subcortical_surface(n27_path, atlas, id)
#   return()
# })

