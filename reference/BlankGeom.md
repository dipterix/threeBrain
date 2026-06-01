# A geometry that renders nothing

No-op geometry used when only shared group data needs to be uploaded to
the viewer. The geometry renders nothing and is assigned to an invisible
camera layer (31).

## Author

Zhengjia Wang

## Super class

[`AbstractGeom`](https://dipterix.org/threeBrain/reference/AbstractGeom.md)
-\> `BlankGeom`

## Public fields

- `value`:

  Reserved; always `NULL` for blank geometry.

- `type`:

  Geometry type string used by the JavaScript engine.

- `clickable`:

  Logical; whether the geometry responds to mouse clicks in the viewer.

## Methods

### Public methods

- [`BlankGeom$set_value()`](#method-BlankGeom-set_value)

- [`BlankGeom$new()`](#method-BlankGeom-initialize)

- [`BlankGeom$to_list()`](#method-BlankGeom-to_list)

- [`BlankGeom$clone()`](#method-BlankGeom-clone)

Inherited methods

- [`AbstractGeom$animation_time_range()`](https://dipterix.org/threeBrain/reference/AbstractGeom.html#method-animation_time_range)
- [`AbstractGeom$animation_value_names()`](https://dipterix.org/threeBrain/reference/AbstractGeom.html#method-animation_value_names)
- [`AbstractGeom$animation_value_range()`](https://dipterix.org/threeBrain/reference/AbstractGeom.html#method-animation_value_range)
- [`AbstractGeom$get_data()`](https://dipterix.org/threeBrain/reference/AbstractGeom.html#method-get_data)
- [`AbstractGeom$set_position()`](https://dipterix.org/threeBrain/reference/AbstractGeom.html#method-set_position)

------------------------------------------------------------------------

### `BlankGeom$set_value()`

No-op value setter; blank geometry accepts no data.

#### Usage

    BlankGeom$set_value(...)

#### Arguments

- `...`:

  Ignored.

------------------------------------------------------------------------

### `BlankGeom$new()`

Create a new blank geometry.

#### Usage

    BlankGeom$new(
      group,
      name = paste(sample(c(LETTERS, letters, 0:9), 16), collapse = ""),
      ...
    )

#### Arguments

- `group`:

  `GeomGroup` to attach this geometry to.

- `name`:

  Unique character name. Defaults to a random 16-character alphanumeric
  string.

- `...`:

  Additional arguments forwarded to `AbstractGeom`.

------------------------------------------------------------------------

### `BlankGeom$to_list()`

Serialize the blank geometry to a named list for JSON export.

#### Usage

    BlankGeom$to_list()

------------------------------------------------------------------------

### `BlankGeom$clone()`

The objects of this class are cloneable with this method.

#### Usage

    BlankGeom$clone(deep = FALSE)

#### Arguments

- `deep`:

  Whether to make a deep clone.
