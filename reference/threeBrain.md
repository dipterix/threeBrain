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

- template_subject:

  template subject to refer to; used for group template mapping

- backward_compatible:

  whether to support old format; default is false
