#' R6 Class - Shiny Proxy for the Three-Brain Viewer
#' @description
#' Returned by \code{\link{brain_proxy}}.  Provides reactive active bindings
#' and setter methods for controlling a running three-brain viewer widget
#' from within a Shiny application.
#'
#' Active bindings (reactive fields) reflect the viewer state and trigger
#' Shiny reactivity when read inside a reactive context:
#' \describe{
#'   \item{\code{background}}{Current background color as a hex string.}
#'   \item{\code{text_decorations}}{List of current text decoration objects.}
#'   \item{\code{main_camera}}{Named list with \code{position}, \code{up},
#'     and \code{zoom}.}
#'   \item{\code{side_display}}{Logical indicating whether the side canvas is
#'     visible.}
#'   \item{\code{surface_type}}{Current surface type string (e.g.
#'     \code{"pial"}).}
#'   \item{\code{display_variable}}{Name of the currently displayed data
#'     clip.}
#'   \item{\code{plane_position}}{Named numeric vector \code{c(R, A, S)}
#'     giving the slice cursor position in FreeSurfer surface coordinates.}
#'   \item{\code{controllers}}{Full controller state list.}
#'   \item{\code{current_subject}}{Named list describing the currently active
#'     subject, including transform matrices.}
#' }
#' @author Zhengjia Wang
#' @name ViewerProxy
#' @export
NULL

