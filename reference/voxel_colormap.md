# Color maps for volume or surface data

Color maps for volume or surface data

## Usage

``` r
create_colormap(
  gtype = c("surface", "volume"),
  dtype = c("continuous", "discrete"),
  key,
  color,
  value,
  alpha = FALSE,
  con = NULL,
  auto_rescale = FALSE,
  ...
)

save_colormap(cmap, con)

freeserfer_colormap(con)

load_colormap(con)

read_colormap(con, format = c("rave", "itksnap"))
```

## Arguments

- gtype:

  geometry type, choices are `"surface"`, `"volume"`

- dtype:

  data type, `"continuous"` or `"discrete"`

- key:

  non-negative integer vector corresponding to color values; its length
  must exceed 1; see 'Details'

- color:

  characters, corresponding to color strings for each key

- value:

  actual value for each key

- alpha:

  whether to respect transparency

- con:

  a file path to write results to or to read from. The file path can be
  passed as `voxel_colormap` into
  [`threejs_brain`](https://dipterix.org/threeBrain/reference/threejs_brain.md).

- auto_rescale:

  automatically scale the color according to image values; only valid
  for continuous color maps

- ...:

  used by continuous color maps, passed to
  [`colorRampPalette`](https://rdrr.io/r/grDevices/colorRamp.html)

- cmap:

  color map object

- format:

  file format to read from

## Value

A list of color map information

## Details

Internal 'JavaScript' shader implementation uses integer color `key`s to
connect color palettes and corresponding values. The keys must be
non-negative.

Zero key is a special color key reserved by system. Please avoid using
it for valid values.

## Examples

``` r
# Creates a symmetric continuous colormap with 3 keys
# The color range is -10 to 10
# The colors are 'blue','white','red' for these keys

pal <- create_colormap(
  gtype = "volume", dtype = "continuous",
  key = c(1,2,3), value = c(-10,0,10),
  color = c('blue','white','red'))

print( pal )
#> <threeBrain Colormap>
#>   Version: 1.1
#>   Geometry Type: volume
#>   Data Type: continuous
#>   Transparent: FALSE
#>   # of keys: 3
#>   Min Colorkey: 1
#>   Max Colorkey: 3
#>   Auto-rescale ColorKey: no
#>   Value Range: -10 ~ 10

# ---------------- Get colormap key from a value ------------

# returns key index starting from
pal$get_key( -10 )
#> [1] 1

# nearest value
pal$get_key( 2 )
#> [1] 2

# set threshold, key is now 0 (no color)
pal$get_key( 2, max_delta = 1 )
#> [1] 0


# ---------------- Save and load ----------------
f <- tempfile( fileext = '.json' )
save_colormap( pal, f )
cat(readLines(f), sep = '\n')
#> {"__global_data__.VolumeColorLUT":{"map":{"1":{"ColorID":1,"Label":-10,"R":0,"G":0,"B":255},"2":{"ColorID":2,"Label":0,"R":255,"G":255,"B":255},"3":{"ColorID":3,"Label":10,"R":255,"G":0,"B":0}},"mapAlpha":false,"mapMinColorID":1,"mapMaxColorID":3,"mapValueRange":[-10,10],"mapDataType":"continuous","mapGeomType":"volume","colorIDAutoRescale":false,"mapVersion":1.1}}

load_colormap(f)
#> <threeBrain Colormap>
#>   Version: 1.1
#>   Geometry Type: volume
#>   Data Type: continuous
#>   Transparent: FALSE
#>   # of keys: 3
#>   Min Colorkey: 1
#>   Max Colorkey: 3
#>   Auto-rescale ColorKey: no
#>   Value Range: -10 ~ 10
```
