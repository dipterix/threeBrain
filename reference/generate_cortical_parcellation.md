# Generate cortical annotations from template using surface mapping

This is a low-level function. Use `brain$add_annotation` instead.

## Usage

``` r
generate_cortical_parcellation(
  brain,
  template_subject = "fsaverage",
  annotation = "Yeo2011_7Networks_N1000",
  add_annotation = TRUE
)
```

## Arguments

- brain:

  Brain object

- template_subject:

  template subject where the annotation is stored

- annotation:

  annotation name in the label folder; default is
  `'Yeo2011_7Networks_N1000'`, standing for
  `'lh.Yeo2011_7Networks_N1000.annot'` and
  `'rh.Yeo2011_7Networks_N1000.annot'`.

- add_annotation:

  whether to add annotation to `brain`

## Value

`brain` with the annotation added if `add_annotation` is true
