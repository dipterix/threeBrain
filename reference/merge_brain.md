# Create Multi-subject Template

Create Multi-subject Template

## Usage

``` r
merge_brain(
  ...,
  .list = NULL,
  template_surface_types = NULL,
  template_subject = unname(getOption("threeBrain.template_subject", "N27")),
  template_dir = default_template_directory(),
  electrode_priority = c("asis", "sphere", "prototype", "both")
)
```

## Arguments

- ..., .list:

  `Brain2` objects

- template_surface_types:

  which template surface types to load, default is auto-guess

- template_subject:

  character, subject code to be treated as template, default is \`N27\`

- template_dir:

  the parent directory where template subject is stored in

- electrode_priority:

  electrode shape priority, used to manage how electrodes are displayed;
  default is `'asis'` (no change) to be backward compatible; recommended
  option is `'sphere'` to display contacts as spheres (radius is based
  on the 'Radius' column from electrode table); `'prototype'` should
  work in most cases but might be inaccurate since electrodes need to
  maintain the original geometry shape, but the template mapping might
  not be linear.

## Author

Zhengjia Wang
