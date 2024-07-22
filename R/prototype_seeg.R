#' @title Create \code{'sEEG'} shaft geometry prototype
#' @description
#' Intended for creating/editing geometry prototype, please see
#' \code{\link{load_prototype}} to load existing prototype
#' @param type type string and unique identifier of the prototype
#' @param center_position numerical vector, contact center positions
#' @param contact_widths numerical vector or length of one, width or widths of
#' the contacts
#' @param diameter probe diameter
#' @param channel_order the channel order of the contacts; default is a sequence
#' along the number
#' @param fix_contact \code{NULL} or integer in \code{channel_order}, indicating
#' which contact is the most important and should be fixed during the
#' localization, default is \code{1} (inner-most target contact)
#' @param overall_length probe length, default is \code{200}
#' @param description prototype description
#' @param dry_run whether not to save the prototype configurations
#' @param overwrite whether to overwrite existing configuration file; default
#' is false, which throws a warning when duplicated
#' @param default_interpolation default interpolation string for electrode
#' localization
#' @param viewer_options list of viewer options; this should be a list of
#' key-value pairs where the keys are the controller names and values are the
#' corresponding values when users switch to localizing the electrode group
#' @returns A electrode shaft geometry prototype; the configuration file is
#' saved to 'RAVE' 3rd-party repository.
#'
#' @examples
#' probe_head <- 2
#' n_contacts <- 12
#' width <- 2.41
#' contact_spacing <- 5
#' overall_length <- 400
#' diameter <- 1.12
#'
#' contacts <- probe_head + width / 2 + 0:(n_contacts-1) * contact_spacing
#' proto <- seeg_prototype(
#'   type = "AdTech-sEEG-SD12R-SP05X-000",
#'   description = c(
#'     "AdTech sEEG - 12 contacts",
#'     "Contact length   : 2.41 mm",
#'     "Central spacing  : 5    mm",
#'     "Tip size         : 2    mm",
#'     "Diameter         : 1.12 mm"
#'   ),
#'   center_position = contacts,
#'   contact_widths = width,
#'   diameter = diameter,
#'   overall_length = overall_length,
#'   dry_run = TRUE
#' )
#'
#' print(proto, details = FALSE)
#'
#'
#' @export
seeg_prototype <- function(
    type,
    center_position, contact_widths, diameter = 1.0,
    channel_order = seq_along(center_position),
    fix_contact = 1, overall_length = 200,
    description = NULL, dry_run = FALSE,
    default_interpolation = NULL,
    viewer_options = NULL,
    overwrite = FALSE) {

  # DIPSAUS DEBUG START
  # center_position <- 0.75 + c(3.5 * 1:16)
  # contact_widths <- 1.5
  # diameter = 1
  # segments = 1
  # channel_order = seq_along(center_position)
  # fix_contact <- 1
  # overall_length <- 200
  # description <- NULL
  # type <- "sEEG-16"

  if( length(default_interpolation) != 1 || is.na(default_interpolation) ) {
    default_interpolation <- NULL
  } else {
    default_interpolation <- as.character(default_interpolation)
  }

  segments <- 1
  width_segments <- 12
  radius <- diameter / 2.0

  npos <- length(center_position)
  widths <- contact_widths
  if(length(widths) == 1) {
    widths <- rep(widths, npos)
  }
  if(length(segments) == 1) {
    segments <- rep(segments, npos)
  }
  stopifnot(npos == length(widths))
  stopifnot(npos == length(segments))
  stopifnot(npos == length(channel_order))
  contact_widths0 <- widths / 2

  if(!length(description)) {
    if(length(center_position) > 1) {
      spacing <- diff(center_position)
      if(length(spacing) > 1) {
        spacing <- spacing[[2]]
      }
      spacing <- sprintf("SP%.0f", spacing * 100)
    } else {
      spacing <- "probe"
    }
    if(length(contact_widths) > 1) {
      cw <- contact_widths[[2]]
    } else {
      cw <- contact_widths[[1]]
    }

    description <- sprintf("%s-%s-CW%.0f-D%.0f", type, spacing, cw * 100, diameter[[1]] * 100)
  }

  # widthSegment = 12, heightSegment = ?
  max_p <- max(center_position + widths / 2)
  max_e <- overall_length
  if( max_e <= max_p ) {
    max_e <- max_p + 0.1
  }
  radius0 <- radius
  paths <- c(
    radius * (1 - cos(pi / 8 * seq_len(4))),
    center_position, max_p, max_p + 0.01,
    max_e
  )
  radius <- c(
    radius * sin(pi / 8 * seq_len(4)),
    rep(radius, npos + 3)
  )
  pr <- cbind(paths, radius)
  n_layers <- length(paths)

  x <- c( cos((seq_len(width_segments) - 1) * 2 * pi / width_segments), 0.9999)
  y <- c( sin((seq_len(width_segments) - 1) * 2 * pi / width_segments), 0.0001)

  uvu <- 1 / (width_segments) * (seq_len(width_segments + 1) - 1)
  # uvu[[1]] <- 0.0001

  positions_n_uv <- apply(pr, 1L, function(zr) {
    z <- zr[[1]]
    r <- zr[[2]]

    if( z == 0 ) {
      x <- 0.0001
    }
    rbind(x * r, y * r, z, uvu, z / max_p)
  })

  nverts <- length(paths) * ( width_segments + 1 )
  dim(positions_n_uv) <- c(5, nverts)
  positions_n_uv <- cbind(c(0,0,0,0,0), positions_n_uv, c(0, 0, max_e, 2, 2))
  nverts <- nverts + 2

  positions_n_uv[c(4,5), nverts + 1 - seq_len(width_segments * 2 + 1)] <- 2

  position <- positions_n_uv[1:3, ]
  uv <- positions_n_uv[4:5, ]

  # construct face index
  side_cover <- sapply(seq_len(width_segments + 1), function(ii) {
    jj <- ifelse(ii > width_segments, 1, ii + 1)
    c(ii, 0, jj)
  })
  side_cover <- as.vector(side_cover)

  height_index_base <- sapply(seq_len(width_segments + 1), function(ii) {
    jj <- ifelse(ii > width_segments, 1, ii + 1)
    c(ii, jj, ii + width_segments + 1, jj, jj + width_segments + 1, ii + width_segments + 1)
  })
  height_index <- sapply(seq_len(n_layers - 1), function(layer) {
    height_index_base + (layer - 1) * ( width_segments + 1 )
  })
  index <- c(side_cover, as.vector(height_index), nverts - side_cover - 1L)

  texture_size <- c(4, 256)
  uv_start <- (center_position - widths / 2) / max_p
  uv_end <- (center_position + widths / 2) / max_p

  texture_start <- floor(texture_size[[2]] * uv_start) + 1L
  texture_end <- ceiling(texture_size[[2]] * uv_end) + 1L
  channel_map <- rbind(1, texture_start, 4, texture_end - texture_start)

  # mesh <- ravetools::vcg_update_normals(
  #   list(
  #     vb = position,
  #     it = index + 1L
  #   )
  # )

  config <- list(
    type = type,
    name = "",
    description = paste(description, collapse = "\n      "),

    # number of vertices and face indices
    n = c(nverts, length(index) - 1L),

    # internal geometry name
    geometry = "CustomGeometry",

    # whether using UV mapping to derive outlines rather than interactively determine the outlines
    fix_outline = FALSE,

    transform = diag(1, 4L),

    position = position,

    index = index,

    normal = NULL, #mesh$normals[1:3, , drop = FALSE],

    uv = uv,

    texture_size = texture_size,

    channel_map = channel_map,

    contact_center = rbind(0, 0, center_position),
    contact_sizes = contact_widths0,

    # row matrix
    model_control_points = rbind(0, 0, center_position),
    model_control_point_orders = seq_along(center_position),
    fix_control_index = fix_contact,

    # model_up = c(0, 1, 0),
    model_direction = c(0, 0, 1),
    model_rigid = FALSE,

    default_interpolation = default_interpolation,

    viewer_options = as.list(viewer_options)
  )

  proto <- ElectrodePrototype$new("")$from_list(config)
  proto$validate()

  if(!dry_run) {
    tryCatch({
      proto$save_as_default( force = overwrite )
    }, warning = function(e) {
      if(!overwrite) {
        warning("Electrode prototype already exists. Please use `overwrite = TRUE` to overwrite.")
      } else {
        warning(e)
      }
    })
  }

  proto
}

# proto <- seeg_prototype(
#   type = "sEEG-16",
#   center_position = 1 + c(3.5 * 0:15),
#   contact_widths = 2,
#   diameter = 1.0,
#   dry_run = TRUE
# )
#
# a <- proto$get_texture(seq_len(proto$n_channels), plot = TRUE)
#
# proto$as_json(to_file = "inst/prototypes/sEEG-16.json", flattern = TRUE)
#
# # a <- invisible(proto$get_texture(seq_len(proto$n_channels), plot = TRUE))
# #
# # proto$preview_3d()
# mesh2 <- proto$as_mesh3d()
# mesh2$vb[3,] <- mesh2$vb[3,] / 50
# ravetools::rgl_view({
#   ravetools::rgl_call("wire3d", mesh, col = "red")
# })
#
#
#
# brain <- raveio::rave_brain("devel/mni152_b")
# brain$electrodes$remote_geometry(prototype_name = "sEEG-16", delete = TRUE)
# brain <- raveio::rave_brain("devel/mni152_b")
# brain$plot(debug=TRUE)
