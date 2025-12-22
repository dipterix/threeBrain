# Import 'FreeSurfer' or 'SUMA' files into the viewer structure

Import 'T1-MRI', surface files, curvature/'sulcus', atlas, and
'Talairach' transform matrix into 'json' format. These functions are not
intended to be called directly, use
[`import_from_freesurfer`](https://dipterix.org/threeBrain/reference/import_from_freesurfer.md)
instead.

## Usage

``` r
import_fs(
  subject_name,
  fs_path,
  quiet = FALSE,
  dtype = c("T1", "surface", "curv", "atlas_volume", "atlas_surface", "xform"),
  sub_type = NULL,
  hemisphere = c("l", "r"),
  ...
)

import_suma(
  subject_name,
  fs_path,
  quiet = FALSE,
  dtype = c("T1", "surface", "curv", "atlas_volume", "atlas_surface", "xform"),
  sub_type = NULL,
  hemisphere = c("l", "r"),
  ...
)
```

## Arguments

- subject_name:

  character, subject code

- fs_path:

  path to 'FreeSurfer' folder

- quiet, ...:

  passed from or to other methods.

- dtype:

  data type to import, choices are `'T1'`, `'surface'`, `'curv'`,
  `'atlas_volume'`, `'atlas_surface'`, `'xform'`

- sub_type:

  detailed files to import. `'atlas_surface'` is not supported for now

- hemisphere:

  which hemisphere to import, ignored when `dtype` is in `'T1'`,
  `'atlas_volume'`, `'atlas_surface'`, `'xform'`.

## Value

logical, `TRUE` if the file is or has been cached, or `FALSE` if the
file is missing.
