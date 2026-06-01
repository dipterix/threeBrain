# R6 Class - Generate Line Segments

Line-segment geometry for drawing connections or paths in the
three-brain viewer. Vertices may be static numeric coordinates or
dynamic electrode references resolved at render time.

## Author

Zhengjia Wang

## Super class

[`AbstractGeom`](https://dipterix.org/threeBrain/reference/AbstractGeom.md)
-\> `LineSegmentsGeom`

## Public fields

- `type`:

  Geometry type string (`"linesegments"`).

- `color`:

  CSS hex color string(s) applied to line segments.

- `size`:

  Line width(s) in world-space units.

- `vertices`:

  Vertex positions: a numeric matrix (3 x N) for static segments, or a
  list of position/electrode descriptors for dynamic segments.

## Active bindings

- `dynamic`:

  Logical; `TRUE` when vertices are electrode references resolved at
  render time rather than static coordinates.

## Methods

### Public methods

- [`LineSegmentsGeom$new()`](#method-LineSegmentsGeom-initialize)

- [`LineSegmentsGeom$set_vertices()`](#method-LineSegmentsGeom-set_vertices)

- [`LineSegmentsGeom$set_color()`](#method-LineSegmentsGeom-set_color)

- [`LineSegmentsGeom$set_size()`](#method-LineSegmentsGeom-set_size)

- [`LineSegmentsGeom$to_list()`](#method-LineSegmentsGeom-to_list)

- [`LineSegmentsGeom$clone()`](#method-LineSegmentsGeom-clone)

Inherited methods

- [`AbstractGeom$animation_time_range()`](https://dipterix.org/threeBrain/reference/AbstractGeom.html#method-animation_time_range)
- [`AbstractGeom$animation_value_names()`](https://dipterix.org/threeBrain/reference/AbstractGeom.html#method-animation_value_names)
- [`AbstractGeom$animation_value_range()`](https://dipterix.org/threeBrain/reference/AbstractGeom.html#method-animation_value_range)
- [`AbstractGeom$get_data()`](https://dipterix.org/threeBrain/reference/AbstractGeom.html#method-get_data)
- [`AbstractGeom$set_position()`](https://dipterix.org/threeBrain/reference/AbstractGeom.html#method-set_position)
- [`AbstractGeom$set_value()`](https://dipterix.org/threeBrain/reference/AbstractGeom.html#method-set_value)

------------------------------------------------------------------------

### `LineSegmentsGeom$new()`

Create a new line-segment geometry.

#### Usage

    LineSegmentsGeom$new(name, dynamic = FALSE, ...)

#### Arguments

- `name`:

  Unique character name.

- `dynamic`:

  Logical; when `TRUE` vertices are electrode references resolved at
  render time rather than fixed coordinates.

- `...`:

  Additional arguments forwarded to `AbstractGeom`.

------------------------------------------------------------------------

### `LineSegmentsGeom$set_vertices()`

Set vertex positions for the line segments.

#### Usage

    LineSegmentsGeom$set_vertices(..., .list = list(), append = FALSE)

#### Arguments

- `...`:

  Positions as numeric vectors of length 3 (static mode) or named lists
  with `subject_code` and `electrode` elements (dynamic mode).

- `.list`:

  Additional positions supplied as a list.

- `append`:

  Logical; when `TRUE` append rather than replace.

------------------------------------------------------------------------

### `LineSegmentsGeom$set_color()`

Set the color(s) of the line segments.

#### Usage

    LineSegmentsGeom$set_color(...)

#### Arguments

- `...`:

  One or more R color values (names, hex strings, or integer palette
  indices) that are interpolated across all segments.

------------------------------------------------------------------------

### `LineSegmentsGeom$set_size()`

Set the line width(s).

#### Usage

    LineSegmentsGeom$set_size(...)

#### Arguments

- `...`:

  One or more positive numbers interpolated across all segments.

------------------------------------------------------------------------

### `LineSegmentsGeom$to_list()`

Serialize the line-segment geometry to a named list for JSON export.

#### Usage

    LineSegmentsGeom$to_list()

------------------------------------------------------------------------

### `LineSegmentsGeom$clone()`

The objects of this class are cloneable with this method.

#### Usage

    LineSegmentsGeom$clone(deep = FALSE)

#### Arguments

- `deep`:

  Whether to make a deep clone.
