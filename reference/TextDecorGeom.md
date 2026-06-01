# R6 Class - Text Decoration Geometry

R6 Class - Text Decoration Geometry

## Author

Zhengjia Wang

## Super class

[`AbstractGeom`](https://dipterix.org/threeBrain/reference/AbstractGeom.md)
-\> `TextDecorGeom`

## Public fields

- `text`:

  Label string rendered in the canvas

- `font_size`:

  World-space height of the sprite in mm

- `color`:

  CSS color string for the text (e.g. `"#ffffff"`)

- `font_weight`:

  CSS font-weight integer (e.g. 400 = normal, 700 = bold)

- `decor_id`:

  Stable ID used to identify this decoration in the viewer. Defaults to
  the geometry `name`.

- `type`:

  Geometry type string used by the JavaScript engine.

- `clickable`:

  Logical; whether the geometry responds to mouse clicks in the viewer.

## Methods

### Public methods

- [`TextDecorGeom$new()`](#method-TextDecorGeom-initialize)

- [`TextDecorGeom$to_list()`](#method-TextDecorGeom-to_list)

- [`TextDecorGeom$clone()`](#method-TextDecorGeom-clone)

Inherited methods

- [`AbstractGeom$animation_time_range()`](https://dipterix.org/threeBrain/reference/AbstractGeom.html#method-animation_time_range)
- [`AbstractGeom$animation_value_names()`](https://dipterix.org/threeBrain/reference/AbstractGeom.html#method-animation_value_names)
- [`AbstractGeom$animation_value_range()`](https://dipterix.org/threeBrain/reference/AbstractGeom.html#method-animation_value_range)
- [`AbstractGeom$get_data()`](https://dipterix.org/threeBrain/reference/AbstractGeom.html#method-get_data)
- [`AbstractGeom$set_position()`](https://dipterix.org/threeBrain/reference/AbstractGeom.html#method-set_position)
- [`AbstractGeom$set_value()`](https://dipterix.org/threeBrain/reference/AbstractGeom.html#method-set_value)

------------------------------------------------------------------------

### `TextDecorGeom$new()`

Create a new text decoration geometry.

#### Usage

    TextDecorGeom$new(
      text = "",
      position = c(0, 0, 0),
      name = NULL,
      decor_id = NULL,
      font_size = 5,
      color = "#ffffff",
      font_weight = 400,
      layer = 1,
      ...
    )

#### Arguments

- `text`:

  Character string to display.

- `position`:

  Numeric vector of length 3: `c(x, y, z)` in world space.

- `name`:

  Unique geometry name. If `NULL` a random ID is generated
  automatically.

- `decor_id`:

  Stable decoration ID visible to the Shiny proxy. Defaults to `name`.

- `font_size`:

  World-space height of the sprite in mm. Default `5`.

- `color`:

  CSS color string. Default `"#ffffff"`.

- `font_weight`:

  CSS font-weight integer. Default `400`.

- `layer`:

  Camera layer(s), 0-13 (0 = main camera only, 1 = all cameras). Default
  `1`.

- `...`:

  Additional arguments forwarded to `AbstractGeom`.

------------------------------------------------------------------------

### `TextDecorGeom$to_list()`

Serialize to a list for JSON export.

#### Usage

    TextDecorGeom$to_list()

------------------------------------------------------------------------

### `TextDecorGeom$clone()`

The objects of this class are cloneable with this method.

#### Usage

    TextDecorGeom$clone(deep = FALSE)

#### Arguments

- `deep`:

  Whether to make a deep clone.
