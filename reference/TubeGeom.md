# R6 Class - Generate Tube Geometry

Tube geometry that sweeps a circular cross-section along a curved path
defined by control points. Used to render electrode shafts and tract
trajectories in the three-brain viewer.

## Author

Zhengjia Wang

## Super class

[`AbstractGeom`](https://dipterix.org/threeBrain/reference/AbstractGeom.md)
-\> `TubeGeom`

## Public fields

- `type`:

  Geometry type string (`"tube"`).

- `radial_segments`:

  Number of segments around the tube circumference.

- `tubular_segments`:

  Number of segments along the tube path.

- `control_data`:

  Flattened numeric vector (row-major) of control points; each row
  encodes `x`, `y`, `z`, `t` (normalized path position 0-1), and
  `radius`.

- `image_uri`:

  Base64 data URI of the tube texture image, or `NULL` for a plain
  color.

## Methods

### Public methods

- [`TubeGeom$new()`](#method-TubeGeom-initialize)

- [`TubeGeom$to_list()`](#method-TubeGeom-to_list)

- [`TubeGeom$clone()`](#method-TubeGeom-clone)

Inherited methods

- [`AbstractGeom$animation_time_range()`](https://dipterix.org/threeBrain/reference/AbstractGeom.html#method-animation_time_range)
- [`AbstractGeom$animation_value_names()`](https://dipterix.org/threeBrain/reference/AbstractGeom.html#method-animation_value_names)
- [`AbstractGeom$animation_value_range()`](https://dipterix.org/threeBrain/reference/AbstractGeom.html#method-animation_value_range)
- [`AbstractGeom$get_data()`](https://dipterix.org/threeBrain/reference/AbstractGeom.html#method-get_data)
- [`AbstractGeom$set_position()`](https://dipterix.org/threeBrain/reference/AbstractGeom.html#method-set_position)
- [`AbstractGeom$set_value()`](https://dipterix.org/threeBrain/reference/AbstractGeom.html#method-set_value)

------------------------------------------------------------------------

### `TubeGeom$new()`

Create a new tube geometry.

#### Usage

    TubeGeom$new(name, control_data, image_uri = NULL, ...)

#### Arguments

- `name`:

  Unique character name.

- `control_data`:

  Numeric matrix with 5 columns: `x`, `y`, `z`, `t` (path position),
  `radius`. Must have at least 2 rows.

- `image_uri`:

  Optional base64 data URI string for a texture image.

- `...`:

  Additional arguments forwarded to `AbstractGeom`.

------------------------------------------------------------------------

### `TubeGeom$to_list()`

Serialize the tube geometry to a named list for JSON export.

#### Usage

    TubeGeom$to_list()

------------------------------------------------------------------------

### `TubeGeom$clone()`

The objects of this class are cloneable with this method.

#### Usage

    TubeGeom$clone(deep = FALSE)

#### Arguments

- `deep`:

  Whether to make a deep clone.
