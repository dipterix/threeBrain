# threeBrain - HTML, WebGL based 3D Viewer

A live [demo]() is available!

## A. Installation

1. Install [`Python3`](https://www.python.org/downloads/), [`R`](https://cran.r-project.org/) and [`RStudio Desktop (Free Version)`](https://www.rstudio.com/products/rstudio/download/)
2. Open `RStudio`, enter from its console:
```{r}
install.packages("threeBrain")
```
If you want to install `dev` version from *Github*, then use:
```{r}
install.packages("devtools")
devtools::install_github("dipterix/threeBrain@dev")
```
3. Setups: after installation, in `RStudio` console, type the following command
```{r}
threeBrain::brain_setup()
```
and follow the instructions.

## B. Basic Brain Viewer

Once finishing setting up of `threeBrain`, there will be a template subject `N27` (Collin's 27) created at
```
~/rave_data/others/three_brain/N27
```
`~` is your home directory. For example on my laptop, it's `/Users/zhengjia/rave_data/others/three_brain/N27`. On Windows, it's `C:\Users\zhengjia\rave_data\others\three_brain\N27`.

Let's view this subject. The following commands all go to `RStudio` console.

1. Import subject
```{r}
n27 = freesurfer_brain(
    fs_subject_folder = '~/rave_data/others/three_brain/N27',
    subject_name = 'N27',
    additional_surfaces = c('white', 'smoothwm')
)
```
2. Visualize
```{r}
plot(x)       # alternatively, you can use `x$plot()`
```

If you have electrode file, you can import it before calling `plot` function. Please make sure it's in `csv` format.
```{r}
x$set_electrodes(electrodes = "[PATH to ELECTRODE FILE]")
```
Here is an example of electrode csv file. Only the first five columns (**case-sensitive**) are mandatory: `Electrode (integer)`, `Coord_x`, `Coord_y`, `Coord_z`, and `Label (character)`. `Coord_*` is `RAS` location from `FreeSurfer` coordinates.
```
| Electrode| Coord_x| Coord_y| Coord_z|Label  | MNI305_x|  MNI305_y|  MNI305_z|SurfaceElectrode |SurfaceType | Radius| VertexNumber|Hemisphere |
|---------:|-------:|-------:|-------:|:------|--------:|---------:|---------:|:----------------|:-----------|------:|------------:|:----------|
|         1|    29.0|    -7.8|   -34.6|RMHCH1 | 30.46817| -17.98119| -23.40022|FALSE            |NA          |    0.5|           -1|right      |
|         2|    33.8|    -8.0|   -34.2|RMHCH2 | 35.57109| -17.76624| -22.80131|FALSE            |NA          |    0.5|           -1|right      |
|         3|    38.0|    -7.5|   -33.5|RMHCH3 | 39.97102| -16.81249| -22.17986|FALSE            |NA          |    0.5|           -1|right      |
|         4|    42.6|    -6.8|   -33.0|RMHCH4 | 44.79092| -15.73442| -21.82591|FALSE            |NA          |    0.5|           -1|right      |
|         5|    47.0|    -6.8|   -32.6|RMHCH5 | 49.45370| -15.35431| -21.31272|FALSE            |NA          |    0.5|           -1|right      |
|         ...
```

## C. Merge Subjects and Template mapping

If you have your own subjects with `FreeSurfer` output, for example, I have two subjects `YAB` and `YCQ`. To merge these two subjects and show them on `N27` template,
```{r}
# yab = ... (see section B for import a single subject)
# ycq = ...
template_n27 = threeBrain::merge_brain(yab, ycq, template_subject = 'N27')

plot( template_n27 )
```
The viewer will be in `N27` template, and electrodes of these two subjects can be mapped via `MNI305` (for surface and stereo EEG) or `std.141` (for surface-only).
