# [threeBrain - HTML, WebGL based 3D Viewer](https://dipterix.org/threeBrain/index.html)

<!-- badges: start -->
[![CRAN_Status_Badge](https://www.r-pkg.org/badges/version/threeBrain)](https://cran.r-project.org/package=threeBrain)
[![license](https://img.shields.io/badge/license-GPL--3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0.en.html)
[![R-CMD-check](https://github.com/dipterix/threeBrain/actions/workflows/R-CMD-check.yaml/badge.svg)](https://github.com/dipterix/threeBrain/actions/workflows/R-CMD-check.yaml)
[![Project Status: Active – The project has reached a stable, usable state and is being actively developed.](https://www.repostatus.org/badges/latest/active.svg)](https://www.repostatus.org/#active)
[![DOI](https://raw.githubusercontent.com/dipterix/threeBrain/master/inst/doi.svg)](https://doi.org/10.1016/j.neuroimage.2020.117341)

<!-- badges: end -->

<!-- demo static: start -->
<img src="https://github.com/dipterix/threeBrain/blob/master/docs/demo.gif?raw=true" width="100%" />

<div style = 'text-align:center; font-size: 20px'><a href="https://dipterix.org/threeBrain/" target="_blank">A live demo is live NOW! (Recommended: view it with Chrome)</a></div>
<!-- demo static: end -->

<!-- demo dynamic: start 
<script src="https://dipterix.org/lib/htmlwidgets-1.5.3/htmlwidgets.js" type="application/javascript" ></script>
<link href="https://dipterix.org/lib/threejs-0.101.1/css/dat.gui.css" rel="stylesheet" type="text/css" />
<link href="https://dipterix.org/lib/dipterixThreeBrain-1.0.1/dipterix.css" rel="stylesheet" type="text/css" />
<script src="https://dipterix.org/lib/dipterixThreeBrain-1.0.1/main.js" type="application/javascript" ></script>
<script src="https://dipterix.org/lib/threejs_brain-binding-0.2.0/threejs_brain.js" type="application/javascript" ></script>
<body>
<div id="htmlwidget_container">
  <div id="htmlwidget-10b2167231e00d19a0eb" style="width:100%;height:80vh;" class="threejs_brain html-widget"></div>
</div>
<script type="application/json" data-for="htmlwidget-10b2167231e00d19a0eb">{"x":{"data_filename":"config_dc13c2e1fa80edd292dea332a530d87e.json","settings":{"side_camera":true,"side_canvas_zoom":1,"side_canvas_width":250,"side_canvas_shift":[0,0],"color_maps":[],"default_colormap":null,"hide_controls":false,"control_center":[0,0,0],"camera_pos":[500,0,0],"font_magnification":1,"start_zoom":1,"show_legend":true,"render_timestamp":true,"control_presets":["subject2","surface_type2","hemisphere_material","surface_color","map_template","electrodes","voxel","animation","display_highlights"],"cache_folder":"https://dipterix.org/lib/threebrain_data-0/","lib_path":"https://dipterix.org/lib/","default_controllers":{"Overlay Coronal":true,"Overlay Axial":true,"Overlay Sagittal":true,"Axial (I - S)":-24,"Voxel Type":"aparc_aseg","Surface Color":"sync from voxels","Surface Type":"smoothwm","Blend Factor":1},"debug":true,"background":"#000000","token":null,"coords":null,"show_inactive_electrodes":true,"side_display":true,"control_display":false,"custom_javascript":null},"force_render":false},"evals":[],"jsHooks":[]}</script>
<script type="application/htmlwidget-sizing" data-for="htmlwidget-10b2167231e00d19a0eb">{"viewer":{"width":"100%","height":"100vh","padding":"0px","fill":true},"browser":{"width":"100%","height":"80vh","padding":"0px","fill":false}}</script>
<!-- demo dynamic: end -->

**Key Features**:

* Uses modern browsers, easy to **embed** and **share**
* Displays MRI, surfaces, and electrodes in the same canvas
* **Maps multiple subjects** on template brains using `AFNI/SUMA` (standard 141) or `MNI-305` locations
* **Electrode localization** in 3 approaches
* Volume rendering and surface/electrode **animation**
* Integration with interactive `R-shiny` framework

[News](https://dipterix.org/threeBrain/news/index.html) | [reference page](https://dipterix.org/threeBrain/reference/index.html) | [keyboard shortcuts](https://dipterix.org/threeBrain/shortcuts.html)

#### System Requirement

* **Web Browsers**: the viewer uses `WegGL2` to render in browsers. Please check [this list](https://caniuse.com/webgl2) to see compatible browsers. As of 2020, **Chrome**, **Firefox**, and **Edge** (not IE) have full supports.
  - For **Safari** users, please enable this feature by going to `Safari` > `Preferences`, click `Advanced`, then select `Show Develop menu in menu bar`; then click `Develop` in the menu bar, go to `Experimental Features` > `WebGL 2.0`. This only needs to be done once. 

## A. Installation

1. [`R`](https://cran.r-project.org/) and [`RStudio Desktop (Free Version)`](https://www.rstudio.com/products/rstudio/download/)
2. Open `RStudio`, enter from its console:
```r
install.packages("threeBrain")
```
If you want to install `dev` version from *Github*, then use:
```r
install.packages("remotes")
remotes::install_github("dipterix/threeBrain")
```
3. (Optional) Setups: after installation, in `RStudio` console, type the following command
```r
threeBrain::brain_setup()
```
and follow the instructions.

## B. Basic Brain Viewer

Once finishing setting up of `threeBrain`, there will be a template subject `N27` (Collin's 27) created locally. The location is platform-related. You can find it by running the following command:

```r
library(threeBrain)

default_template_directory()
#> [1] "/Users/dipterix/Library/Application Support/
#> org.R-project.R/R/threeBrain/templates"
```

**N27** template folder resides inside of this directory.

Let's view this subject using the `freesurfer_brain2` function.

1. Import subject
```r
library(threeBrain)

n27_path <- file.path(default_template_directory(), "N27")

x <- freesurfer_brain2( fs_subject_folder = n27_path,
  subject_name = 'N27', surface_types = 'pial')
```
2. Visualize
```r
plot(x)       # alternatively, you can use `n27$plot()`
```

## C. Subject Setup

The sample subject (`N27`) is a sample generated by `FreeSurfer` ([download](https://surfer.nmr.mgh.harvard.edu/fswiki/DownloadAndInstall)). If you have any subjects processed by `FreeSurfer`, use function `freesurfer_brain2` to visualize. 

The `AFNI/SUMA` standard 141 brain is also supported. Please use terminal command `@SUMA_Make_Spec_FS -NIFTI -sid [subID]` to generate 141 brain. (Click [here](https://openwetware.org/wiki/Beauchamp:BuffyElectrodeNotes#Converting_Files_between_iELVis_and_AFNI/SUMA) for some hints)

## D. Add/Render Electrodes

If you have electrode file, you can import it before calling `plot` function. Please make sure it's in `csv` format.
```r
x$set_electrodes(electrodes = "[PATH to ELECTRODE FILE]")
```
Here is an example of electrode csv file. Only the first five columns (**case-sensitive**) are mandatory: `Electrode (integer)`, `Coord_x`, `Coord_y`, `Coord_z`, and `Label (character)`. `Coord_*` is `tkRAS` location from `FreeSurfer` coordinates.
```
| Electrode| Coord_x| Coord_y| Coord_z|Label  | MNI305_x|  MNI305_y|  MNI305_z|SurfaceElectrode |SurfaceType | Radius| VertexNumber|Hemisphere |
|---------:|-------:|-------:|-------:|:------|--------:|---------:|---------:|:----------------|:-----------|------:|------------:|:----------|
|         1|    29.0|    -7.8|   -34.6|RMHCH1 | 30.46817| -17.98119| -23.40022|FALSE            |pial        |      2|           -1|left       |
|         2|    33.8|    -8.0|   -34.2|RMHCH2 | 35.57109| -17.76624| -22.80131|FALSE            |pial        |      2|           -1|left       |
|         3|    38.0|    -7.5|   -33.5|RMHCH3 | 39.97102| -16.81249| -22.17986|FALSE            |white       |      2|           -1|right      |
|         4|    42.6|    -6.8|   -33.0|RMHCH4 | 44.79092| -15.73442| -21.82591|FALSE            |smoothwm    |      2|           -1|right      |
|         5|    47.0|    -6.8|   -32.6|RMHCH5 | 49.45370| -15.35431| -21.31272|FALSE            |pial        |      2|           -1|right      |
|         ...
```

To assign values to electrodes, run
```r
x$set_electrode_values(electrodes = "[PATH to ELECTRODE VALUE FILE]")
```

The electrode value file is also a csv like:

```
| Electrode| Subject| Project|    Time| ValueName| ValueName2|  ...|
|---------:|-------:|-------:|-------:|:---------|----------:|-----|
|         1|     N27|    Demo|       0|A         |   30.46817|  ...|
|         2|     N27|    Demo|       0|B         |   35.57109|  ...|
|         3|     N27|    Demo|       0|C         |   39.97102|  ...|
|         4|     N27|    Demo|       0|D         |   44.79092|  ...|
|         5|     N27|    Demo|       0|A         |   49.45370|  ...|
|         ...
```

`Project` and `Time` are optional. However, if you are also using [`rave`](https://github.com/beauchamplab/rave), please make sure `Project` exists. If you want to show animation, `Time` is necessary and must be numeric. `ValueName?` can be any characters containing letters (`A-Z`, `a-z`), letters (`0-9`) and underscore (`_`).


## E. Merge Subjects and Template mapping

If you have your own subjects with `FreeSurfer` output, for example, I have two subjects `YAB` and `YCQ`. To merge these two subjects and show them on `N27` template,
```r
library(threeBrain)

# yab = ... (see section B for import a single subject)
# ycq = ...
template_n27 = merge_brain(yab, ycq, template_subject = 'N27')

plot( template_n27 )
```
The viewer will be in `N27` template, and electrodes of these two subjects can be mapped via `MNI305` (for surface and stereo EEG) or `std.141` (for surface-only).


## F. Electrode Localization

(Do NOT use this feature for clinical purposes!)

As of version `0.2.1`, `threeBrain` supports electrode localization. You can:

* Use template brain to generate electrode table, when you don't have subject-level MRI
* Use subject MRI to generate when CT scans are unavailable
* Use CT co-registered to MRI

#### Use template brain to generate electrode table

Create a blank template and localize:

```r
library(threeBrain)
template <- merge_brain()
template$localize()
```

#### Use subject MRI to generate when CT scans are unavailable

If you have MRI but don't have CT scans, it is possible to use MRI slices. Make sure to change `fs_subject_folder` accordingly:

```r
x <- freesurfer_brain2( 
  fs_subject_folder = file.path(default_template_directory(), "N27"),
  subject_name = 'N27', surface_types = 'pial')
  
x$localize()
```

#### Use CT co-registered to MRI

If you have CT images, please co-register with MRI first. This requires `dcm2nii` ([link](https://www.nitrc.org/plugins/mwiki/index.php/dcm2nii:MainPage)) or `dcm2niix` ([link](https://github.com/rordenlab/dcm2niix)), and `FLIRT` package ([link](https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/FLIRT/StepByStep)).


**Step 1**: Merge all `DICOM` images to `Nifti` format:

Open your terminal, change directories to where `CT` images are, and run

```
dcm2niix [folder with DICOM images]
```

Do the same to `T1` MR images too.

**Step 2**: Copy the two `.nii` files generated in the previous step to a same folder, rename them to be `ct.nii` and `t1.nii`

```
flirt -in ct.nii -ref t1.nii -out ct_in_t1.nii -omat ct2t1.mat -interp trilinear -cost mutualinfo -dof 6 -searchcost mutualinfo -searchrx -180 180 -searchry -180 180 -searchrz -180 180 
```

There will be a `ct_in_t1.nii` file generated. 

**Step 3**: Localize

Open `RStudio`, type and change the file path to `ct_in_t1.nii` just created

```
# Import 3D brain
# x <- freesurfer_brain2( ... ) 
x$localize( "[path to ct_in_t1.nii]" )
```

## Citation

To cite threeBrain in publications use:

> Magnotti, J. F., Wang, Z., & Beauchamp, M. S. (2020). RAVE: Comprehensive open-source software for reproducible analysis and visualization of intracranial EEG data. *NeuroImage, 223*, 117341.

A BibTeX entry for LaTeX users:

```
  @Article{,
    title = {{RAVE}: Comprehensive open-source software for reproducible analysis and visualization of intracranial EEG data},
    author = {John F. Magnotti and Zhengjia Wang and Michael S. Beauchamp},
    journal = {NeuroImage},
    year = {2020},
    volume = {223},
    doi = {10.1016/j.neuroimage.2020.117341},
    pages = {117341},
  }
```
