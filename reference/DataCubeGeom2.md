# R6 Class - Generate Data Cube Geometry via 3D Volume Texture

Volumetric data cube geometry rendered via a 3D texture lookup. Extends
`DataCubeGeom` with four-channel color map support and opacity
thresholding.

## Author

Zhengjia Wang

## Super classes

[`AbstractGeom`](https://dipterix.org/threeBrain/reference/AbstractGeom.md)
-\>
[`DataCubeGeom`](https://dipterix.org/threeBrain/reference/DataCubeGeom.md)
-\> `DataCubeGeom2`

## Public fields

- `type`:

  Geometry type string (`"datacube2"`).

- `clickable`:

  Logical; always `FALSE` for volume geometry.

- `threshold`:

  Opacity threshold: voxel values below this level are rendered as
  transparent. Default `0.6`.

- `color_format`:

  WebGL texture format string; either `"RGBAFormat"` or `"RedFormat"`.

- `color_map`:

  Named list describing the four-channel color map applied to the
  volume, or `NULL`.

- `trans_space_from`:

  Coordinate space of the input data before applying the transformation
  matrix; either `"model"` (default) or `"scannerRAS"`.

## Active bindings

- `is_datacube2`:

  Logical flag; always `TRUE` for `DataCubeGeom2` instances.

## Methods

### Public methods

- [`DataCubeGeom2$new()`](#method-DataCubeGeom2-initialize)

- [`DataCubeGeom2$to_list()`](#method-DataCubeGeom2-to_list)

- [`DataCubeGeom2$clone()`](#method-DataCubeGeom2-clone)

Inherited methods

- [`AbstractGeom$animation_time_range()`](https://dipterix.org/threeBrain/reference/AbstractGeom.html#method-animation_time_range)
- [`AbstractGeom$animation_value_names()`](https://dipterix.org/threeBrain/reference/AbstractGeom.html#method-animation_value_names)
- [`AbstractGeom$animation_value_range()`](https://dipterix.org/threeBrain/reference/AbstractGeom.html#method-animation_value_range)
- [`AbstractGeom$set_position()`](https://dipterix.org/threeBrain/reference/AbstractGeom.html#method-set_position)
- [`DataCubeGeom$get_data()`](https://dipterix.org/threeBrain/reference/DataCubeGeom.html#method-get_data)
- [`DataCubeGeom$set_value()`](https://dipterix.org/threeBrain/reference/DataCubeGeom.html#method-set_value)

------------------------------------------------------------------------

### `DataCubeGeom2$new()`

Create a new data cube geometry using a 3D texture.

#### Usage

    DataCubeGeom2$new(
      name,
      value,
      dim = dim(value),
      half_size = c(128, 128, 128),
      group = GeomGroup$new(name = "default"),
      position = c(0, 0, 0),
      color_format = c("RGBAFormat", "RedFormat"),
      cache_file = NULL,
      layer = 8,
      digest = TRUE,
      ...
    )

#### Arguments

- `name`:

  Unique character name.

- `value`:

  Integer vector of voxel values (0-255).

- `dim`:

  Integer vector of length 3: dimensions of the volume.

- `half_size`:

  Numeric vector of length 3: half-extents of the bounding box in
  world-space units. Default `c(128, 128, 128)`.

- `group`:

  `GeomGroup` used to store the voxel data.

- `position`:

  Numeric vector of length 3: geometry origin.

- `color_format`:

  WebGL texture format: `"RGBAFormat"` (default) or `"RedFormat"`.

- `cache_file`:

  Path to a JSON cache file, `TRUE` for a temporary file, or `NULL` to
  keep data in memory.

- `layer`:

  Camera layer. Default `8` (main camera only).

- `digest`:

  Logical; compute a content digest for cache validation.

- `...`:

  Additional arguments forwarded to `DataCubeGeom`.

------------------------------------------------------------------------

### `DataCubeGeom2$to_list()`

Serialize the texture data cube geometry to a named list for JSON
export, adding `threshold`, `color_format`, `color_map`, `isDataCube2`,
and `trans_space_from`.

#### Usage

    DataCubeGeom2$to_list()

------------------------------------------------------------------------

### `DataCubeGeom2$clone()`

The objects of this class are cloneable with this method.

#### Usage

    DataCubeGeom2$clone(deep = FALSE)

#### Arguments

- `deep`:

  Whether to make a deep clone.
