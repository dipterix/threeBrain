# Generate volume data from 'MNI' coordinates

Generate volume data from 'MNI' coordinates

## Usage

``` r
add_voxel_cube(
  brain,
  name,
  cube,
  size = c(256, 256, 256),
  trans_mat = NULL,
  trans_space_from = c("model", "scannerRAS"),
  color_format = c("RGBAFormat", "RedFormat")
)

add_nifti(
  brain,
  name,
  path,
  trans_mat = NULL,
  color_format = c("RGBAFormat", "RedFormat"),
  trans_space_from = c("model", "scannerRAS")
)

create_voxel_cube(
  mni_ras,
  value,
  colormap,
  keys = colormap$get_key(value),
  dimension = c(256, 256, 256)
)
```

## Arguments

- brain:

  a 'threeBrain' brain object generated from
  [`threeBrain`](https://dipterix.org/threeBrain/reference/threeBrain.md)
  or
  [`merge_brain`](https://dipterix.org/threeBrain/reference/merge_brain.md).
  If you have `'rave'` package installed, the brain can be generated
  from `rave::rave_brain2`

- name:

  the name of voxel cube, only letters, digits and `'_'` are allowed;
  other characters will be replaced by `'_'`

- cube:

  a 3-mode array; see the following example

- size:

  the actual size of the volume, usually dot multiplication of the
  dimension and voxel size

- trans_mat:

  the transform matrix of the volume. For `add_voxel_cube`, this matrix
  should be from data cube geometry model center to world (`'tkrRAS'`)
  transform. For `add_nifti`, this matrix is the 'Nifti' `'RAS'` to
  world (`'tkrRAS'`) transform.

- trans_space_from:

  where does `trans_mat` transform begin; default is from object
  `'model'` space; alternative space is `'scannerRAS'`, meaning the
  matrix only transform volume cube from its own `'scannerRAS'` to the
  world space.

- color_format:

  color format for the internal texture. Default is 4-channel
  `'RGBAFormat'`; alternative choice is `'RedFormat'`, which saves
  volume data with single red-channel to save space

- path:

  'Nifti' data path

- mni_ras:

  'MNI' 'RAS' coordinates, should be a `n`-by-3 matrix

- value:

  data values (length `n`); used if `keys` is missing

- colormap:

  a color map generated from `create_colormap`; see
  [`voxel_colormap`](https://dipterix.org/threeBrain/reference/voxel_colormap.md)
  for details

- keys:

  integer color-keys generated from a color map with length of `n`;
  alternatively, you could specify `value` and `colormap` to generate
  keys automatically

- dimension:

  volume dimension; default is a `256 x 256 x 256` array cube; must be
  integers and have length of 3

## Value

`create_voxel_cube` returns a list of cube data and other informations;
`add_voxel_cube` returns the `brain` object

## Examples

``` r
# requires N27 brain to be installed
# use `download_N27()` to download template Collins brain


# sample MNI coords
tbl <- read.csv(system.file(
  'sample_data/example_cube.csv', package = 'threeBrain'
))
head(tbl)
#>   X  x   y   z key
#> 1 1 50 -60 -14 215
#> 2 2 62 -22 -22 229
#> 3 3 42 -64  10 209
#> 4 4 36 -60   2 230
#> 5 5 34 -72  10 149
#> 6 6 50 -50   6 229

# load colormap
cmap <- load_colormap(system.file(
  'palettes/datacube2/Mixed.json', package = 'threeBrain'
))

x <- create_voxel_cube(
  mni_ras = tbl[, c('x', 'y', 'z')],
  keys = tbl$key,
  dimension = c(128, 128, 128)
)


n27_path <- file.path(default_template_directory(), "N27")
if( interactive() && dir.exists(n27_path) ) {
  brain <- merge_brain()

  # or add_voxel_cube(brain, 'example', x$cube)
  x$add_to_brain(brain, 'example')

  brain$plot(controllers = list(
    "Voxel Type" = 'example',
    'Right Opacity' = 0.3,
    'Left Opacity' = 0.3,
    'Background Color' = '#000000'
  ), voxel_colormap = cmap)
}
```
