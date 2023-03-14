#' @title Generate smooth envelope around surface
#' @description Alternative to 'Matlab' version of \code{'pial-outer-smoothed'},
#' use this function along with \code{\link{fill_surface}}.
#' @param surface_path path to \code{'*h.pial'} surface in the 'FreeSurfer'
#' folder, or a 3-dimensional mesh, see
#' \code{\link[freesurferformats]{read.fs.surface}}
#' @param save_as save final envelope to path, or \code{NULL} for dry-run
#' @param save_format format of saved file when \code{save_as} is not
#' \code{NULL}; see \code{format} argument in function
#' \code{\link[freesurferformats]{write.fs.surface}}
#' @param inflate number of \code{'voxels'} to inflate before fitting envelope;
#' must be a non-negative integer
#' @param verbose whether to verbose the progress; default is true
#' @returns A 3-dimensional mesh that contains vertices and face indices,
#' the result is also saved to \code{save_as} is specified.
#'
#' @examples
#'
#' if(interactive() &&
#'    file.exists(file.path(default_template_directory(), "N27"))) {
#'
#' library(threeBrain)
#'
#' fs_path <- file.path(default_template_directory(), "N27")
#'
#' # lh.pial-outer-smoothed
#' lh_pial <- file.path(fs_path, "surf", "lh.pial")
#' save_as <- file.path(fs_path, "surf", "lh.pial-outer-smoothed")
#' generate_smooth_envelope(lh_pial, save_as)
#'
#' # rh.pial-outer-smoothed
#' rh_pial <- file.path(fs_path, "surf", "rh.pial")
#' save_as <- file.path(fs_path, "surf", "rh.pial-outer-smoothed")
#' generate_smooth_envelope(rh_pial, save_as)
#'
#' brain <- threeBrain(
#'   path = fs_path, subject_code = "N27",
#'   surface_types = 'pial-outer-smoothed'
#' )
#' brain$plot(controllers = list(
#'   "Surface Type" = 'pial-outer-smoothed'
#' ))
#'
#' }
#'
#' @export
generate_smooth_envelope <- function(
    surface_path, save_as = NULL, inflate = 3, verbose = TRUE,
    save_format = c("auto", "bin", "asc", "vtk", "ply", "off", "obj", "gii", "mz3", "byu")
) {

  # DIPSAUS DEBUG START
  # surface_path <- '~/Dropbox (PENN Neurotrauma)/RAVE/Samples/raw/PAV010/rave-imaging/fs/surf/lh.pial'
  # save_as <- tempfile()
  # inflate <- 2
  # verbose <- TRUE

  save_format <- match.arg(save_format)
  force(save_as)
  force(verbose)

  inflate <- as.integer(inflate)
  stopifnot2(inflate >= 0, msg = "generate_smooth_envelope: `inflate` must be non-negative")

  debug <- function(...) {
    if(verbose) {
      cat(...)
    }
  }

  # Load surface
  if(isTRUE(is.character(surface_path))) {
    surface <- freesurferformats::read.fs.surface(surface_path)
  } else {
    surface <- surface_path
  }

  debug("Filling the surface in a 256x256x256 volume\n")
  filled_volume <- ravetools::fill_surface(surface, inflate = inflate, preview = FALSE)

  # generate surface from envelop
  debug("Generating surface from volume...\n")
  mesh <- ravetools::mesh_from_volume(
    volume = filled_volume$volume,
    output_format = "freesurfer",
    IJK2RAS = filled_volume$IJK2RAS,
    threshold = 0.5,
    verbose = verbose,
    remesh = TRUE,
    remesh_voxel_size = 1L,
    remesh_multisample = TRUE,
    remesh_automerge = TRUE,
    smooth = TRUE,
    smooth_lambda = 10,
    smooth_delta = 20,
    smooth_method = "surfPreserveLaplace"
  )

  # DIPSAUS DEBUG START
  # rgl::close3d(); rgl::open3d()
  # rgl::shade3d(ravetools:::ensure_mesh3d(surface), col = 1);
  # rgl::wire3d(ravetools:::ensure_mesh3d(mesh), col = 3)

  # save
  if(length(save_as) && !is.na(save_as)) {
    freesurferformats::write.fs.surface(
      filepath = save_as,
      vertex_coords = mesh$vertices,
      faces = mesh$faces,
      format = save_format
    )
    return(invisible(mesh))
  } else {
    return(mesh)
  }


}
