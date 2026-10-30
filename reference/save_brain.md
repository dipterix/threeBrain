# Save threeBrain widgets to local file system

Save threeBrain widgets to local file system

## Usage

``` r
save_brain(
  widget,
  path,
  title = "3D Viewer",
  as_zip = FALSE,
  controllers = NULL,
  main_camera = NULL,
  ...
)
```

## Arguments

- widget:

  generated from function 'threejs_brain'

- path:

  path to save the brain widget

- title:

  widget title.

- as_zip:

  whether to create zip file "compressed.zip".

- controllers:

  `NULL` (default) to save the control panel as the widget was built, or
  a named list of control panel values that replace those, so the saved
  viewer opens with them; for example `proxy$get_controllers()` in a
  'shiny' application (see
  [`brain_proxy`](https://dipterix.org/threeBrain/reference/brain_proxy.md)),
  or `list("View Layout" = "sliceview-flat")`

- main_camera:

  `NULL` (default) to keep the camera the widget was built with, or a
  list with `position` and `up` (numeric vectors of length 3) and `zoom`
  (a positive number), so the saved viewer opens with that view; for
  example `proxy$main_camera` in a 'shiny' application, or
  `list(position = c(0, 0, 500), up = c(0, 1, 0), zoom = 1.5)`

- ...:

  ignored, used for backward compatibility

## Author

Zhengjia Wang
