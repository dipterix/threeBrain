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
  format = "auto",
  smooth_method = c("implicit", "explicit", "none"),
  smooth_iterations = 10L,
  max_vertices = 5e+05
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

  upper threshold of the volume; default is `NA` (no upper bound).
  Voxels strictly between the two thresholds form the mask; voxels that
  are `NA`, `NaN`, or infinite are invalid and never part of it

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

- smooth_method:

  `"implicit"` (default) smooths with
  [`vcg_smooth_implicit`](https://dipterix.org/ravetools/reference/vcg_smooth.html)
  using `lambda` and `degree`; `"explicit"` smooths with
  [`mris_smooth`](https://dipterix.org/ravetools/reference/mris_smooth.html)
  instead, repeated neighbor averaging whose memory grows only linearly
  with the surface (with a ravetools version that does not have
  `mris_smooth`, the `"laplace"` type of
  [`vcg_smooth_explicit`](https://dipterix.org/ravetools/reference/vcg_smooth.html)
  is used); `"none"` returns the surface without smoothing

- smooth_iterations:

  number of averaging rounds when `smooth_method` is `"explicit"`;
  default is `10`

- max_vertices:

  used only when `smooth_method` is `"implicit"`, whose memory grows
  quickly with the surface size: surfaces with more vertices than this
  are reduced to about this many with `ravetools::vcg_decimate()` before
  smoothing, which removes vertices from flat regions first and keeps
  the shape; default is `500000`. Because the smoothing works in mesh
  steps, the same `lambda` and `degree` smooth a reduced surface more;
  use a larger value or `Inf` to smooth at full resolution. With a
  ravetools version that does not have `vcg_decimate`, surfaces with
  more than `20000` vertices are not smoothed, since the implicit
  smoothing of those versions can crash on large surfaces

## Value

Triangle `'rgl'` mesh (vertex positions in native `'RAS'`). If `save_to`
is a valid path, then the mesh will be saved to this location. When no
valid voxel lies within the thresholds, a warning is issued and the mesh
has a single vertex at the origin and no face; it is still saved to
`save_to`.

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

  if (interactive()) {
    ravetools::rgl_view({
      ravetools::rgl_call("shade3d", mesh, color = "yellow")
    })
  }
}

```
