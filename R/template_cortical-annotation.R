#' Generate cortical annotations from template using surface mapping
#' @description
#' This is a low-level function. Use \code{brain$add_annotation} instead.
#'
#' @param brain Brain object
#' @param template_subject template subject where the annotation is stored
#' @param annotation annotation name in the label folder; default is
#' \code{'Yeo2011_7Networks_N1000'}, standing for
#' \code{'lh.Yeo2011_7Networks_N1000.annot'} and
#' \code{'rh.Yeo2011_7Networks_N1000.annot'}.
#' @param add_annotation whether to add annotation to \code{brain}
#' @returns \code{brain} with the annotation added if \code{add_annotation}
#' is true
#'
#' @export
generate_cortical_parcellation <- function(
    brain, template_subject = "fsaverage", annotation = "Yeo2011_7Networks_N1000",
    add_annotation = TRUE) {

  # DIPSAUS DEBUG START
  # devtools::load_all()
  # brain <- raveio::rave_brain("demo/DemoSubject")
  # template_subject <- "fsaverage"
  # annotation <- "Yeo2011_17Networks_N1000"

  if(is.null(brain$surfaces$sphere.reg)) {
    brain$add_surface("sphere.reg")
    on.exit({
      brain$surfaces$sphere.reg <- NULL
    })
  }

  if(!length(brain$surfaces$sphere.reg)) {
    stop("The FreeSurfer brain object does not have `sphere.reg` surface. Did you finish `recon-all`?")
  }
  # make sure fsaverage is present
  tempolate_path <- file.path(default_template_directory(), template_subject)
  if(!dir.exists(tempolate_path)) {
    message("Template `", template_subject, "` is missing. Downloading it from RAVE (this is one-time procedure).")
    message(sprintf("Running `threeBrain::download_template_subject(subject_code = '%s')`", template_subject))
    download_template_subject(subject_code = template_subject)
  }

  # check if the annoations are available
  lh_annot_path <- file.path(tempolate_path, "label", sprintf("lh.%s.annot", annotation))
  rh_annot_path <- file.path(tempolate_path, "label", sprintf("rh.%s.annot", annotation))

  if(!file.exists(lh_annot_path)) {
    stop(sprintf("Template `%s` does not have FreeSurfer annotation `%s` for the left hemisphere (%s is missing).", template_subject, annotation, basename(lh_annot_path)))
  }
  if(!file.exists(rh_annot_path)) {
    stop(sprintf("Template `%s` does not have FreeSurfer annotation `%s` for the right hemisphere (%s is missing).", template_subject, annotation, basename(rh_annot_path)))
  }

  # sphere.reg for template
  lh_sphere_reg_path_template <- file.path(tempolate_path, "surf", "lh.sphere.reg")
  rh_sphere_reg_path_template <- file.path(tempolate_path, "surf", "rh.sphere.reg")

  # read sphere.reg for native
  lh_sphere_reg_path <- file.path(brain$base_path, "surf", "lh.sphere.reg")
  rh_sphere_reg_path <- file.path(brain$base_path, "surf", "rh.sphere.reg")

  # build mapping for each native node

  # left
  sphere_reg <- freesurferformats::read.fs.surface(lh_sphere_reg_path)
  sphere_reg_template <- freesurferformats::read.fs.surface(lh_sphere_reg_path_template)
  annot_template <- freesurferformats::read.fs.annot(lh_annot_path)

  kdtree <- ravetools::vcg_kdtree_nearest(
    target = sphere_reg_template$vertices[, 1:3, drop = FALSE],
    query = sphere_reg$vertices[, 1:3, drop = FALSE],
    k = 1
  )
  new_label_codes <- annot_template$label_codes[kdtree$index[, 1]]

  annot_path <- file.path(brain$base_path, "label", sprintf("lh.%s.annot", annotation))
  freesurferformats::write.fs.annot(
    filepath = annot_path, num_vertices = as.integer(length(new_label_codes)),
    colortable = annot_template$colortable_df, labels_as_colorcodes = new_label_codes)


  # pial_annotated <- merge(
  #   ieegio::read_surface(file.path(brain$base_path, "surf", "lh.pial")),
  #   ieegio::read_surface(annot_path)
  # ); plot(pial_annotated)

  # right
  sphere_reg <- freesurferformats::read.fs.surface(rh_sphere_reg_path)
  sphere_reg_template <- freesurferformats::read.fs.surface(rh_sphere_reg_path_template)
  annot_template <- freesurferformats::read.fs.annot(rh_annot_path)

  kdtree <- ravetools::vcg_kdtree_nearest(
    target = sphere_reg_template$vertices[, 1:3, drop = FALSE],
    query = sphere_reg$vertices[, 1:3, drop = FALSE],
    k = 1
  )
  new_label_codes <- annot_template$label_codes[kdtree$index[, 1]]

  annot_path <- file.path(brain$base_path, "label", sprintf("rh.%s.annot", annotation))
  freesurferformats::write.fs.annot(
    filepath = annot_path, num_vertices = as.integer(length(new_label_codes)),
    colortable = annot_template$colortable_df, labels_as_colorcodes = new_label_codes)

  # pial_annotated <- merge(
  #   ieegio::read_surface(file.path(brain$base_path, "surf", "rh.pial")),
  #   ieegio::read_surface(annot_path)
  # ); plot(pial_annotated)


  # # right
  # rh_sphere_reg <- ieegio::read_surface(rh_sphere_reg_path)
  # rh_sphere_reg_template <- ieegio::read_surface(rh_sphere_reg_path_template)
  # rh_annot_template <- ieegio::read_surface(rh_annot_path)
  #
  # kdtree <- ravetools::vcg_kdtree_nearest(
  #   t(rh_sphere_reg_template$geometry$vertices[1:3, , drop = FALSE]),
  #   t(rh_sphere_reg$geometry$vertices[1:3, , drop = FALSE]),
  #   1
  # )
  # mapping_index <- as.vector(kdtree$index)
  #
  # # mapping_index <- apply(rh_sphere_reg$geometry$vertices, 2, function(p) {
  # #   which.min(colSums((rh_sphere_reg_template$geometry$vertices - p)^2))
  # # })
  # annot_name <- names(rh_annot_template$annotations$data_table)[[1]]
  # new_annot <- rh_annot_template$annotations$data_table[[1]][mapping_index]
  #
  # rh_annot <- rh_annot_template
  # rh_annot$sparse_node_index <- structure(seq_along(new_annot), start_index = 1L)
  # annot_table <- structure(list(as.integer(new_annot)), names = annot_name)
  # rh_annot$annotations$data_table <- data.table::as.data.table(annot_table)
  #
  # pial_annotated <- merge(
  #   ieegio::read_surface(file.path(brain$base_path, "surf", "rh.pial")),
  #   rh_annot)
  # plot(pial_annotated, method = "r3js")

  # # save
  # ieegio::write_surface(x = rh_annot, con = file.path(brain$base_path, "label", sprintf("rh.%s.annot", annotation)), format = "freesurfer", type = "annotations")

  if( add_annotation ) {
    brain$add_annotation(sprintf("label/%s", annotation))
  }
  invisible(brain)

}
