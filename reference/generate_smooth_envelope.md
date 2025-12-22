# Generate smooth envelope around surface

Alternative to 'Matlab' version of `'pial-outer-smoothed'`, use this
function along with
[`fill_surface`](https://dipterix.org/ravetools/reference/fill_surface.html).

## Usage

``` r
generate_smooth_envelope(
  surface_path,
  save_as = NULL,
  inflate = 3,
  verbose = TRUE,
  save_format = c("auto", "bin", "asc", "vtk", "ply", "off", "obj", "gii", "mz3", "byu")
)
```

## Arguments

- surface_path:

  path to `'*h.pial'` surface in the 'FreeSurfer' folder, or a
  3-dimensional mesh, see
  [`read.fs.surface`](https://rdrr.io/pkg/freesurferformats/man/read.fs.surface.html)

- save_as:

  save final envelope to path, or `NULL` for dry-run

- inflate:

  number of `'voxels'` to inflate before fitting envelope; must be a
  non-negative integer

- verbose:

  whether to verbose the progress; default is true

- save_format:

  format of saved file when `save_as` is not `NULL`; see `format`
  argument in function
  [`write.fs.surface`](https://rdrr.io/pkg/freesurferformats/man/write.fs.surface.html)

## Value

A 3-dimensional mesh that contains vertices and face indices, the result
is also saved to `save_as` is specified.

## Examples

``` r
if(interactive() &&
   file.exists(file.path(default_template_directory(), "N27"))) {

library(threeBrain)

fs_path <- file.path(default_template_directory(), "N27")

# lh.pial-outer-smoothed
lh_pial <- file.path(fs_path, "surf", "lh.pial")
save_as <- file.path(fs_path, "surf", "lh.pial-outer-smoothed")
generate_smooth_envelope(lh_pial, save_as)

# rh.pial-outer-smoothed
rh_pial <- file.path(fs_path, "surf", "rh.pial")
save_as <- file.path(fs_path, "surf", "rh.pial-outer-smoothed")
generate_smooth_envelope(rh_pial, save_as)

brain <- threeBrain(
  path = fs_path, subject_code = "N27",
  surface_types = 'pial-outer-smoothed'
)
brain$plot(controllers = list(
  "Surface Type" = 'pial-outer-smoothed'
))

}
```
