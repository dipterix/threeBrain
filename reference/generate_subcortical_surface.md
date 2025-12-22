# Approximate 'sub-cortical' surfaces from 'parcellation'

Superseded by
[`volume_to_surf`](https://dipterix.org/threeBrain/reference/volume_to_surf.md).
Please do not use this function.

## Usage

``` r
generate_subcortical_surface(
  atlas,
  index,
  save_prefix = NULL,
  label = NULL,
  IJK2RAS = NULL,
  grow = 1,
  remesh = TRUE,
  smooth = TRUE,
  smooth_delta = 3,
  ...
)
```

## Arguments

- atlas:

  path to imaging 'parcellation', can be `'nii'` or `'mgz'` formats

- index:

  'parcellation' index, see 'FreeSurfer' look-up table

- save_prefix:

  parent folder to save the resulting surface

- label:

  character label or name of the 'sub-cortical' structure, usually
  automatically derived from `index`

- IJK2RAS:

  an 'Affine' matrix from 'voxel' index to `'tkrRAS'`, usually
  automatically derived from `atlas`

- grow:

  amount to grow (dilate) before generating mesh

- remesh, smooth, smooth_delta, ...:

  passed to
  [`mesh_from_volume`](https://dipterix.org/ravetools/reference/mesh_from_volume.html)

## Value

A surface mesh, containing 'atlas' index, label, surface nodes and face
indices.
