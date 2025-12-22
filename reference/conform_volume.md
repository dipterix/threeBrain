# Conform imaging data in `'FreeSurfer'` way

Reproduces conform algorithm used by `'FreeSurfer'` to conform `'NIfTI'`
and `'MGH'` images.

## Usage

``` r
conform_volume(x, save_to, dim = c(256, 256, 256))
```

## Arguments

- x:

  path to the image file

- save_to:

  path where the conformed image will be saved, must ends with `'.mgz'`

- dim:

  positive integers of length three, the conformed dimension; by default
  'FreeSurfer' conform images to `1mm` volume cube with `256x256x256`
  dimension

## Value

Nothing; the result will be save to `save_to`
