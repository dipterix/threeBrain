# Create a geometry group containing multiple geometries

Create a geometry group containing multiple geometries

## Usage

``` r
create_group(name, position = c(0, 0, 0), layer = 1)
```

## Arguments

- name:

  string, name of the geometry

- position:

  x,y,z location of the group

- layer:

  layer of the group. reserved

## Value

a GeomGroup instance

## Details

A geometry group is a container of multiple geometries. The geometries
within the same group share the same shift and rotations (see example
1). In ECoG/iEEG world, you might have 'MRI', 'CT', 'FreeSurfer' that
have different orientations. For example, if you want to align MRI to
FreeSurfer, Instead of calculating the position of each geometries, you
can just put all MRI components into a group, and then set transform of
this group, making the group aligned to FreeSurfer.

GeomGroup also can be used to store large data. To generate 3D viewer,
\`threeBrain\` needs to dynamically serialize data into JSON format,
which can be read by browsers. However, a FreeSurfer brain might be ~30
MB. This is a very large size and might take ~5 seconds to serialize. To
solve this problem, GeomGroup supports cache in its \`set_group_data\`
method. This method supports caching static serialized data into a JSON
file, and allows the files to be loaded as static data objects. By
"static", I mean the data is not supposed to be dynamic, and it should
be "read-only". In JavaScript code, I also optimized such that you don't
need to load these large datasets repeatedly. And this allows you to
load multiple subjects' brain in a short time.

## Author

Zhengjia Wang

## Examples

``` r
# Example 1: relative position

# create group
g = create_group('Group A')

# create two spheres at 10,0,0, but s2 is relative to group A
s1 = geom_sphere('Sphere 1', radius = 2, position = c(10,0,0))
s2 = geom_sphere('Sphere 2', radius = 2, position = c(10,0,0), group = g)

# set transform (rotation)
g$set_transform(matrix(c(
  0,1,0,0,
  1,0,0,0,
  0,0,1,0,
  0,0,0,1
), byrow = TRUE, ncol = 4))

# global position for s2 is 0,10,0
if( interactive() ) { threejs_brain(s1, s2) }

# Example 2: cache

if (FALSE) { # \dontrun{

# download N27 brain
# Make sure you have N27 brain downloaded to `default_template_directory()`
# download_N27()

template_dir <- default_template_directory()

dat = freesurferformats::read.fs.surface(
  file.path(template_dir, 'N27/surf/lh.pial')
)
vertex = dat$vertices[,1:3]
face = dat$faces[,1:3]

# 1. dynamically serialize
mesh = geom_freemesh('lh', vertex = vertex, face = face, layer = 1)

# 2. cache
# Create group, all geometries in this group are relatively positioned
tmp_file = tempfile()
mesh = geom_freemesh('Left Hemisphere cached', vertex = vertex,
                     face = face, cache_file = tmp_file)

} # }
```