#' @export
ViewerProxy <- R6::R6Class(
  portable = TRUE,
  cloneable = FALSE,
  classname = "ViewerProxy",
  private = list(
    outputId = character(0),
    session = NULL,
    ensure_session = function() {
      if (is.null(private$session)) {
        session <- shiny::getDefaultReactiveDomain()
        private$session <- session
      }
      stopifnot2(!is.null(private$session), msg = "cannot find shiny reactive session")
    },
    get_value = function(name, default = NULL) {
      private$ensure_session()
      re <- private$session$input[[paste0(private$outputId, "_", name)]]
      if (is.null(re)) {
        re <- default
      }
      re
    },
    set_value = function(name, value) {
      private$ensure_session()
      message_type <- sprintf("threeBrain-RtoJS-%s", private$session$ns(private$outputId))

      private$session$sendCustomMessage(message_type, list(
        name = name,
        value = value
      ))
    }
  ),
  public = list(
    #' @description Print a summary of the proxy's available fields and methods.
    #' @param ... Ignored.
    print = function(...) {
      cat(c(
        "<threeBrain Viewer Proxy>",
        "Fields are:",
        "  $main_camera        - main camera position, up, and zoom",
        "  $background         - background color in hex code",
        "  $side_display       - whether side canvas is visible",
        "  $surface_type       - surface type (pial, white, ...)",
        "  $display_variable   - data to visualize",
        "  $plane_position     - sagittal, coronal, axial position (RAS)",
        "  $text_decorations   - current text decoration list (reactive)",
        "Methods are:",
        "  $isolate(<field>)            - get fields but avoid shiny reactive events",
        "  $get_text_decorations()      - get text decorations (isolated)",
        "  $set_text_decoration(id,...) - create or update a text decoration",
        "  $delete_text_decoration(id)  - delete text decoration(s) by ID",
        ""
      ), sep = "\n")
    },
    #' @description Create a new viewer proxy.  Normally called via
    #'   \code{\link{brain_proxy}} rather than directly.
    #' @param outputId Shiny output element ID of the three-brain widget.
    #' @param session Shiny reactive domain session.  Defaults to the current
    #'   session returned by \code{shiny::getDefaultReactiveDomain()}.
    initialize = function(outputId, session = shiny::getDefaultReactiveDomain()) {
      private$outputId <- outputId
      if (is.null(session)) {
        warning("please run proxy in shiny reactive environment.")
      } else {
        private$session <- session
      }

    },
    #' @description Read an active binding without triggering Shiny reactivity.
    #' @param name Name of the active binding to read (character scalar).
    isolate = function(name) {
      shiny::isolate(self[[name]])
    },

    #' @description Get the current controller state as an isolated (non-reactive) list.
    get_controllers = function() {
      shiny::isolate(private$get_value("controllers", list()))
    },

    #' @description Send a named list of controller key-value pairs to the viewer.
    #' @param ctrl Named list of controller settings to apply.
    set_controllers = function(ctrl) {
      private$set_value("controllers", ctrl)
    },

    #' @description Set the viewer background color.
    #' @param col Any R color value accepted by \code{col2hexStr}.
    set_background = function(col) {
      private$set_value("background", col2hexStr(col))
    },

    #' @description Display a title overlay in the viewer.
    #' @param title Character string to display as the title.  Pass an empty
    #'   string or omit to clear the title.
    set_title = function( title ) {
      if (missing(title) || length(title) == 0) {
        title <- ""
      }
      private$set_value("title", paste(format(title), collapse = ""))
    },

    #' @description Set the viewer camera zoom level.
    #' @param zoom Positive numeric zoom factor.
    set_zoom_level = function( zoom ) {
      stopifnot2(zoom > 0, msg = "zoom level must be strictly positive")
      private$set_value("zoom_level", zoom)
    },

    #' @description Point the main camera toward a direction in world space.
    #' @param position Numeric vector of length 3: desired camera direction
    #'   (will be normalized to a unit vector then scaled to radius 500).
    #' @param up Numeric vector of length 3: camera up direction.  Defaults
    #'   to \code{c(0, 0, 1)}.
    set_camera = function(position, up) {
      dis <- sqrt(sum(position^2))
      stopifnot2(dis > 0, msg = "camera position cannot be at origin")
      position <- position / dis
      if (missing(up)) {
        up <- c(0, 0, 1)
      }
      private$set_value("camera", list(
        position = position * 500,
        up = up
      ))
    },

    #' @description Change the displayed data clip and optional value range.
    #' @param variable Name of the data clip to display.  Pass \code{""} to
    #'   clear.
    #' @param range Numeric vector of length 2 giving the display range, or
    #'   \code{NULL} to use the natural range of the data.
    set_display_data = function(variable = "", range = NULL) {
      if (variable == "" && length(range) != 2) { return() }
      private$set_value("display_data", list(
        variable = variable,
        range = sort(as.numeric(range))
      ))
    },

    #' @description Move the viewer focus to a specific electrode contact.
    #' @param subject_code Character scalar: subject identifier.
    #' @param electrode Integer scalar: electrode contact number.
    set_focused_electrode = function( subject_code, electrode ) {
      stopifnot2(
        is.character(subject_code) && length(subject_code) == 1
        && length(electrode) == 1,
        msg = "subject_code must be character and electrode length must be one."
      )
      private$set_value("focused_electrode", list(
        subject_code = subject_code,
        electrode = as.integer(electrode)
      ))
    },

    #' @description Push a data frame of electrode values to the viewer.
    #' @param data Data frame with at least columns \code{Subject} and
    #'   \code{Electrode}.
    #' @param palettes Optional named list of color palette vectors.
    #' @param value_ranges Optional named list of \code{c(min, max)} ranges.
    #' @param clear_first Logical; clear existing electrode data before
    #'   applying.  Default \code{FALSE}.
    #' @param update_display Logical; update the viewer display after the data
    #'   is applied.  Default \code{TRUE}.
    #' @param override Logical; override existing data for the same clip.
    #'   Default \code{TRUE}.
    set_electrode_data = function(
      data, palettes = NULL, value_ranges = NULL, clear_first = FALSE,
      update_display = TRUE, override = TRUE
    ) {
      stopifnot2(
        is.data.frame(data),
        msg = "brain_proxy$set_electrode_data(data, ...): `data` must be a data.frame."
      )
      private$set_value("set_electrode_data", list(
        data = data,
        palettes = as.list(palettes),
        valueRanges = as.list(value_ranges),
        clearFirst = clear_first,
        updateDisplay = update_display,
        override = override
      ))
    },

    #' @description Apply a color palette to an existing electrode data clip.
    #' @param colors Character vector of CSS color strings.
    #' @param variable Name of the data clip to apply the palette to.
    set_electrode_palette = function(colors, variable) {
      colors <- col2hexStr(colors)
      stopifnot2(length(colors) > 0, msg = "`colors` must not be empty")
      private$set_value("set_electrode_palette", list(
        colors = colors,
        name = variable
      ))
    },

    #' @description Set the global text magnification factor for the viewer.
    #' @param cex Positive numeric magnification factor.  Default \code{1}.
    set_cex = function( cex = 1 ) {
      stopifnot2(cex > 0, msg = "cex must be positive")
      private$set_value("font_magnification", cex)
    },

    #' @description Update the parameters of a localization electrode contact.
    #' @param which Integer index of the electrode contact to update.
    #' @param params Named list of parameter values to update.
    #' @param update_shiny Logical; push the update to Shiny inputs.
    #'   Default \code{TRUE}.
    set_localization_electrode = function(which, params, update_shiny = TRUE) {
      which <- as.integer(which)
      private$set_value("set_localization_electrode", list(
        which = which,
        params = as.list(params),
        update_shiny = isTRUE(update_shiny)
      ))
    },

    #' @description Set the world transform matrix of a named scene object.
    #' @param name Character: name of the three-brain scene object.
    #' @param m44 Numeric vector of length 16 or a 4-by-4 matrix (row-major).
    set_matrix_world = function( name, m44 ) {
      if (length(m44) != 16) {
        stop("brain_proxy$set_matrix_world: `m44` must be a 4x4 matrix")
      }
      if (is.matrix(m44)) {
        m44 <- as.vector(t(m44))
      }
      private$set_value("set_matrix_world", list(
        instanceName = name,
        matrix = m44,
        byrow = TRUE
      ))
    },

    #' @description Add a new localization electrode contact to the viewer.
    #' @param params Named list with at least \code{Coord_x}, \code{Coord_y},
    #'   \code{Coord_z} in FreeSurfer surface coordinates (unless
    #'   \code{is_prototype = TRUE}).
    #' @param update_shiny Logical; push the addition to Shiny inputs.
    #'   Default \code{TRUE}.
    add_localization_electrode = function(params, update_shiny = TRUE) {
      params <- as.list(params)
      if (!isTRUE(params$is_prototype)) {
        if (length(c(params$Coord_x, params$Coord_y, params$Coord_z)) != 3) {
          stop("`add_localization_electrode` must contains valid `Coord_x, Coord_y, Coord_z` (tkrRAS)")
        }
      }
      params$update_shiny <- isTRUE(update_shiny)
      private$set_value("add_localization_electrode", params)
    },

    #' @description Remove all localization electrode contacts from the viewer.
    #' @param update_shiny Logical; push the change to Shiny inputs.
    #'   Default \code{TRUE}.
    clear_localization = function(update_shiny = TRUE) {
      private$set_value( "clear_localization", isTRUE(update_shiny) )
    },

    #' @description Set which hemisphere is targeted for the next electrode
    #'   localization click.
    #' @param hemisphere Character scalar: \code{"left"} or \code{"right"}.
    set_incoming_localization_hemisphere = function( hemisphere ) {
      private$set_value( "set_incoming_localization_hemisphere", paste(hemisphere, collapse = "") )
    },

    #' @description Add an animation clip of scalar or categorical values to a
    #'   named geometry object in the viewer.
    #' @param name Character clip name used as the display variable label.
    #' @param target_object Name of the geometry object to animate.
    #' @param data_type Either \code{"continuous"} or \code{"discrete"}.
    #' @param value Numeric or character vector of values.
    #' @param palette Color palette: a vector of R colors.
    #'   Default \code{rainbow(64)}.
    #' @param symmetric Logical; whether the color scale is symmetric around
    #'   zero.  Default \code{FALSE}.
    #' @param time Numeric vector of time points matching \code{value}.
    #'   Defaults to \code{0} for a single value.
    #' @param value_range Numeric vector of length 2 overriding the data
    #'   range.  \code{NULL} uses the natural range.
    #' @param time_range Numeric vector of length 2 overriding the time
    #'   range.  \code{NULL} uses the natural range.
    #' @param value_names Optional character vector of level labels for
    #'   discrete data.
    #' @param switch_display Logical; switch the viewer display to this clip
    #'   after upload.  Default \code{FALSE}.
    set_values = function( name, target_object, data_type,
                           value, palette = rainbow(64), symmetric = FALSE,
                           time = ifelse(length(value) == 1, 0, stop("time must match length with value")),
                           value_range = NULL, time_range = NULL, value_names = NULL,
                           switch_display = FALSE) {
      data_type <- data_type[[1]]
      stopifnot2(data_type %in% c("continuous", "discrete"), msg = paste(
        "data_type must be either", sQuote("continuous"), "or", sQuote("discrete")
      ))

      geom <- ElectrodeGeom$new(name = "")
      if (length(time) == 1) {
        time <- rep(time, length(value))
      }
      geom$set_value(value = value, name = name, time_stamp = time)
      kf <- geom$keyframes[[1]]
      l <- kf$to_list()
      cmap <- ColorMap$new(name = name, symmetric = symmetric, geom)
      cmap$value_type <- data_type

      cmap$set_colors(colors = palette)
      cl <- cmap$to_list()

      # const clip_name = args.clip_name,
      # mesh_name = args.target,
      # data_type = args.data_type,
      # value = args.value,
      # time = args.time || 0,
      # value_names = args.value_names || [""],
      # value_range = args.value_range || [0,1];
      # time_range = args.time_range || [0,0],
      # color_keys = to_array( args.color_keys ),
      # color_vals = to_array( args.color_vals ),
      # n_levels = args.n_levels,
      # focusui = args.focus || false;


      if (length(value_range) < 2 && data_type == "continuous") {
        value_range <- cl$value_range
      }
      if (symmetric && data_type == "continuous") {
        value_range <- c(-1, 1) * max(abs(value_range))
      }

      private$set_value("add_clip", list(
        clip_name = kf$name,
        target = target_object,
        data_type = data_type,
        value = l$value,
        time = l$time,
        value_names = unique(c(value_names, cl$value_names)),
        value_range = range(value_range, na.rm = TRUE),
        time_range = range(cl$time_range, time_range),
        n_levels = length(cl$value_names),
        color_keys = cl$color_keys,
        color_vals = cl$color_vals,
        focusui = switch_display
      ))
    },

    #' @description
    #' Get the current text decorations from the viewer.
    #'
    #' Returns a list of named lists, each with fields \code{id},
    #' \code{text}, \code{position}, \code{color}, \code{font_size}, and
    #' \code{layer}.  Returns an empty list when no decorations exist.
    get_text_decorations = function() {
      shiny::isolate(private$get_value("text_decorations", list()))
    },

    #' @description
    #' Create or update a text decoration in the viewer.
    #'
    #' @param id        Character scalar: stable decoration ID.
    #' @param text      Character scalar: label to display.
    #' @param position  Numeric vector of length 3 in world space.
    #' @param font_size Positive number: world-space sprite height (mm).
    #' @param color     CSS color string (e.g. \code{"#ff0000"}).
    #' @param layer     Integer or integer vector: camera layer(s).
    set_text_decoration = function(
      id,
      text = NULL,
      position = NULL,
      font_size = NULL,
      color = NULL,
      layer = NULL
    ) {
      if (!is.character(id) || length(id) != 1 || !nzchar(id)) {
        stop("set_text_decoration: `id` must be a non-empty character scalar")
      }
      params <- list(id = id)
      if (!is.null(text)) {
        params$text <- paste(as.character(text), collapse = "")
      }
      if (!is.null(position)) {
        pos <- as.numeric(position)
        if (length(pos) != 3 || anyNA(pos)) {
          stop("set_text_decoration: `position` must be a length-3 numeric vector")
        }
        params$position <- as.list(pos)
      }
      if (!is.null(font_size)) {
        fs <- as.numeric(font_size)[[1]]
        if (is.na(fs) || fs <= 0) {
          stop("set_text_decoration: `font_size` must be a positive number")
        }
        params$font_size <- fs
      }
      if (!is.null(color)) {
        params$color <- as.character(color)[[1]]
      }
      if (!is.null(layer)) {
        params$layer <- as.integer(layer)
      }
      private$set_value("text_decoration_set", params)
    },

    #' @description
    #' Delete one or more text decorations from the viewer.
    #'
    #' @param id Character scalar or vector of decoration IDs to remove.
    delete_text_decoration = function(id) {
      if (!is.character(id) || length(id) == 0) {
        stop("delete_text_decoration: `id` must be a non-empty character vector")
      }
      private$set_value("text_decoration_delete", list(id = as.list(id)))
    },

    #' @description Get the current slice cursor position in a requested
    #'   coordinate space.
    #' @param space Coordinate space.  One of \code{"tkrRAS"} (default),
    #'   \code{"MNI305"}, \code{"MNI152"}, \code{"scanner"}, or \code{"CRS"}.
    get_crosshair_position = function(space = c("tkrRAS", "MNI305", "MNI152", "scanner", "CRS")) {
      pos <- c(self$plane_position, 1)
      space <- match.arg(space)
      subject <- shiny::isolate(self$current_subject)
      if (is.null(subject$subject_code)) {
        return(c(0, 0, 0))
      }
      Norig <- subject$Norig
      Torig <- subject$Torig
      xfm <- subject$xfm

      switch(
        space,
        "CRS" = {
          pos <- solve(Torig) %*% pos
        },
        "scanner" = {
          # ScannerRAS = Norig*inv(Torig)*[tkrR tkrA tkrS 1]'
          pos <- Norig %*% solve(Torig) %*% pos
        },
        "MNI305" = {
          # MNI305RAS = TalXFM*Norig*inv(Torig)*[tkrR tkrA tkrS 1]'
          pos <- xfm %*% Norig %*% solve(Torig) %*% pos
        },
        "MNI152" = {
          pos <- MNI305_to_MNI152 %*% xfm %*% Norig %*% solve(Torig) %*% pos
        }
      )

      return(pos[c(1, 2, 3)])

    },

    #' @description Move the slice cursor to a given position in a requested
    #'   coordinate space.
    #' @param position Numeric vector of length 3.
    #' @param space Coordinate space of \code{position}.  One of
    #'   \code{"tkrRAS"} (default), \code{"MNI305"}, \code{"MNI152"},
    #'   \code{"scanner"}, or \code{"CRS"}.
    set_crosshair_position = function(position, space = c("tkrRAS", "MNI305", "MNI152", "scanner", "CRS")) {

      space <- match.arg(space)

      if (length(position) != 3) {
        stop("set_crosshair_position: `position` length must be 3")
      }
      position <- as.numeric(position)
      if (anyNA(position) || !all(is.finite(position))) {
        stop("set_crosshair_position: `position` length must be finite")
      }

      pos <- c(position, 1)
      subject <- shiny::isolate(self$current_subject)
      if (!is.null(subject$subject_code)) {
        Norig <- subject$Norig
        Torig <- subject$Torig
        xfm <- subject$xfm

        switch(
          space,
          "CRS" = {
            pos <- Torig %*% pos
          },
          "scanner" = {
            # ScannerRAS = Norig*inv(Torig)*[tkrR tkrA tkrS 1]'
            pos <- Torig %*% solve(Norig) %*% pos
          },
          "MNI305" = {
            # MNI305RAS = TalXFM*Norig*inv(Torig)*[tkrR tkrA tkrS 1]'
            pos <- Torig %*% solve(Norig) %*% solve(xfm) %*% pos
          },
          "MNI152" = {
            pos <- Torig %*% solve(Norig) %*% solve(xfm) %*% solve(MNI305_to_MNI152) %*% pos
          }
        )

      }

      pos <- pos[seq_len(3)]

      self$set_controllers(list(
        "Sagittal (L - R)" = pos[[1]],
        "Coronal (P - A)" = pos[[2]],
        "Axial (I - S)" = pos[[3]]
      ))

      # private$set_value("set_plane", list(
      #   x = pos[[1]],
      #   y = pos[[2]],
      #   z = pos[[3]]
      # ))
    }

  ),
  active = list(
    #' @field background Current viewer background color as a hex string
    #'   (e.g. \code{"#FFFFFF"}).  Reactive.
    background = function() {
      private$get_value("background", "#FFFFFF")
    },
    #' @field text_decorations List of current text decoration parameter lists
    #'   pushed from JavaScript.  Each element has fields \code{id},
    #'   \code{text}, \code{position}, \code{color}, \code{font_size}, and
    #'   \code{layer}.  Reactive.
    text_decorations = function() {
      private$get_value("text_decorations", list())
    },
    #' @field main_camera Named list with elements \code{position} (length-3
    #'   numeric), \code{up} (length-3 numeric), and \code{zoom} (positive
    #'   numeric) describing the main camera state.  Reactive.
    main_camera = function() {
      camera <- private$get_value("main_camera", NULL)
      if (!is.list(camera)) { camera <- list() }

      # make sure position exists, numerical, and not NA/origin
      position <- c(500, 0, 0)
      pos <- unname(unlist(camera$position))
      if (length(pos) == 3) {
        pos <- as.numeric(pos)
        if (!anyNA(pos) && !all(pos == 0)) {
          position <- pos
        }
      }
      camera$position <- position

      # make sure `up` exists, numerical, and not NA/origin
      up0 <- c(0, 0, 1)
      up <- unname(unlist(camera$up))
      if (length(up) == 3) {
        up <- as.numeric(up)
        if (!anyNA(up) && !all(up == 0)) {
          up0 <- up
        }
      }
      camera$up <- up0

      # make sure zoom exists
      zoom <- as.numeric(camera$zoom)
      if (length(zoom) != 1 || is.na(zoom) || zoom <= 0) {
        zoom <- 1
      }
      camera$zoom <- zoom
      camera
    },

    #' @field side_display Logical indicating whether the side canvas panel
    #'   is currently visible.  Reactive.
    side_display = function() {
      private$get_value("side_display", NULL)
    },

    #' @field surface_type Current brain surface type string
    #'   (e.g. \code{"pial"}, \code{"white"}).  Reactive.
    surface_type = function() {
      private$get_value("surface_type", "pial")
    },

    #' @field display_variable Name of the data clip currently displayed in
    #'   the viewer.  \code{"[None]"} when nothing is displayed.  Reactive.
    display_variable = function() {
      private$get_value("clip_name", "[None]")
    },

    #' @field plane_position Named numeric vector \code{c(R, A, S)} giving
    #'   the slice cursor position in FreeSurfer surface coordinates.
    #'   Reactive.
    plane_position = function() {
      controllers <- self$get_controllers()
      sagittal_depth <- controllers[["Sagittal (L - R)"]]
      if (length(sagittal_depth) != 1) { sagittal_depth <- 0 }

      coronal_depth <- controllers[["Coronal (P - A)"]]
      if (length(coronal_depth) != 1) { coronal_depth <- 0 }

      axial_depth <- controllers[["Axial (I - S)"]]
      if (length(axial_depth) != 1) { axial_depth <- 0 }
      # sagittal_depth <- private$get_value("sagittal_depth", 0)
      # coronal_depth <- private$get_value("coronal_depth", 0)
      # axial_depth <- private$get_value("axial_depth", 0)
      re <- c(sagittal_depth, coronal_depth, axial_depth)
      names(re) <- c("R", "A", "S")
      re
    },

    #' @field localization_table Data frame of localization electrode contacts
    #'   parsed from the JSON pushed by the viewer, or \code{NULL}.  Reactive.
    localization_table = function() {
      private$ensure_session()
      tbl <- private$get_value("localization_table", NULL)
      if (!is.null(tbl)) {
        tbl <- tryCatch({
          jsonlite::fromJSON(tbl, simplifyDataFrame = TRUE)
        }, error = function(e) {
          NULL
        })
      }
      tbl
    },

    #' @field localization_add_quaternion Rotation data list pushed by the
    #'   viewer when a localization point is added.  Reactive.
    localization_add_quaternion = function() {
      private$ensure_session()
      private$get_value("localization_addQuaternion", list())
    },

    #' @field mouse_event_double_click Named list describing the last
    #'   double-click mouse event in the viewer.  Reactive.
    mouse_event_double_click = function() {
      private$get_value("mouse_dblclicked", list())
    },

    #' @field mouse_event_click Named list describing the last single-click
    #'   mouse event in the viewer.  Reactive.
    mouse_event_click = function() {
      private$get_value("mouse_clicked", list())
    },

    #' @field controllers Full named list of the viewer's current controller
    #'   (GUI panel) state.  Reactive.
    controllers = function() {
      private$get_value("controllers", list())
    },

    #' @field current_subject Named list describing the currently active
    #'   subject.  Includes \code{subject_code}, \code{Norig}, \code{Torig},
    #'   and \code{xfm} transform matrices.  Reactive.
    current_subject = function() {
      data <- private$get_value("current_subject", list())
      if (length(data)) {
        data$Norig <- matrix(unlist(data$Norig), nrow = 4, byrow = TRUE)
        data$Torig <- matrix(unlist(data$Torig), nrow = 4, byrow = TRUE)
        data$xfm <- matrix(unlist(data$xfm), nrow = 4, byrow = TRUE)
      }
      data
    },

    #' @field sync Sync token string pushed by the viewer on each render
    #'   cycle; useful for triggering reactive updates.  Reactive.
    sync = function() {
      private$get_value("sync", "")
    },

    #' @field acpc_alignment Named list describing the AC-PC alignment in
    #'   scanner RAS space.  Includes \code{ac}, \code{pc}, \code{ras2acpc},
    #'   and set-flags.  Reactive.
    acpc_alignment = function() {
      data <- private$get_value("acpc_realign", list())
      if (!length(data) || !is.list(data)) { return(data) }
      acpc <- data$acpc
      Torig <- matrix(unlist(data$transforms$Torig), byrow = FALSE, nrow = 4)
      Norig <- matrix(unlist(data$transforms$Norig), byrow = FALSE, nrow = 4)

      tkr2scanner <- Norig %*% solve(Torig)

      ac <- c(0, 0, 0)
      ac_set <- FALSE
      if (isTRUE(acpc$acSet)) {
        ac <- (tkr2scanner %*% c(unlist(acpc$ac), 1))[seq_len(3)]
        ac_set <- TRUE
      }
      pc <- c(0, -1, 0)
      pc_set <- FALSE
      if (isTRUE(acpc$pcSet)) {
        pc <- (tkr2scanner %*% c(unlist(acpc$pc), 1))[seq_len(3)]
        pc_set <- TRUE
      }
      x_axis <- (tkr2scanner %*% c(unlist(acpc$xAxis), 0))[seq_len(3)]
      if (all(x_axis == 0)) {
        x_axis <- c(1, 0, 0)
      } else {
        x_axis <- x_axis / norm(x_axis, type = "2")
      }
      y_axis <- ac - pc
      if (all(y_axis == 0)) {
        y_axis <- c(0, 1, 0)
        pc <- ac - y_axis
      } else {
        y_axis <- y_axis / norm(y_axis, type = "2")
      }
      z_axis <- cross_prod(x_axis, y_axis)
      z_axis <- z_axis / norm(z_axis, type = "2")

      # acpc_in_ras %*% c(0,0,0,1) -> ac
      acpc_in_ras <- rbind(cbind(x_axis, y_axis, z_axis, ac), c(0, 0, 0, 1))
      dimnames(acpc_in_ras) <- NULL
      ras2acpc <- solve(acpc_in_ras)

      list(
        space = "scannerRAS",
        ac = ac,
        ac_set = ac_set,
        pc = pc,
        pc_set = pc_set,
        ras2acpc = ras2acpc
      )
    }

  )
)

#' Shiny Proxy for Viewer
#' @param outputId shiny output ID
#' @param session shiny session, default is current session (see \code{\link[shiny]{domains}})
#' @return \code{R6} class \code{ViewerProxy}
#' @export
brain_proxy <- function(outputId, session = shiny::getDefaultReactiveDomain()) {
  ViewerProxy$new(outputId, session)
}


