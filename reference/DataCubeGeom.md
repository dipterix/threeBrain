# R6 Class - Generate Data Cube Geometry

Volumetric data cube geometry for rendering 3D scalar volumes as voxel
data. Stores a flat value array and its 3D dimensions in the owning
`GeomGroup` for JSON export to the three-brain viewer.

## Author

Zhengjia Wang

## Super class

[`AbstractGeom`](https://dipterix.org/threeBrain/reference/AbstractGeom.md)
-\> `DataCubeGeom`

## Public fields

- `type`:

  Geometry type string (`"datacube"`).

- `clickable`:

  Logical; always `FALSE` for volume geometry.

## Methods

### Public methods

- [`DataCubeGeom$new()`](#method-DataCubeGeom-initialize)

- [`DataCubeGeom$set_value()`](#method-DataCubeGeom-set_value)

- [`DataCubeGeom$to_list()`](#method-DataCubeGeom-to_list)

- [`DataCubeGeom$get_data()`](#method-DataCubeGeom-get_data)

- [`DataCubeGeom$clone()`](#method-DataCubeGeom-clone)

Inherited methods

- [`AbstractGeom$animation_time_range()`](https://dipterix.org/threeBrain/reference/AbstractGeom.html#method-animation_time_range)
- [`AbstractGeom$animation_value_names()`](https://dipterix.org/threeBrain/reference/AbstractGeom.html#method-animation_value_names)
- [`AbstractGeom$animation_value_range()`](https://dipterix.org/threeBrain/reference/AbstractGeom.html#method-animation_value_range)
- [`AbstractGeom$set_position()`](https://dipterix.org/threeBrain/reference/AbstractGeom.html#method-set_position)

------------------------------------------------------------------------

### `DataCubeGeom$new()`

Create a new data cube geometry.

#### Usage

    DataCubeGeom$new(
      name,
      value,
      dim = dim(value),
      group = GeomGroup$new(name = "default"),
      position = c(0, 0, 0),
      cache_file = NULL,
      layer = 13,
      digest = TRUE,
      ...
    )

#### Arguments

- `name`:

  Unique character name.

- `value`:

  Numeric vector or array of voxel values.

- `dim`:

  Integer vector of length 3: dimensions of the volume
  (`c(nx, ny, nz)`).

- `group`:

  `GeomGroup` used to store the voxel data.

- `position`:

  Numeric vector of length 3: geometry origin. Default `c(0, 0, 0)`.

- `cache_file`:

  Path to a JSON cache file, `TRUE` for a temporary file, or `NULL` to
  keep data in memory.

- `layer`:

  Camera layer. Default `13` (invisible).

- `digest`:

  Logical; compute a content digest for cache validation.

- `...`:

  Additional arguments forwarded to `AbstractGeom`.

------------------------------------------------------------------------

### `DataCubeGeom$set_value()`

Update the voxel values of the geometry (not yet implemented; currently
calls [`.NotYetImplemented()`](https://rdrr.io/r/base/notyet.html)).

#### Usage

    DataCubeGeom$set_value(value = NULL, dim = dim(value))

#### Arguments

- `value`:

  Numeric vector of replacement voxel values.

- `dim`:

  Integer vector of length 3: dimensions matching `value`.

------------------------------------------------------------------------

### `DataCubeGeom$to_list()`

Serialize the data cube geometry to a named list for JSON export, adding
the `isDataCube` flag.

#### Usage

    DataCubeGeom$to_list()

------------------------------------------------------------------------

### `DataCubeGeom$get_data()`

Retrieve a data value from this geometry or its owning group.

#### Usage

    DataCubeGeom$get_data(key, force_reload = FALSE, ifnotfound = NULL)

#### Arguments

- `key`:

  Group data key to retrieve.

- `force_reload`:

  Logical; reload from the file cache even when an in-memory copy
  exists. Default `FALSE`.

- `ifnotfound`:

  Value returned when `key` is not found. Default `NULL`.

------------------------------------------------------------------------

### `DataCubeGeom$clone()`

The objects of this class are cloneable with this method.

#### Usage

    DataCubeGeom$clone(deep = FALSE)

#### Arguments

- `deep`:

  Whether to make a deep clone.
