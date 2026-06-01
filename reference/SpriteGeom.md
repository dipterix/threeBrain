# R6 Class - Generate Image Sprite Geometry

Image sprite geometry that positions a PNG texture billboard between two
3D points. The image is encoded as a data URI and rendered facing the
camera in the three-brain viewer.

## Author

Zhengjia Wang

## Super class

[`AbstractGeom`](https://dipterix.org/threeBrain/reference/AbstractGeom.md)
-\> `SpriteGeom`

## Public fields

- `clickable`:

  Logical; always `FALSE` for sprite geometry.

- `type`:

  Geometry type string (`"imagesprite"`).

- `image_uri`:

  Base64 data URI of the PNG image used as the sprite texture.

- `aspect_ratio`:

  Width-to-height ratio of the source image, used to preserve
  proportions when scaling.

## Methods

### Public methods

- [`SpriteGeom$new()`](#method-SpriteGeom-initialize)

- [`SpriteGeom$to_list()`](#method-SpriteGeom-to_list)

- [`SpriteGeom$clone()`](#method-SpriteGeom-clone)

Inherited methods

- [`AbstractGeom$animation_time_range()`](https://dipterix.org/threeBrain/reference/AbstractGeom.html#method-animation_time_range)
- [`AbstractGeom$animation_value_names()`](https://dipterix.org/threeBrain/reference/AbstractGeom.html#method-animation_value_names)
- [`AbstractGeom$animation_value_range()`](https://dipterix.org/threeBrain/reference/AbstractGeom.html#method-animation_value_range)
- [`AbstractGeom$get_data()`](https://dipterix.org/threeBrain/reference/AbstractGeom.html#method-get_data)
- [`AbstractGeom$set_position()`](https://dipterix.org/threeBrain/reference/AbstractGeom.html#method-set_position)
- [`AbstractGeom$set_value()`](https://dipterix.org/threeBrain/reference/AbstractGeom.html#method-set_value)

------------------------------------------------------------------------

### `SpriteGeom$new()`

Create a new image sprite geometry.

#### Usage

    SpriteGeom$new(
      name,
      image_path,
      entry_position = c(1, 0, 0),
      target_position = c(0, 0, 0),
      ...
    )

#### Arguments

- `name`:

  Unique character name.

- `image_path`:

  Path to a PNG image file on disk.

- `entry_position`:

  Numeric vector of length 3: one end of the sprite axis (e.g. electrode
  entry point). Default `c(1, 0, 0)`.

- `target_position`:

  Numeric vector of length 3: the other end of the sprite axis (e.g.
  electrode target point). Default `c(0, 0, 0)`.

- `...`:

  Additional arguments forwarded to `AbstractGeom`.

------------------------------------------------------------------------

### `SpriteGeom$to_list()`

Serialize the sprite geometry to a named list for JSON export.

#### Usage

    SpriteGeom$to_list()

------------------------------------------------------------------------

### `SpriteGeom$clone()`

The objects of this class are cloneable with this method.

#### Usage

    SpriteGeom$clone(deep = FALSE)

#### Arguments

- `deep`:

  Whether to make a deep clone.
