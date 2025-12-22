# Create sphere geometry

Create sphere geometry

## Usage

``` r
geom_sphere(
  name,
  radius,
  position = c(0, 0, 0),
  layer = 1,
  group = NULL,
  value = NULL,
  time_stamp = NULL
)
```

## Arguments

- name:

  unique string in a scene to tell apart from different objects

- radius:

  size of sphere

- position:

  x,y,z location of the sphere

- layer:

  visibility of the geometry, used when there are multiple cameras 1 is
  visible for all cameras

- group:

  a GeomGroup object

- value, time_stamp:

  color of the sphere, used for animation/color rendering

## Author

Zhengjia Wang

## Examples

``` r
# Create a sphere with animation
g = lapply(1:10, function(ii){
  v = rep(ii, 10)
  v[1:ii] = 1:ii
  geom_sphere(paste0('s', ii), ii, value = v, position = c(11 * ii, 0,0), time_stamp = (1:10)/10)
})
if( interactive() ) { threejs_brain(.list = g) }
```
