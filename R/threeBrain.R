contains_freesurfer <- function(path) {
  if(!file.exists(path)) { return(FALSE) }
  if( file.exists(file.path(path, "surf")) ){
    return( TRUE )
  }
  if( file.exists(file.path(path, "mri")) ) {
    return(TRUE)
  }
  return(FALSE)
}

read_fs_mgh_header <- function( filepath, is_gzipped = "AUTO" ) {
  if (!is.character(filepath)) {
    stop("Parameter 'filepath' msut be a character string.")
  }
  header <- list()
  filepath <- normalizePath(filepath, mustWork = TRUE)
  if (typeof(is_gzipped) == "logical") {
    is_gz <- is_gzipped
  } else if (typeof(is_gzipped) == "character") {
    if (toupper(is_gzipped) == "AUTO") {
      is_gz <- grepl( "mgz$", filepath, ignore.case = TRUE)
    } else {
      stop("Argument 'is_gzipped' must be 'AUTO' if it is a string.\n")
    }
  } else {
    stop(sprintf("ERROR: Argument is_gzipped must be logical (TRUE or FALSE) or 'AUTO'.\n"))
  }
  if (is_gz) {
    fh <- gzfile(filepath, "rb")
  } else {
    fh <- file(filepath, "rb")
  }
  on.exit({ close(fh) })
  v <- readBin(fh, integer(), n = 1, endian = "big")
  if (v != 1L) {
    stop("File not in MGH/MGZ format.")
  }
  ndim1 <- readBin(fh, integer(), n = 1, size = 4, endian = "big")
  ndim2 <- readBin(fh, integer(), n = 1, size = 4, endian = "big")
  ndim3 <- readBin(fh, integer(), n = 1, size = 4, endian = "big")
  nframes <- readBin(fh, integer(), n = 1, size = 4, endian = "big")
  dtype <- readBin(fh, integer(), n = 1, size = 4, endian = "big")
  dof <- readBin(fh, integer(), n = 1, size = 4, endian = "big")
  header$dtype <- dtype
  header$dof <- dof
  header$internal <- list()
  unused_header_space_size_left <- 256L
  ras_flag_size <- 2L
  header$ras_good_flag <- readBin(fh, integer(), size = ras_flag_size, n = 1, endian = "big")
  unused_header_space_size_left <- unused_header_space_size_left - ras_flag_size
  if (header$ras_good_flag == 1L) {
    delta <- readBin(fh, numeric(), n = 3, size = 4, endian = "big")
    header$internal$xsize <- delta[1]
    header$internal$ysize <- delta[2]
    header$internal$zsize <- delta[3]
    Mdc <- readBin(fh, numeric(), n = 9, size = 4, endian = "big")
    header$internal$x_r <- Mdc[1]
    header$internal$x_a <- Mdc[2]
    header$internal$x_s <- Mdc[3]
    header$internal$y_r <- Mdc[4]
    header$internal$y_a <- Mdc[5]
    header$internal$y_s <- Mdc[6]
    header$internal$z_r <- Mdc[7]
    header$internal$z_a <- Mdc[8]
    header$internal$z_s <- Mdc[9]
    Mdc <- matrix(Mdc, nrow = 3, byrow = FALSE)
    Pxyz_c <- readBin(fh, numeric(), n = 3, size = 4, endian = "big")
    header$internal$c_r <- Pxyz_c[1]
    header$internal$c_a <- Pxyz_c[2]
    header$internal$c_s <- Pxyz_c[3]
    D <- diag(delta)
    Pcrs_c <- c(ndim1/2, ndim2/2, ndim3/2)
    Mdc_scaled <- Mdc %*% D
    Pxyz_0 <- Pxyz_c - (Mdc_scaled %*% Pcrs_c)
    M <- matrix(rep(0, 16), nrow = 4)
    M[1:3, 1:3] <- as.matrix(Mdc_scaled)
    M[4, 1:4] <- c(0, 0, 0, 1)
    M[1:3, 4] <- Pxyz_0
    header$internal$delta <- delta
    header$internal$Pxyz_c <- Pxyz_c
    header$internal$D <- D
    header$internal$Pcrs_c <- Pcrs_c
    header$internal$Pxyz_0 <- Pxyz_0
    header$internal$M <- M
    header$internal$Mdc <- Mdc
    header$internal$width <- ndim1
    header$internal$height <- ndim2
    header$internal$depth <- ndim3
    header$internal$nframes <- nframes
    x_half_length <- header$internal$width/2 * header$internal$xsize
    y_half_length <- header$internal$height/2 * header$internal$ysize
    z_half_length <- header$internal$depth/2 * header$internal$zsize
    header$internal$xstart <- -x_half_length
    header$internal$xend <- x_half_length
    header$internal$ystart <- -y_half_length
    header$internal$yend <- y_half_length
    header$internal$zstart <- -z_half_length
    header$internal$zend <- z_half_length
    xfov <- header$internal$xend - header$internal$xstart
    yfov <- header$internal$yend - header$internal$ystart
    zfov <- header$internal$zend - header$internal$zstart
    header$internal$fov <- ifelse(xfov > yfov, ifelse(xfov > zfov, xfov, zfov), ifelse(yfov > zfov, yfov, zfov))
    header$vox2ras_matrix <- as.matrix(M)
    RAS_space_size <- (3 * 4 + 4 * 3 * 4)
    unused_header_space_size_left <- unused_header_space_size_left - RAS_space_size
  } else {
    header$internal$slice_direction_name <- "unknown"
  }
  return( header )
}

