# Get 'voxel' to world matrix

Get 'voxel' to world matrix

## Usage

``` r
get_ijk2ras(x, type = c("scanner", "tkr"))
```

## Arguments

- x:

  path to imaging files

- type:

  world space type; choices are `'scanner'` (same as `'sform'` or
  `'qform'` in) or `'NIfTI'` file headers; or `'tkr'` (used to shared
  surface nodes)

## Value

A four by four matrix
