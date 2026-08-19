# R6 Class - Streamline Geometry

Geometry that points at a streamline (`tractography`) file on disk. The
tract data is never read in R: the file path is registered as cached
group data and the file is loaded and parsed directly by the 3D viewer.

## Author

Zhengjia Wang

## Super class

[`AbstractGeom`](https://dipterix.org/threeBrain/reference/AbstractGeom.md)
-\> `StreamlineGeom`

## Public fields

- `type`:

  Geometry type string (`"streamline"`).

- `clickable`:

  Logical; always `FALSE` for streamline geometry.

- `color`:

  Line color as an upper-case `'#RRGGBB'` string.

- `streamline_name`:

  Bundle name, using the on-disk spelling.

- `streamline_group`:

  Circuit group name, using the on-disk spelling.

## Active bindings

- `data_key`:

  Key under which the file descriptor is stored in the owning group. One
  circuit group holds several bundles, so the key is suffixed with
  `streamline_name`.

## Methods

### Public methods

- [`StreamlineGeom$new()`](#method-StreamlineGeom-initialize)

- [`StreamlineGeom$to_list()`](#method-StreamlineGeom-to_list)

- [`StreamlineGeom$clone()`](#method-StreamlineGeom-clone)

Inherited methods

- [`AbstractGeom$animation_time_range()`](https://dipterix.org/threeBrain/reference/AbstractGeom.html#method-animation_time_range)
- [`AbstractGeom$animation_value_names()`](https://dipterix.org/threeBrain/reference/AbstractGeom.html#method-animation_value_names)
- [`AbstractGeom$animation_value_range()`](https://dipterix.org/threeBrain/reference/AbstractGeom.html#method-animation_value_range)
- [`AbstractGeom$get_data()`](https://dipterix.org/threeBrain/reference/AbstractGeom.html#method-get_data)
- [`AbstractGeom$set_position()`](https://dipterix.org/threeBrain/reference/AbstractGeom.html#method-set_position)
- [`AbstractGeom$set_value()`](https://dipterix.org/threeBrain/reference/AbstractGeom.html#method-set_value)

------------------------------------------------------------------------

### `StreamlineGeom$new()`

Create a streamline geometry from a file path.

#### Usage

    StreamlineGeom$new(
      name,
      path,
      streamline_name,
      streamline_group = "default",
      color = "#FF0000",
      group = GeomGroup$new(name = "default"),
      layer = 7,
      ...
    )

#### Arguments

- `name`:

  Unique character name of the geometry.

- `path`:

  Path to the streamline file.

- `streamline_name`:

  Bundle name; used to derive the cached data key.

- `streamline_group`:

  Circuit group name.

- `color`:

  Line color; any R color specification.

- `group`:

  `GeomGroup` that owns this geometry.

- `layer`:

  Camera layer. Default `7` (all cameras).

- `...`:

  Additional arguments forwarded to `AbstractGeom`.

------------------------------------------------------------------------

### `StreamlineGeom$to_list()`

Serialize the streamline geometry to a named list for `'JSON'` export,
adding `color`, `streamline_name`, `streamline_group`, and
`isStreamlineGeom`.

#### Usage

    StreamlineGeom$to_list()

------------------------------------------------------------------------

### `StreamlineGeom$clone()`

The objects of this class are cloneable with this method.

#### Usage

    StreamlineGeom$clone(deep = FALSE)

#### Arguments

- `deep`:

  Whether to make a deep clone.
