# R6 Class - Generate Group of Geometries

Container that collects geometry objects belonging to the same logical
group in the three-brain viewer. Manages shared data, an optional 4-by-4
transformation matrix, spatial position, and a local file cache.

## Author

Zhengjia Wang

## Public fields

- `name`:

  Unique character name of the group.

- `layer`:

  Camera layer(s); 0 = main camera only, 1 = all cameras, 13 =
  invisible.

- `position`:

  Numeric vector of length 3: group origin in world space.

- `group_data`:

  Named list of shared data attached to the group.

- `trans_mat`:

  Optional 4-by-4 transformation matrix (`NULL` for identity).

- `cached_items`:

  Character vector of group data keys stored in the file cache.

- `cache_env`:

  Local environment used for in-memory caching of loaded cache files.

- `cache_path`:

  Directory path for the file cache.

- `disable_trans_mat`:

  Logical; when `TRUE` the transformation matrix is ignored during
  rendering.

- `parent_group`:

  Name of the parent group, or `NULL`.

- `subject_code`:

  Subject identifier string, or `NULL`.

- `.cache_name`:

  Override for the sanitized cache directory name. When `NULL` the name
  is derived from `$name` by replacing non-alphanumeric characters with
  underscores.

## Methods

### Public methods

- [`GeomGroup$cache_name()`](#method-GeomGroup-cache_name)

- [`GeomGroup$set_transform()`](#method-GeomGroup-set_transform)

- [`GeomGroup$new()`](#method-GeomGroup-initialize)

- [`GeomGroup$set_group_data()`](#method-GeomGroup-set_group_data)

- [`GeomGroup$get_data()`](#method-GeomGroup-get_data)

- [`GeomGroup$to_list()`](#method-GeomGroup-to_list)

- [`GeomGroup$clone()`](#method-GeomGroup-clone)

------------------------------------------------------------------------

### `GeomGroup$cache_name()`

Return the sanitized cache directory name for this group. Uses
`.cache_name` when set, otherwise derives the name from `$name` by
replacing non-alphanumeric characters with underscores.

#### Usage

    GeomGroup$cache_name()

------------------------------------------------------------------------

### `GeomGroup$set_transform()`

Set or clear the 4-by-4 transformation matrix for the group.

#### Usage

    GeomGroup$set_transform(mat = NULL)

#### Arguments

- `mat`:

  A 4-by-4 numeric matrix, or `NULL` to use the identity transform.

------------------------------------------------------------------------

### `GeomGroup$new()`

Create a new geometry group.

#### Usage

    GeomGroup$new(
      name,
      layer = 0,
      position = c(0, 0, 0),
      cache_path = tempfile(),
      parent = NULL
    )

#### Arguments

- `name`:

  Unique character name for the group.

- `layer`:

  Camera layer(s), 0-13. Default `0`.

- `position`:

  Numeric vector of length 3: group origin. Default `c(0, 0, 0)`.

- `cache_path`:

  Directory path for caching serialized data.

- `parent`:

  Name or `GeomGroup` object of the parent group, or `NULL`.

------------------------------------------------------------------------

### `GeomGroup$set_group_data()`

Attach a named data object to the group, optionally storing it in the
file cache.

#### Usage

    GeomGroup$set_group_data(
      name,
      value,
      is_cached = FALSE,
      cache_if_not_exists = FALSE
    )

#### Arguments

- `name`:

  Key name for the data object.

- `value`:

  Data to store.

- `is_cached`:

  Logical; whether `value` is already a cache descriptor list.

- `cache_if_not_exists`:

  Logical; write `value` to the file cache when no cache file exists
  yet.

------------------------------------------------------------------------

### `GeomGroup$get_data()`

Retrieve a data object from the group by key, loading from the file
cache when necessary.

#### Usage

    GeomGroup$get_data(key, force_reload = FALSE, ifnotfound = NULL)

#### Arguments

- `key`:

  Name of the data object to retrieve.

- `force_reload`:

  Logical; reload from the file cache even when an in-memory copy
  exists.

- `ifnotfound`:

  Value returned when `key` is not found.

------------------------------------------------------------------------

### `GeomGroup$to_list()`

Serialize the group to a named list for JSON export.

#### Usage

    GeomGroup$to_list()

------------------------------------------------------------------------

### `GeomGroup$clone()`

The objects of this class are cloneable with this method.

#### Usage

    GeomGroup$clone(deep = FALSE)

#### Arguments

- `deep`:

  Whether to make a deep clone.
