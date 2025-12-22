# Creates any mesh geometry given vertices and face indices

Creates any mesh geometry given vertices and face indices

## Usage

``` r
geom_freemesh(
  name,
  vertex = NULL,
  face = NULL,
  position = c(0, 0, 0),
  layer = 1,
  cache_file = NULL,
  group = NULL
)
```

## Arguments

- name:

  unique string in a scene to tell apart from different objects

- vertex:

  position of each vertices (3 columns)

- face:

  face indices indicating which 3 vertices to be linked (3 columns)

- position:

  x,y,z location of the geometry

- layer:

  visibility of the geometry, used when there are multiple cameras 1 is
  visible for all cameras

- cache_file:

  cache vertex and face data into group

- group:

  a GeomGroup object, if null, then the group will be generated
  automatically

## Details

When generating a free mesh internally, a group must be specified,
therefore if group is `NULL` here, then a group will be generated.
However, it's always recommended to pass a group to the free mesh.

## Author

Zhengjia Wang

## Examples

``` r
if (FALSE) { # \dontrun{
# Make sure you have N27 brain downloaded to `default_template_directory()`
# threeBrain::download_N27()

n27_dir = file.path(default_template_directory(), "N27")
surf_type = 'pial'

# Locate mesh files
lh = read_fs_asc(file.path(n27_dir, sprintf('surf/lh.%s.asc', surf_type)))
rh = read_fs_asc(file.path(n27_dir, sprintf('surf/rh.%s.asc', surf_type)))

# Create groups
group = create_group(name = sprintf('Surface - %s (N27)', surf_type))

# create mesh
lh_mesh = geom_freemesh(
  name = sprintf('FreeSurfer Left Hemisphere - %s (N27)', surf_type),
  vertex = lh$vertices[,1:3],
  face = lh$faces[,1:3],
  group = group
)
rh_mesh = geom_freemesh(
  name = sprintf('FreeSurfer Right Hemisphere - %s (N27)', surf_type),
  vertex = rh$vertices[,1:3],
  face = rh$faces[,1:3],
  group = group
)


# Render
if( interactive() ) { threejs_brain(lh_mesh, rh_mesh) }



} # }
```
