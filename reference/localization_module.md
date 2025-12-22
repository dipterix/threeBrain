# Launch a 'shiny' application to localize electrodes

If 'RAVE' has been installed, please use 'RAVE' modules. This function
is purely for demonstration purposes.

## Usage

``` r
localization_module(
  subject_code,
  fs_path,
  ct_path = NULL,
  surfaces = "pial",
  use_141 = TRUE,
  shiny_options = list(launch.browser = TRUE),
  save_path = tempfile(pattern = "electrode", fileext = ".csv"),
  ...,
  control_presets = NULL,
  side_display = FALSE,
  controllers = list()
)
```

## Arguments

- subject_code:

  subject code

- fs_path:

  the subject's 'FreeSurfer' path

- ct_path:

  the file path of 'CT' scans that have already been aligned to 'T1';
  must be in 'NIFTI' format

- surfaces:

  which surfaces to load

- use_141:

  whether to try 'SUMA' standard 141 surface; default is true

- shiny_options:

  shiny application options; see `options` in
  [`shinyApp`](https://rdrr.io/pkg/shiny/man/shinyApp.html)

- save_path:

  a temporary file where the electrode table should be cached; this file
  will be used to keep track of changes in case the application is
  crashed or shutdown

- ...:

  other parameters to pass into
  [`threeBrain`](https://dipterix.org/threeBrain/reference/threeBrain.md)

- control_presets, side_display, controllers:

  passed to
  [`threejs_brain`](https://dipterix.org/threeBrain/reference/threejs_brain.md)

## Value

A list of `'ui'` elements, `'server'` function, and a stand-alone
`'app'`

## Examples

``` r
# This example require N27 template brain to be installed
# see `?download_N27` for details

# using N27 to localize
fs_path <- file.path(default_template_directory(), "N27")
if(interactive() && dir.exists(fs_path)){
  module <- localization_module("N27", fs_path)

  print(module$app)
}
```
