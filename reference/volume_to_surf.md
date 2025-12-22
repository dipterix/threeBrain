# Generate surface file from `'nii'` or `'mgz'` volume files

Generate surface file from `'nii'` or `'mgz'` volume files

## Usage

``` r
volume_to_surf(
  volume,
  save_to = NA,
  lambda = 0.2,
  degree = 2,
  threshold_lb = 0.5,
  threshold_ub = NA,
  format = "auto"
)
```

## Arguments

- volume:

  path to the volume file, or object from
  [`read_volume`](https://dipterix.org/threeBrain/reference/read_volume.md).

- save_to:

  where to save the surface file; default is `NA` (no save).

- lambda:

  `'Laplacian'` smooth, the higher the smoother

- degree:

  `'Laplacian'` degree; default is `2`

- threshold_lb:

  lower threshold of the volume (to create mask); default is `0.5`

- threshold_ub:

  upper threshold of the volume; default is `NA` (no upper bound)

- format:

  The format of the file if `save_to` is a valid path, choices include

  `'auto'`

  :   Default, supports `'FreeSurfer'` binary format and `'ASCII'` text
      format, based on file name suffix

  `'bin'`

  :   `'FreeSurfer'` binary format

  `'asc'`

  :   `'ASCII'` text format

  `'ply'`

  :   'Stanford' `'PLY'` format

  `'off'`

  :   Object file format

  `'obj'`

  :   `'Wavefront'` object format

  `'gii'`

  :   `'GIfTI'` format. Please avoid using `'gii.gz'` as the file suffix

  `'mz3'`

  :   `'Surf-Ice'` format

  `'byu'`

  :   `'BYU'` mesh format

  `'vtk'`

  :   Legacy `'VTK'` format

  `'gii'`, otherwise `'FreeSurfer'` format. Please do not use `'gii.gz'`
  suffix.

## Value

Triangle `'rgl'` mesh (vertex positions in native `'RAS'`). If `save_to`
is a valid path, then the mesh will be saved to this location.

## See also

[`read_volume`](https://dipterix.org/threeBrain/reference/read_volume.md),
[`vcg_isosurface`](https://dipterix.org/ravetools/reference/vcg_isosurface.html),
[`vcg_smooth_implicit`](https://dipterix.org/ravetools/reference/vcg_smooth.html)

## Examples

``` r
library(threeBrain)
N27_path <- file.path(default_template_directory(), "N27")
if(dir.exists(N27_path)) {
  aseg <- file.path(N27_path, "mri", "aparc+aseg.mgz")

  # generate surface for left-hemisphere insula
  mesh <- volume_to_surf(aseg, threshold_lb = 1034,
                         threshold_ub = 1036)

  if(interactive()) {
    ravetools::rgl_view({
      ravetools::rgl_call("shade3d", mesh, color = "yellow")
    })
  }
}

```
