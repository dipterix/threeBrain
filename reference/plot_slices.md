# Plot slices of volume

Plot slices of volume

## Usage

``` r
plot_slices(
  volume,
  overlays = NULL,
  transform = NULL,
  positions = NULL,
  zoom = 1,
  pixel_width = 0.5,
  col = c("black", "white"),
  normalize = NULL,
  zclip = NULL,
  overlay_alpha = 0.3,
  zlim = normalize,
  main = "",
  title_position = c("left", "top"),
  fun = NULL,
  nc = NA,
  which = NULL,
  ...
)
```

## Arguments

- volume:

  path to volume (underlay)

- overlays:

  images to overlay on top of the underlay, can be either a vector of
  paths to the overlay volume images, or a sequence of named lists. Each
  list item has `'volume'` (path to the volume) and `'color'` (color of
  the overlay)

- transform:

  rotation of the volume in scanner `'RAS'` space

- positions:

  vector of length 3 or matrix of 3 columns, the `'RAS'` position of
  cross-hairs

- zoom:

  zoom-in radio, default is 1

- pixel_width:

  output image pixel resolution; default is `0.5`, one pixel is 0.5
  millimeters wide

- col:

  color palette, can be a sequence of colors

- normalize:

  range for volume data to be normalized; either `NULL` (no normalize)
  or a numeric vector of length two

- zclip:

  clip image densities; if specified, values outside of this range will
  be clipped into this range

- overlay_alpha:

  transparency of the overlay; default is 0.3

- zlim:

  image plot value range, default is identical to `normalize`

- main:

  image titles

- title_position:

  title position; choices are `"left"` or `"top"`

- fun:

  function with two arguments that will be executed after each image is
  drawn; can be used to draw cross-hairs or annotate each image

- nc:

  number of "columns" in the plot when there are too many positions,
  must be positive integer; default is `NA` (automatically determined)

- which:

  which plane to plot; default is `NULL`, which will trigger new plots
  and add titles; set to `1` for `'Axial'` plane, `2` for `'Sagittal'`,
  and `3` for `'Coronal'`.

- ...:

  additional arguments passing into
  [`image`](https://rdrr.io/r/graphics/image.html)

## Value

Nothing
