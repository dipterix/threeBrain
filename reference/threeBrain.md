# Create a brain object

Create a brain object

## Usage

``` r
threeBrain(
  path,
  subject_code,
  surface_types = c("pial", "smoothwm", "inflated", "sphere.reg"),
  atlas_types,
  annotation_types = "label/aparc.a2009s",
  ...,
  streamline_types = "default/",
  template_subject = unname(getOption("threeBrain.template_subject", "N27")),
  backward_compatible = getOption("threeBrain.compatible", FALSE)
)
```

## Arguments

- path:

  path to 'FreeSurfer' directory, or 'RAVE' subject directory containing
  'FreeSurfer' files, or simply a 'RAVE' subject

- subject_code:

  subject code, characters

- surface_types:

  surface types to load; default is `'pial'`, other common types are
  `'white'`, `'smoothwm'`, `'inflated'`, `'sphere.reg'`

- atlas_types:

  brain atlas to load; default is `'wmparc'`, or if not exists,
  `'aparc+aseg'`, other choices are `'aparc.a2009s+aseg'`,
  `'aparc.DKTatlas+aseg'`, depending on the atlas files in `'fs/mri'`
  folder

- annotation_types:

  annotations, this can be one or more files relative to the
  'FreeSurfer' subject directory. Each annotation can be discrete such
  as surface atlas, or continuous such as surface curvature.

- ...:

  reserved for future use

- streamline_types:

  streamline (`tractography`) bundles to load from the `'fs/streamline'`
  folder; passed straight to
  [`add_streamline`](https://dipterix.org/threeBrain/reference/add_streamline.md),
  so each entry may name one bundle (`'motor/AF_left'`) or a whole
  circuit group (`'motor/'` or `'motor/*'`). The default `'default/'`
  loads the `'default'` circuit, that is every streamline file placed
  directly under `'fs/streamline'` as well as under
  `'fs/streamline/default'`. Use `NULL` to skip. Please note that each
  declared bundle is downloaded and parsed by the browser when the
  viewer starts, hence only one group is loaded by default; use
  [`add_streamline`](https://dipterix.org/threeBrain/reference/add_streamline.md)
  to add more.

- template_subject:

  template subject to refer to; used for group template mapping

- backward_compatible:

  whether to support old format; default is false
