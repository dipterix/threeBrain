# R6 Class - Generate Sphere Geometry

Sphere geometry for the three-brain viewer. Wraps a three-brain viewer
sphere and supports animation clips for electrode-style data
visualization.

## Author

Zhengjia Wang

## Super class

[`AbstractGeom`](https://dipterix.org/threeBrain/reference/AbstractGeom.md)
-\> `SphereGeom`

## Public fields

- `type`:

  Geometry type string (`"sphere"`).

- `radius`:

  Sphere radius in world-space units.

- `width_segments`:

  Number of horizontal segments (longitude).

- `height_segments`:

  Number of vertical segments (latitude).

## Methods

### Public methods

- [`SphereGeom$new()`](#method-SphereGeom-initialize)

- [`SphereGeom$to_list()`](#method-SphereGeom-to_list)

- [`SphereGeom$clone()`](#method-SphereGeom-clone)

Inherited methods

- [`AbstractGeom$animation_time_range()`](https://dipterix.org/threeBrain/reference/AbstractGeom.html#method-animation_time_range)
- [`AbstractGeom$animation_value_names()`](https://dipterix.org/threeBrain/reference/AbstractGeom.html#method-animation_value_names)
- [`AbstractGeom$animation_value_range()`](https://dipterix.org/threeBrain/reference/AbstractGeom.html#method-animation_value_range)
- [`AbstractGeom$get_data()`](https://dipterix.org/threeBrain/reference/AbstractGeom.html#method-get_data)
- [`AbstractGeom$set_position()`](https://dipterix.org/threeBrain/reference/AbstractGeom.html#method-set_position)
- [`AbstractGeom$set_value()`](https://dipterix.org/threeBrain/reference/AbstractGeom.html#method-set_value)

------------------------------------------------------------------------

### `SphereGeom$new()`

Create a new sphere geometry.

#### Usage

    SphereGeom$new(name, position = c(0, 0, 0), radius = 5, ...)

#### Arguments

- `name`:

  Unique character name.

- `position`:

  Numeric vector of length 3: sphere center. Default `c(0, 0, 0)`.

- `radius`:

  Sphere radius in world-space units. Default `5`.

- `...`:

  Additional arguments forwarded to `AbstractGeom`.

------------------------------------------------------------------------

### `SphereGeom$to_list()`

Serialize the sphere geometry to a named list for JSON export.

#### Usage

    SphereGeom$to_list()

------------------------------------------------------------------------

### `SphereGeom$clone()`

The objects of this class are cloneable with this method.

#### Usage

    SphereGeom$clone(deep = FALSE)

#### Arguments

- `deep`:

  Whether to make a deep clone.
