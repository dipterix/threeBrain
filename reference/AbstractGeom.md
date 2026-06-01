# R6 Class - Abstract Class of Geometries

Base class inherited by all geometry types in the three-brain viewer.
Provides common fields for position, layer visibility, transformation,
click response, and animation clips.

## Author

Zhengjia Wang

## Public fields

- `name`:

  Unique character name of the geometry object.

- `type`:

  Geometry type string used by the JavaScript engine.

- `render_order`:

  Rendering priority; higher values render on top.

- `time_stamp`:

  Deprecated; use the `keyframes` field instead. Numeric vector of
  animation time points.

- `value`:

  Deprecated; use the `keyframes` field instead. Numeric or character
  animation values.

- `keyframes`:

  Named list of `KeyFrame` objects that store animation clip data for
  this geometry.

- `position`:

  Numeric vector of length 3: object origin in world space.

- `trans_mat`:

  Optional 4-by-4 transformation matrix (`NULL` = identity).

- `disable_trans_mat`:

  Logical; when `TRUE` the transformation matrix is ignored.

- `group`:

  `GeomGroup` that owns this geometry, or `NULL`.

- `clickable`:

  Logical; whether the geometry responds to mouse clicks in the viewer.

- `layer`:

  Camera layer(s); 0 = main camera only, 1 = all cameras, 13 =
  invisible.

- `use_cache`:

  Logical; whether to read/write data from a file cache.

- `custom_info`:

  Optional character string for additional annotation.

- `subject_code`:

  Subject identifier string, or `NULL`.

## Active bindings

- `animation_types`:

  Character vector of animation clip names attached to this geometry.

## Methods

### Public methods

- [`AbstractGeom$new()`](#method-AbstractGeom-initialize)

- [`AbstractGeom$set_position()`](#method-AbstractGeom-set_position)

- [`AbstractGeom$set_value()`](#method-AbstractGeom-set_value)

- [`AbstractGeom$to_list()`](#method-AbstractGeom-to_list)

- [`AbstractGeom$get_data()`](#method-AbstractGeom-get_data)

- [`AbstractGeom$animation_time_range()`](#method-AbstractGeom-animation_time_range)

- [`AbstractGeom$animation_value_range()`](#method-AbstractGeom-animation_value_range)

- [`AbstractGeom$animation_value_names()`](#method-AbstractGeom-animation_value_names)

- [`AbstractGeom$clone()`](#method-AbstractGeom-clone)

------------------------------------------------------------------------

### `AbstractGeom$new()`

Create a new abstract geometry. Subclasses call this via
`super$initialize()`.

#### Usage

    AbstractGeom$new(
      name,
      position = c(0, 0, 0),
      group = NULL,
      layer = 0,
      trans_mat = NULL,
      ...
    )

#### Arguments

- `name`:

  Unique character name.

- `position`:

  Numeric vector of length 3: object origin. Default `c(0, 0, 0)`.

- `group`:

  `GeomGroup` to attach this geometry to, or `NULL`.

- `layer`:

  Camera layer(s), 0-13. Default `0`.

- `trans_mat`:

  Optional 4-by-4 numeric transformation matrix.

- `...`:

  Reserved for subclass use.

------------------------------------------------------------------------

### `AbstractGeom$set_position()`

Set the world-space position of the geometry.

#### Usage

    AbstractGeom$set_position(...)

#### Arguments

- `...`:

  Numeric values that together form a length-3 vector `c(x, y, z)`.

------------------------------------------------------------------------

### `AbstractGeom$set_value()`

Attach animation data to this geometry as an animation clip.

#### Usage

    AbstractGeom$set_value(
      value = NULL,
      time_stamp = NULL,
      name = "Value",
      target = ".material.color",
      ...
    )

#### Arguments

- `value`:

  Numeric or character vector of animation values.

- `time_stamp`:

  Numeric vector of time points matching `value`.

- `name`:

  Character clip name. Defaults to `"Value"`.

- `target`:

  JavaScript property path to animate.

- `...`:

  Additional arguments passed to `KeyFrame`.

------------------------------------------------------------------------

### `AbstractGeom$to_list()`

Serialize the geometry to a named list for JSON export.

#### Usage

    AbstractGeom$to_list()

------------------------------------------------------------------------

### `AbstractGeom$get_data()`

Retrieve a data value from this geometry or its owning group.

#### Usage

    AbstractGeom$get_data(key = "value", force_reload = FALSE, ifnotfound = NULL)

#### Arguments

- `key`:

  Field name or group data key to retrieve. Default `"value"`.

- `force_reload`:

  Logical; reload from the file cache even when an in-memory copy
  exists. Default `FALSE`.

- `ifnotfound`:

  Value returned when `key` is not found. Default `NULL`.

------------------------------------------------------------------------

### `AbstractGeom$animation_time_range()`

Return the time range of a named animation clip.

#### Usage

    AbstractGeom$animation_time_range(ani_name)

#### Arguments

- `ani_name`:

  Name of the animation clip.

------------------------------------------------------------------------

### `AbstractGeom$animation_value_range()`

Return the value range of a named continuous animation clip.

#### Usage

    AbstractGeom$animation_value_range(ani_name)

#### Arguments

- `ani_name`:

  Name of the animation clip.

------------------------------------------------------------------------

### `AbstractGeom$animation_value_names()`

Return the category level names of a named discrete animation clip.

#### Usage

    AbstractGeom$animation_value_names(ani_name)

#### Arguments

- `ani_name`:

  Name of the animation clip.

------------------------------------------------------------------------

### `AbstractGeom$clone()`

The objects of this class are cloneable with this method.

#### Usage

    AbstractGeom$clone(deep = FALSE)

#### Arguments

- `deep`:

  Whether to make a deep clone.