#' @title Create a brain object
#' @param path path to 'FreeSurfer' directory, or 'RAVE' subject directory
#' containing 'FreeSurfer' files, or simply a 'RAVE' subject
#' @param subject_code subject code, characters
#' @param surface_types surface types to load; default is \code{'pial'},
#' other common types are \code{'white'}, \code{'smoothwm'}
#' @param atlas_types brain atlas to load; default is \code{'aparc+aseg'},
#' other choices are \code{'aparc.a2009s+aseg'}, \code{'aparc.DKTatlas+aseg'},
#' depending on the atlas files in \code{'fs/mri'} folder
#' @param template_subject template subject to refer to; used for group
#' template mapping
#' @param backward_compatible whether to support old format; default is false
#' @param ... reserved for future use
#' @export
threeBrain <- function(
    path, subject_code, surface_types = "pial",
    atlas_types = "aparc+aseg",
    ...,
    load_geometries = TRUE,
    template_subject = unname(getOption('threeBrain.template_subject', 'N27')),
    backward_compatible = getOption("threeBrain.compatible", FALSE)
) {
  # No SUMA 141 brain for default option

  fs_path <- path

  # DIPSAUS DEBUG START
  # fs_path <- "/Users/dipterix/Dropbox (PennNeurosurgery)/BeauchampLabAtPenn/Electrode_Localization_Paper/Code/N27"
  # subject_code <- "N27"
  # surface_types <- c("pial", "amygdala", "ctx-insula", c(18,54,1035,2035,1026,1002,1023,1010,2026,2002,202,
  #                     3,2010,1012,1014,1027,1032,2012,2014,2027,2032))
  # atlas_types <- c("aparc+aseg", "aparc.a2009s+aseg", "aparc.DKTatlas+aseg")
  # template_subject = "N27"

  # --------- Step 0: Locate freesurfer folder ---------------------------------
  fs_path_exists <- FALSE
  if( inherits(fs_path, "RAVESubject" ) ) {
    subject_code <- fs_path$subject_code
    fs_path <- fs_path$freesurfer_path
    if(length(fs_path) == 1 && !is.na(fs_path) && is.character(fs_path) && file.exists(fs_path)) {
      fs_path_exists <- TRUE
    }
  } else {
    # Find folders in case the path is in RAVE or freesurfer root directory
    # use file.exists instead of dir.exists as `fs_path` could be symlink
    search_paths <- file.path(fs_path, c(
      "", subject_code, "fs", "rave/fs", "rave-imaging/fs", sprintf("%s/rave-imaging/fs", subject_code)
    ))
    for(fs_path in search_paths) {
      if( contains_freesurfer(fs_path) ) {
        fs_path_exists <- TRUE
        break
      }
    }
  }
  if(!fs_path_exists) { return() }

  # 3D slices MRI overlay + Norig + Torig
  allowed_mri_prefix <- c(
    "rave_slices",
    "brain.finalsurfs", "synthSR.norm", "synthSR", "brain",
    "brainmask", "brainmask.auto", "T1"
  )
  allowed_fsmri_prefix <- c(
    "brain.finalsurfs", "synthSR.norm", "synthSR", "brain",
    "brainmask", "brainmask.auto", "T1"
  )

  path_mri <- file.path(fs_path, "mri", as.vector(rbind(
    sprintf("%s.nii.gz", allowed_mri_prefix),
    sprintf("%s.nii", allowed_mri_prefix),
    sprintf("%s.mgz", allowed_mri_prefix)
  )))
  path_mri <- path_mri[file.exists(path_mri)]
  if(length(path_mri)){ path_mri <- path_mri[[1]] }
  path_fsmri <- file.path(fs_path, "mri", as.vector(rbind(
    sprintf("%s.nii.gz", allowed_fsmri_prefix),
    sprintf("%s.nii", allowed_fsmri_prefix),
    sprintf("%s.mgz", allowed_fsmri_prefix)
  )))
  path_fsmri <- path_fsmri[file.exists(path_fsmri)]
  if(length(path_fsmri)){ path_fsmri <- path_fsmri[[1]] }

  # xfm
  path_xfm <- file.path(fs_path, "mri", "transforms", "talairach.xfm")

  # atlas
  atlases <- lapply(atlas_types, function(atype) {
    path_atlas <- file.path(fs_path, "mri", as.vector(rbind(
      sprintf("%s.mgz", atype),
      sprintf("%s.nii.gz", atype),
      sprintf("%s.nii", atype)
    )))
    path_atlas <- path_atlas[file.exists(path_atlas)]
    if(!length(path_atlas)) { return(NULL) }
    return(c(atype, path_atlas[[1]]))
  })
  atlases <- atlases[!vapply(atlases, is.null, FALSE)]
  if(!length(atlases)) {
    atlas_types <- character(0L)
    path_atlas <- character(0L)
  } else {
    atlases <- do.call(rbind, atlases)
    atlas_types <- atlases[, 1]
    path_atlas <- atlases[, 2]
  }

  surface_types <- as.character(surface_types)
  # check if this is legacy subject
  if( backward_compatible && file.exists(file.path(fs_path, 'RAVE', "common.digest")) ) {
    brain <- freesurfer_brain2(
      fs_subject_folder = fs_path,
      subject_name = subject_code,
      surface_types = surface_types,
      atlas_types = atlas_types,
      template_subject = template_subject,
      ...
    )
    if(!is.null(brain) && (
      length(brain$volume_types) || length(brain$surface_types)
    )) {
      return( brain )
    }
  }

  # --------- Step 1: Find transforms (xfm, Norig, Torig) ----------------------
  # xfm
  if( file.exists(path_xfm) ) {
    # only support linear for now
    xfm_raw <- read_xfm(path_xfm)
    xfm <- xfm_raw$matrix
  } else {
    # The transform
    xfm <- diag(1, 4)
  }

  # Norig, Torig
  mgz_files <- c(path_fsmri, path_atlas)
  if(!length(mgz_files)) {
    mgz_files <- list.files(
      file.path(fs_path, "mri"), pattern = "\\.mg(z|h)$", all.files = FALSE,
      recursive = FALSE, full.names = TRUE, ignore.case = TRUE, include.dirs = FALSE)
    if(length(mgz_files)) {
      mgz_files <- mgz_files[[1]]
    }
  } else {
    mgz_files <- mgz_files[[1]]
  }

  if( endsWith(tolower(mgz_files), "mgz") ) {
    volume_header <- read_fs_mgh_header( mgz_files )

    # Norig: IJK to scanner-RAS
    Norig <- volume_header$vox2ras_matrix

    # Torig: IJK to tkr-RAS
    Torig <- Norig[1:4, 1:3]
    Torig <- cbind(Torig, -Torig %*% volume_header$internal$Pcrs_c)
    Torig[4, 4] <- 1
  } else {
    volume_header <- read_nii2(mgz_files, head_only = TRUE)

    # Norig: IJK to scanner-RAS
    Norig <- volume_header$get_IJK_to_RAS()$matrix

    # Torig: IJK to tkr-RAS
    Torig <- Norig[1:4, 1:3]
    Torig <- cbind(Torig, -Torig %*% volume_header$get_shape() / 2)
    Torig[4, 4] <- 1
  }


  # Create brain instance
  brain <- Brain2$new(
    subject_code = subject_code, xfm = xfm, Norig = Norig, Torig = Torig,
    base_path = fs_path, load_geometries = load_geometries
  )

  # --------- Step 3: Add T1 MRI slices ----------------------------------------
  if(length(path_mri)) {

    group <- GeomGroup$new(
      name = sprintf('Volume - T1 (%s)', subject_code)
    )
    group$.cache_name <- sprintf("%s/mri", subject_code)

    # Volume instance
    instance <- BrainVolume$new(
      volume_type = 'T1',
      subject_code = subject_code,
      position = c(0, 0, 0 ),

      # Geomrtry object stores MRI slice information
      volume = VolumeGeom$new(
        name = sprintf('T1 (%s)', subject_code),
        path = normalizePath(path_mri, winslash = "/"),

        # JS engine requires a group
        group = group
      )
    )

    brain$add_volume( volume = instance )

  }

  # --------- Step 4: Add Surfaces ---------------------------------------------
  surf_path <- file.path(fs_path, "surf")
  subcortical_path <- file.path(fs_path, "surf", "subcortical")
  if("subcortical" %in% surface_types) {
    subcortical_surfaces <- list.files(
      subcortical_path,
      pattern = "lh\\.",
      all.files = FALSE,
      full.names = FALSE,
      recursive = FALSE,
      ignore.case = TRUE,
      include.dirs = FALSE
    )
    subcortical_surfaces <- gsub("(^lh\\.|-[0-9]{0,}$)", "", subcortical_surfaces)
    surface_types <- c(surface_types, subcortical_surfaces)
  }

  surface_filenames <- list.files(surf_path, pattern = "^[lr]h\\.", ignore.case = TRUE)
  available_surfaces <- unique(gsub("^[l|r]h\\.", "", surface_filenames, ignore.case = TRUE))
  available_surfaces <- available_surfaces[!grepl("^(sulc|thick|volume|jacob|curv|area)", available_surfaces, ignore.case = TRUE)]
  available_surfaces <- available_surfaces[!grepl("(crv|mgh|curv|labels|label)$", available_surfaces, ignore.case = TRUE)]
  available_surfaces_lower <- tolower(available_surfaces)

  surface_types <- unique(c('pial', surface_types))

  # look for sulc file
  vertex_color_types <- c("sulc", "curv", "thickness", "volume")
  left_vcolor <- NULL
  right_vcolor <- NULL
  has_vcolor <- FALSE
  for(vc_type in vertex_color_types) {
    path_left_vcolor <- file.path(surf_path, sprintf("lh.%s", vc_type))
    path_right_vcolor <- file.path(surf_path, sprintf("rh.%s", vc_type))

    if( file.exists(path_left_vcolor) && file.exists(path_right_vcolor) ) {
      path_left_vcolor <- normalizePath(path_left_vcolor, winslash = "/")
      path_right_vcolor <- normalizePath(path_right_vcolor, winslash = "/")
      left_vcolor <- list(
        path = path_left_vcolor,
        absolute_path = path_left_vcolor,
        file_name = basename(path_left_vcolor),
        is_new_cache = FALSE,
        is_cache = TRUE
      )
      right_vcolor <- list(
        path = path_right_vcolor,
        absolute_path = path_right_vcolor,
        file_name = basename(path_right_vcolor),
        is_new_cache = FALSE,
        is_cache = TRUE
      )
      has_vcolor <- TRUE
      break
    }
  }


  for(surface_name in surface_types) {

    if( tolower(surface_name) == "pial.t1" ) {
      surface_name <- "pial"
    }

    # surface_type might be symlink since fs 7.0 (e.g., pial)
    surface_type <- c(surface_alternative_types[[surface_name]], surface_name)
    surface_type <- c(surface_type[tolower(surface_type) %in% available_surfaces_lower], surface_name)

    surface_type <- surface_type[[1]]

    subcortical <- FALSE
    path_left <- normalizePath(file.path(surf_path, sprintf("lh.%s", surface_type)),
                               winslash = "/", mustWork = FALSE)
    path_right <- normalizePath(file.path(surf_path, sprintf("rh.%s", surface_type)),
                                winslash = "/", mustWork = FALSE)

    if( !file.exists(path_left) || !file.exists(path_right) ) {

      surface_type <- as_subcortical_label(surface_type, remove_hemisphere = TRUE)
      if(is.na(surface_type)) {
        next
      }
      subcortical_files <- list.files(
        subcortical_path,
        pattern = sprintf("^[lr]h\\.%s-[0-9]+$", surface_type),
        all.files = FALSE,
        full.names = FALSE,
        recursive = FALSE,
        ignore.case = TRUE,
        include.dirs = FALSE
      )
      if(length(subcortical_files) == 0) { next }

      fname_left <- subcortical_files[startsWith(subcortical_files, "l")]
      if(!length(fname_left)) {
        fname_left <- system.file("sample_data", "simple_mesh", package = "threeBrain")
      } else {
        fname_left <- file.path(subcortical_path, fname_left[[1]])
      }
      path_left <- normalizePath( fname_left, winslash = "/", mustWork = FALSE )

      fname_right <- subcortical_files[startsWith(subcortical_files, "r")]
      if(!length(fname_right)) {
        fname_right <- system.file("sample_data", "simple_mesh", package = "threeBrain")
      } else {
        fname_right <- file.path(subcortical_path, fname_right[[1]])
      }
      path_right <- normalizePath( fname_right, winslash = "/", mustWork = FALSE )
      subcortical <- TRUE
    }

    group <- GeomGroup$new(name = sprintf('Surface - %s (%s)', surface_name, subject_code))
    group$set_group_data('template_subject', template_subject)
    group$set_group_data('surface_type', surface_name)
    group$set_group_data('subject_code', subject_code)
    group$set_group_data('surface_format', 'fs')

    surf_lh <- FreeGeom$new(
      name = sprintf('FreeSurfer Left Hemisphere - %s (%s)', surface_name, subject_code),
      position = c(0,0,0), cache_file = path_left, group = group, layer = 8
    )
    surf_rh <- FreeGeom$new(
      name = sprintf('FreeSurfer Right Hemisphere - %s (%s)', surface_name, subject_code),
      position = c(0,0,0), cache_file = path_right, group = group, layer = 8
    )

    if( subcortical ) {
      group$.cache_name <- sprintf("%s/subcortical", subject_code)

      subcortical_key <- as.integer(gsub(".*-([0-9]+)[/]{0,}$", "\\1", path_left))
      subcortical_info <- freesurfer_lut$from_key(subcortical_key, label_only = FALSE)[[1]]
      surf_lh$subcortical_info <- list(
        ColorID = subcortical_info$ColorID,
        Label = subcortical_info$Label,
        Color = rgb(
          red = subcortical_info$R,
          green = subcortical_info$G,
          blue = subcortical_info$B,
          maxColorValue = 255
        )
      )

      subcortical_key <- as.integer(gsub(".*-([0-9]+)[/]{0,}$", "\\1", path_right))
      subcortical_info <- freesurfer_lut$from_key(subcortical_key, label_only = FALSE)[[1]]
      surf_rh$subcortical_info <- list(
        ColorID = subcortical_info$ColorID,
        Label = subcortical_info$Label,
        Color = rgb(
          red = subcortical_info$R,
          green = subcortical_info$G,
          blue = subcortical_info$B,
          maxColorValue = 255
        )
      )
    } else {
      group$.cache_name <- sprintf("%s/surf", subject_code)
      if( has_vcolor ) {
        group$set_group_data( "lh_primary_vertex_color", is_cached = TRUE, value = left_vcolor )
        group$set_group_data( "rh_primary_vertex_color", is_cached = TRUE, value = right_vcolor )
      }
    }

    surface <- BrainSurface$new(subject_code = subject_code, surface_type = surface_name, mesh_type = 'fs',
                                left_hemisphere = surf_lh, right_hemisphere = surf_rh)

    brain$add_surface( surface = surface )

  }

  # --------- Step 5: Add Atlas ------------------------------------------------

  for( ii in seq_along(atlas_types) ) {
    atlas_type <- atlas_types[[ ii ]]
    brain$add_atlas( atlas_type )
  }

  return( brain )
  # brain$plot(debug = TRUE)
}
