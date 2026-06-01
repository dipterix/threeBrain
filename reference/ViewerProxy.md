# R6 Class - Shiny Proxy for the Three-Brain Viewer

Returned by
[`brain_proxy`](https://dipterix.org/threeBrain/reference/brain_proxy.md).
Provides reactive active bindings and setter methods for controlling a
running three-brain viewer widget from within a Shiny application.

Active bindings (reactive fields) reflect the viewer state and trigger
Shiny reactivity when read inside a reactive context:

- `background`:

  Current background color as a hex string.

- `text_decorations`:

  List of current text decoration objects.

- `main_camera`:

  Named list with `position`, `up`, and `zoom`.

- `side_display`:

  Logical indicating whether the side canvas is visible.

- `surface_type`:

  Current surface type string (e.g. `"pial"`).

- `display_variable`:

  Name of the currently displayed data clip.

- `plane_position`:

  Named numeric vector `c(R, A, S)` giving the slice cursor position in
  FreeSurfer surface coordinates.

- `controllers`:

  Full controller state list.

- `current_subject`:

  Named list describing the currently active subject, including
  transform matrices.

## Author

Zhengjia Wang

## Active bindings

- `background`:

  Current viewer background color as a hex string (e.g. `"#FFFFFF"`).
  Reactive.

- `text_decorations`:

  List of current text decoration parameter lists pushed from
  JavaScript. Each element has fields `id`, `text`, `position`, `color`,
  `font_size`, and `layer`. Reactive.

- `main_camera`:

  Named list with elements `position` (length-3 numeric), `up` (length-3
  numeric), and `zoom` (positive numeric) describing the main camera
  state. Reactive.

- `side_display`:

  Logical indicating whether the side canvas panel is currently visible.
  Reactive.

- `surface_type`:

  Current brain surface type string (e.g. `"pial"`, `"white"`).
  Reactive.

- `display_variable`:

  Name of the data clip currently displayed in the viewer. `"[None]"`
  when nothing is displayed. Reactive.

- `plane_position`:

  Named numeric vector `c(R, A, S)` giving the slice cursor position in
  FreeSurfer surface coordinates. Reactive.

- `localization_table`:

  Data frame of localization electrode contacts parsed from the JSON
  pushed by the viewer, or `NULL`. Reactive.

- `localization_add_quaternion`:

  Rotation data list pushed by the viewer when a localization point is
  added. Reactive.

- `mouse_event_double_click`:

  Named list describing the last double-click mouse event in the viewer.
  Reactive.

- `mouse_event_click`:

  Named list describing the last single-click mouse event in the viewer.
  Reactive.

- `controllers`:

  Full named list of the viewer's current controller (GUI panel) state.
  Reactive.

- `current_subject`:

  Named list describing the currently active subject. Includes
  `subject_code`, `Norig`, `Torig`, and `xfm` transform matrices.
  Reactive.

- `sync`:

  Sync token string pushed by the viewer on each render cycle; useful
  for triggering reactive updates. Reactive.

- `acpc_alignment`:

  Named list describing the AC-PC alignment in scanner RAS space.
  Includes `ac`, `pc`, `ras2acpc`, and set-flags. Reactive.

## Methods

### Public methods

- [`ViewerProxy$print()`](#method-ViewerProxy-print)

- [`ViewerProxy$new()`](#method-ViewerProxy-initialize)

- [`ViewerProxy$isolate()`](#method-ViewerProxy-isolate)

- [`ViewerProxy$get_controllers()`](#method-ViewerProxy-get_controllers)

- [`ViewerProxy$set_controllers()`](#method-ViewerProxy-set_controllers)

- [`ViewerProxy$set_background()`](#method-ViewerProxy-set_background)

- [`ViewerProxy$set_title()`](#method-ViewerProxy-set_title)

- [`ViewerProxy$set_zoom_level()`](#method-ViewerProxy-set_zoom_level)

- [`ViewerProxy$set_camera()`](#method-ViewerProxy-set_camera)

- [`ViewerProxy$set_display_data()`](#method-ViewerProxy-set_display_data)

- [`ViewerProxy$set_focused_electrode()`](#method-ViewerProxy-set_focused_electrode)

- [`ViewerProxy$set_electrode_data()`](#method-ViewerProxy-set_electrode_data)

- [`ViewerProxy$set_electrode_palette()`](#method-ViewerProxy-set_electrode_palette)

- [`ViewerProxy$set_cex()`](#method-ViewerProxy-set_cex)

- [`ViewerProxy$set_localization_electrode()`](#method-ViewerProxy-set_localization_electrode)

- [`ViewerProxy$set_matrix_world()`](#method-ViewerProxy-set_matrix_world)

- [`ViewerProxy$add_localization_electrode()`](#method-ViewerProxy-add_localization_electrode)

- [`ViewerProxy$clear_localization()`](#method-ViewerProxy-clear_localization)

- [`ViewerProxy$set_incoming_localization_hemisphere()`](#method-ViewerProxy-set_incoming_localization_hemisphere)

- [`ViewerProxy$set_values()`](#method-ViewerProxy-set_values)

- [`ViewerProxy$get_text_decorations()`](#method-ViewerProxy-get_text_decorations)

- [`ViewerProxy$set_text_decoration()`](#method-ViewerProxy-set_text_decoration)

- [`ViewerProxy$delete_text_decoration()`](#method-ViewerProxy-delete_text_decoration)

- [`ViewerProxy$get_crosshair_position()`](#method-ViewerProxy-get_crosshair_position)

- [`ViewerProxy$set_crosshair_position()`](#method-ViewerProxy-set_crosshair_position)

------------------------------------------------------------------------

### `ViewerProxy$print()`

Print a summary of the proxy's available fields and methods.

#### Usage

    ViewerProxy$print(...)

#### Arguments

- `...`:

  Ignored.

------------------------------------------------------------------------

### `ViewerProxy$new()`

Create a new viewer proxy. Normally called via
[`brain_proxy`](https://dipterix.org/threeBrain/reference/brain_proxy.md)
rather than directly.

#### Usage

    ViewerProxy$new(outputId, session = shiny::getDefaultReactiveDomain())

#### Arguments

- `outputId`:

  Shiny output element ID of the three-brain widget.

- `session`:

  Shiny reactive domain session. Defaults to the current session
  returned by
  [`shiny::getDefaultReactiveDomain()`](https://rdrr.io/pkg/shiny/man/domains.html).

------------------------------------------------------------------------

### `ViewerProxy$isolate()`

Read an active binding without triggering Shiny reactivity.

#### Usage

    ViewerProxy$isolate(name)

#### Arguments

- `name`:

  Name of the active binding to read (character scalar).

------------------------------------------------------------------------

### `ViewerProxy$get_controllers()`

Get the current controller state as an isolated (non-reactive) list.

#### Usage

    ViewerProxy$get_controllers()

------------------------------------------------------------------------

### `ViewerProxy$set_controllers()`

Send a named list of controller key-value pairs to the viewer.

#### Usage

    ViewerProxy$set_controllers(ctrl)

#### Arguments

- `ctrl`:

  Named list of controller settings to apply.

------------------------------------------------------------------------

### `ViewerProxy$set_background()`

Set the viewer background color.

#### Usage

    ViewerProxy$set_background(col)

#### Arguments

- `col`:

  Any R color value accepted by `col2hexStr`.

------------------------------------------------------------------------

### `ViewerProxy$set_title()`

Display a title overlay in the viewer.

#### Usage

    ViewerProxy$set_title(title)

#### Arguments

- `title`:

  Character string to display as the title. Pass an empty string or omit
  to clear the title.

------------------------------------------------------------------------

### `ViewerProxy$set_zoom_level()`

Set the viewer camera zoom level.

#### Usage

    ViewerProxy$set_zoom_level(zoom)

#### Arguments

- `zoom`:

  Positive numeric zoom factor.

------------------------------------------------------------------------

### `ViewerProxy$set_camera()`

Point the main camera toward a direction in world space.

#### Usage

    ViewerProxy$set_camera(position, up)

#### Arguments

- `position`:

  Numeric vector of length 3: desired camera direction (will be
  normalized to a unit vector then scaled to radius 500).

- `up`:

  Numeric vector of length 3: camera up direction. Defaults to
  `c(0, 0, 1)`.

------------------------------------------------------------------------

### `ViewerProxy$set_display_data()`

Change the displayed data clip and optional value range.

#### Usage

    ViewerProxy$set_display_data(variable = "", range = NULL)

#### Arguments

- `variable`:

  Name of the data clip to display. Pass `""` to clear.

- `range`:

  Numeric vector of length 2 giving the display range, or `NULL` to use
  the natural range of the data.

------------------------------------------------------------------------

### `ViewerProxy$set_focused_electrode()`

Move the viewer focus to a specific electrode contact.

#### Usage

    ViewerProxy$set_focused_electrode(subject_code, electrode)

#### Arguments

- `subject_code`:

  Character scalar: subject identifier.

- `electrode`:

  Integer scalar: electrode contact number.

------------------------------------------------------------------------

### `ViewerProxy$set_electrode_data()`

Push a data frame of electrode values to the viewer.

#### Usage

    ViewerProxy$set_electrode_data(
      data,
      palettes = NULL,
      value_ranges = NULL,
      clear_first = FALSE,
      update_display = TRUE,
      override = TRUE
    )

#### Arguments

- `data`:

  Data frame with at least columns `Subject` and `Electrode`.

- `palettes`:

  Optional named list of color palette vectors.

- `value_ranges`:

  Optional named list of `c(min, max)` ranges.

- `clear_first`:

  Logical; clear existing electrode data before applying. Default
  `FALSE`.

- `update_display`:

  Logical; update the viewer display after the data is applied. Default
  `TRUE`.

- `override`:

  Logical; override existing data for the same clip. Default `TRUE`.

------------------------------------------------------------------------

### `ViewerProxy$set_electrode_palette()`

Apply a color palette to an existing electrode data clip.

#### Usage

    ViewerProxy$set_electrode_palette(colors, variable)

#### Arguments

- `colors`:

  Character vector of CSS color strings.

- `variable`:

  Name of the data clip to apply the palette to.

------------------------------------------------------------------------

### `ViewerProxy$set_cex()`

Set the global text magnification factor for the viewer.

#### Usage

    ViewerProxy$set_cex(cex = 1)

#### Arguments

- `cex`:

  Positive numeric magnification factor. Default `1`.

------------------------------------------------------------------------

### `ViewerProxy$set_localization_electrode()`

Update the parameters of a localization electrode contact.

#### Usage

    ViewerProxy$set_localization_electrode(which, params, update_shiny = TRUE)

#### Arguments

- `which`:

  Integer index of the electrode contact to update.

- `params`:

  Named list of parameter values to update.

- `update_shiny`:

  Logical; push the update to Shiny inputs. Default `TRUE`.

------------------------------------------------------------------------

### `ViewerProxy$set_matrix_world()`

Set the world transform matrix of a named scene object.

#### Usage

    ViewerProxy$set_matrix_world(name, m44)

#### Arguments

- `name`:

  Character: name of the three-brain scene object.

- `m44`:

  Numeric vector of length 16 or a 4-by-4 matrix (row-major).

------------------------------------------------------------------------

### `ViewerProxy$add_localization_electrode()`

Add a new localization electrode contact to the viewer.

#### Usage

    ViewerProxy$add_localization_electrode(params, update_shiny = TRUE)

#### Arguments

- `params`:

  Named list with at least `Coord_x`, `Coord_y`, `Coord_z` in FreeSurfer
  surface coordinates (unless `is_prototype = TRUE`).

- `update_shiny`:

  Logical; push the addition to Shiny inputs. Default `TRUE`.

------------------------------------------------------------------------

### `ViewerProxy$clear_localization()`

Remove all localization electrode contacts from the viewer.

#### Usage

    ViewerProxy$clear_localization(update_shiny = TRUE)

#### Arguments

- `update_shiny`:

  Logical; push the change to Shiny inputs. Default `TRUE`.

------------------------------------------------------------------------

### `ViewerProxy$set_incoming_localization_hemisphere()`

Set which hemisphere is targeted for the next electrode localization
click.

#### Usage

    ViewerProxy$set_incoming_localization_hemisphere(hemisphere)

#### Arguments

- `hemisphere`:

  Character scalar: `"left"` or `"right"`.

------------------------------------------------------------------------

### `ViewerProxy$set_values()`

Add an animation clip of scalar or categorical values to a named
geometry object in the viewer.

#### Usage

    ViewerProxy$set_values(
      name,
      target_object,
      data_type,
      value,
      palette = rainbow(64),
      symmetric = FALSE,
      time = ifelse(length(value) == 1, 0, stop("time must match length with value")),
      value_range = NULL,
      time_range = NULL,
      value_names = NULL,
      switch_display = FALSE
    )

#### Arguments

- `name`:

  Character clip name used as the display variable label.

- `target_object`:

  Name of the geometry object to animate.

- `data_type`:

  Either `"continuous"` or `"discrete"`.

- `value`:

  Numeric or character vector of values.

- `palette`:

  Color palette: a vector of R colors. Default `rainbow(64)`.

- `symmetric`:

  Logical; whether the color scale is symmetric around zero. Default
  `FALSE`.

- `time`:

  Numeric vector of time points matching `value`. Defaults to `0` for a
  single value.

- `value_range`:

  Numeric vector of length 2 overriding the data range. `NULL` uses the
  natural range.

- `time_range`:

  Numeric vector of length 2 overriding the time range. `NULL` uses the
  natural range.

- `value_names`:

  Optional character vector of level labels for discrete data.

- `switch_display`:

  Logical; switch the viewer display to this clip after upload. Default
  `FALSE`.

------------------------------------------------------------------------

### `ViewerProxy$get_text_decorations()`

Get the current text decorations from the viewer.

Returns a list of named lists, each with fields `id`, `text`,
`position`, `color`, `font_size`, and `layer`. Returns an empty list
when no decorations exist.

#### Usage

    ViewerProxy$get_text_decorations()

------------------------------------------------------------------------

### `ViewerProxy$set_text_decoration()`

Create or update a text decoration in the viewer.

#### Usage

    ViewerProxy$set_text_decoration(
      id,
      text = NULL,
      position = NULL,
      font_size = NULL,
      color = NULL,
      layer = NULL
    )

#### Arguments

- `id`:

  Character scalar: stable decoration ID.

- `text`:

  Character scalar: label to display.

- `position`:

  Numeric vector of length 3 in world space.

- `font_size`:

  Positive number: world-space sprite height (mm).

- `color`:

  CSS color string (e.g. `"#ff0000"`).

- `layer`:

  Integer or integer vector: camera layer(s).

------------------------------------------------------------------------

### `ViewerProxy$delete_text_decoration()`

Delete one or more text decorations from the viewer.

#### Usage

    ViewerProxy$delete_text_decoration(id)

#### Arguments

- `id`:

  Character scalar or vector of decoration IDs to remove.

------------------------------------------------------------------------

### `ViewerProxy$get_crosshair_position()`

Get the current slice cursor position in a requested coordinate space.

#### Usage

    ViewerProxy$get_crosshair_position(
      space = c("tkrRAS", "MNI305", "MNI152", "scanner", "CRS")
    )

#### Arguments

- `space`:

  Coordinate space. One of `"tkrRAS"` (default), `"MNI305"`, `"MNI152"`,
  `"scanner"`, or `"CRS"`.

------------------------------------------------------------------------

### `ViewerProxy$set_crosshair_position()`

Move the slice cursor to a given position in a requested coordinate
space.

#### Usage

    ViewerProxy$set_crosshair_position(
      position,
      space = c("tkrRAS", "MNI305", "MNI152", "scanner", "CRS")
    )

#### Arguments

- `position`:

  Numeric vector of length 3.

- `space`:

  Coordinate space of `position`. One of `"tkrRAS"` (default),
  `"MNI305"`, `"MNI152"`, `"scanner"`, or `"CRS"`.
