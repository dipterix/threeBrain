threeBrain 1.0.2
=======

* Removed a `shader` loop that accidentally used dynamic variable for looping, which may crash on `Windows` in certain situations
* Updated `README.md`
* Composer effects are removed
* Added default color to electrodes (JavaScript) to fix the localization electrode color not set correctly issues
* Added `z-index` base to the side canvas layer (`div`)
* Removed additional unused parameters from material call
* Used new material type to make brain more realistic
* New background color is implemented
* `Trackball` uses width instead of height of the viewer as the `Arcball` radius; mouse positions is calculated whenever mouse-down event is triggered (allowing more accurate track-ball calculation in `Shiny` applications)
* Made `col2hexstr` internal function
* Added a new electrode visibility mode, allowing to show contacts with no values but passing the threshold
* Added `brain$electrodes$fix_electrode_color` to fix the electrode colors under given data names (to display `DBS` electrodes, for example)
* Made `controller.load` more robust against errors
* Fixed the depth issue in `TextSprite`
* Some default controller values have changed to make more sense
* Outline render effect is removed; electrode outlines are implemented directly in the `shader`
* Updated `three.js` to `v160` with light model improved
* Added `rave_slices.nii` to allowed `MRI` prefix in `FreeSurfer` folder with highest priority, such that this image will be treated as default volume to load in side canvas (default is still `brain.finalsurfs.mgz`)
* Allow `MRI` to change brightness dynamically in viewer
* Ensure that `voxels` index from zeros
* Added `brain$get_atlas_labels` to guess the atlas labels from given masks or atlas files
* Allowed to spatially transform electrodes to desired coordinate system
* Updated citation
* The standalone viewer does not require static server anymore: everything is self-contained (require `pandoc`, which comes with `RStudio`)
* Changed mechanism on animation color map generator (so the color is more accurate for discrete variables)
* Added `png` to dependence
* Added support for `AC-PC` alignment, available in `RAVE` - `YAEL` module
* Allow `brain` to plot with additional customized geometries
* Added `plot_slides` to plot `MRI` centered at each electrode contact for slide-to-slide visualization
* Added Line-of-Sight view mode for side canvas; can be enabled using shortcut `m` (previous shortcut to change the material type is changed to `shift+M`)
* Fixed `CT` in `JavaScript` when the `sform` and `qform` are different (have different code)
* Allowed to specify the spacing for interpolation and extrapolation for unequally spaced electrodes
* Added electrode outlines
* `YAEL` paper is finally out
* Fixed incorrect sub-cortical labels
* Deprecated old format (no cache is needed anymore)
* Made electrodes opaque on main but transparent in side canvas
* Let controllers check if the variable is valid before set to avoid invalid viewer state during initialization
* Added `get_ijk2ras` to get `Norig` and `Torig` matrix

threeBrain 1.0.1
=======

* Updated controller library to have reasonable input focus
* Allow `MRI` slices to be `NIfTI` format
* Set slices to be visible by default when the surface is not available
* Fixed transform for `datacube2`
* Fixed `qform` when reading `NIfTI` files
* Fixed `auto-refine` functions in electrode localization
* Removed clipboard auto-copy and auto-paste functions since they conflict with other viewers; instead users can use controllers to copy and paste state

threeBrain 1.0.0 - Egypt
=======

This version is a major update.

* Created `threeBrain::threeBrain` as the formal way to create brain objects
* Updated `JavaScript` engine to `v150`
* Allow getting `HTML` tags from saved widget so the widget can be used from `Jupyter` notebook
* Added `$render` method to remember viewer states
* Allowing set title via proxy driver
* Added citation information
* Fixed hemisphere issue in localization when electrodes are closer to opposite hemispheres
* Added electrode registration from anatomical slice cross-hair

threeBrain 0.2.9
=======

This version plans for a major update. Here are some highlights:

* Electrode localization can be done from original `CT` instead of re-sampled ones
* Completely isolate `JavaScript` engine from `R` code. The `JavaScript` code is available as `npm` package and is used via sub-module
* Implemented file readers directly from `JavaScript`, this allows reading files directly in viewer, and no cache is needed
* No home-brew version of `threejs` is required: standard `npm` distribution is used
* New controller `GUI` is implemented
* The viewer can be driven via `JavaScript` directly via event dispatchers
* Anatomical segmentation map is visible from the side panels; the `voxel` values are displayed when setting `crosshair`


## Detailed Changes

* Added step size in `datacube2` material uniforms
* Upgraded `threejs` to `r148`, and use `npm` distribution "three"
* Massive code re-factory (variable names, trackball controls, legacy classes...)
* Removed `data-GUI` and use `lil-GUI`
* Fixed compass (finally...)
* Added title to the viewer
* Reworked the whole message signal system, added `ThrottledEventDispatcher.js`
* Added `MouseKeyboard` class to track mouse and keyboard events, greatly reduced canvas burden
* Added `animParameter` object to canvas to keep track of the animation parameters
* reworked shiny drivers
* fixed one-voxel shift issues
* Added format support for `nii`, `mgh/mgz`, `FreeSurfer` surface, `FreeSurfer` node value binary formats
* Added function `threeBrain` to allow 3D viewer to run without cache (with fs only)
* Fixed memory leak issues in `JavaScript` code
* Geometry groups can now change its storage path
* JS is completely independent now (available on `npm` now)
* Peel event dispatcher from the canvas class so the events can be managed separately
* Hide time-stamps when there is no data/animation available
* Added experimental support to show labels on regular electrodes; currently no depth-test is turned on
* Added `GUI` support to change electrode label visibility and size
* Electrode label size adjusts along with electrode radius
* `handle_resize` now put off resizing function when detecting widget size is too small

## Bug fixes

* Fixing `xfm` not parsed correctly when the line starts with blank spaces
* Stopped rendering canvas when canvas is too small (less than 10 pixels)

threeBrain 0.2.7
=======

## Changes

* Rewired events, allowing to drive the viewer via `JavaScript` events
* Allowed to set animation playback status
* Remove modal by default if `raveio` or `ravedash` is loaded
* Edited launch script to always use `Python3`

## Bug fixes

* Fixed installation issues (template brain) on `Windows`, avoid backslashes

threeBrain 0.2.6
=======

## Changes

* Allowed users to pan the camera when localizing electrodes
* Added line segment geometry type that can either display static line segments (such as `DTI`), or connect two electrodes dynamically
* Printing brain now uses more accurate terms 
* Allowed `CT` to be either path or the actual data when calling localizing function

## Bug fixes

* Fixed `NifTi` orientation issues and use `sform`
* Fixed localization issue when `NifTi` transform matrix has determinant not equally to 1
* Fixed volume shader, resolved shift issues when panning the camera

threeBrain 0.2.5
=======

## Changes

* Surface `sync from voxels` now clamp the surface nodes
* Added `Voxel Display` controller to toggle volume display modes
* Changed shortcut `l` from `Voxel Type` to `Voxel Display`
* Volume `fragmentShader` uses non-linear function to calculate fragment colors combined with face normal; this will create smoother results
* `DataCube2` geometry uses `ConvexHull` instead of box/sphere to improve the performance
* `DataCube2` are no longer hidden when `sync from voxels` is on: users can use shortcuts `l` and `k` to easily control the visibility.
* `download_template_subject` can download other templates such as `fsaverage`, `cvs_avg35`, `bert`.

## Bug fixes

* Fixed a volume rendering issue where ray-marching directions are not calculated correctly
* Fixed color not set correctly when changing `Voxel Labels` while surface colors are `sync from voxels`
 

threeBrain 0.2.4
=======

This version mainly works on the electrode localization. Most changes occur in the `JavaScript` engine. 

## Changes

* Allows electrodes to be reset
* Displays electrode labels along with the electrodes
* Allows resizing electrode size on the fly
* Allows resizing the electrode labels
* Localization module has been integrated into `RAVE`
* Added line mesh to mark the distance of the electrode deviating from its original position. The line color changes with the distance value.

### Improvements

* Improved localization precision
* Auto-adjusting electrodes now respects the topology
* Electrodes in the localization mode now have `LocElectrode` class
* Volume rendering and ray-casters now respects the transform matrices

threeBrain 0.2.3
=======

## Changes

* Electrode localization now has a `shiny` application

### Improvements

* Added 3 vignettes

threeBrain 0.2.2
=======

## Changes

* Supported video content to display auditory visual stimuli along the response
* Default to closing the `default` and `volume` side folders

### Improvements

* Fixed electrode localization interpolation issue
* Proper dispose the localized electrodes
* Fixed screenshot and video recording functions
* Renamed recording button to `Chrome`-specific


threeBrain 0.2.1
=======

## Changes

* Finally, electrode localization is added!
* Added `TextTexture` in the internal code to display text `Sprite` easily
* Can download electrodes as `csv`

threeBrain 0.2.0
=======

## Changes

* More efficient volume rendering with transparency
* Added shader functions to surface instances, allowing color rendering from volume, electrodes, or vertices (major change)
* Added color-map generator for surface and volume data
* Added method to generate data cube (volume) from `MNI305` coordinates
* Optimized loading procedure
* Removed `crayon`, `base64enc`, `htmltools`, `pryr` from dependence

### Improvements

* Bumped `threejs` version to `v131dev`
* Fixed surface transparency losing fragments issue
* Added loaders to shiny applications to avoid performance issues on old computers
* Fixed electrodes not selected on mouse click-down (on `Firefox`)

threeBrain 0.1.9
=======

## Changes

* Added backend engine for volume rendering to show atlas files
* Standalone viewers now use native system tools for `Mac` and `Linux` (On `Windows`, it still needs `R` to be installed)

### Improvements

* Allows super slow play speed to show animations in millisecond level
* Bumped `threejs` to a newer version and fixed compatibility issues
* Animation time range is more reasonable

threeBrain 0.1.8
=======

## Changes

* Screenshot now downloads `pdf` format

### Improvements

* Fixed `freesurferformats` face index starting from 1 instead of 0

threeBrain 0.1.7
=======

## Changes

* Now displays `MNI305` coordinates instead of `tkRAS` coordinates
* Removed `reticulate` and related functions to support native R functions

### Improvements

* Fixed `MNI305` calculation issues
* Internally calculates anterior commissure


threeBrain 0.1.6
=======

## Changes

* Implemented `view_ct_t1` to view `CT` aligned to `T1` images 
* Updated document on how to generate `FreeSurfer` brain
* Removed dependency to `nibabel` and use native R packages
* Re-designed legends, added options to show, hide display information
* Added screenshot to download as image

### Improvements

* Added hints for keyboard shortcuts

threeBrain 0.1.5
=======

## Changes

* Import `FreeSurfer`  and `SUMA` files `sulc`
* Control element update
* Added `brain_proxy` to control in shiny element
* Separated display and threshold data
* `FreeMesh` material can be switched between `MeshPhongMaterial` and `MeshLambertMaterial`

### Improvements

* UI will blur focus when clicking on canvas
* Allow customizing widgets `background`, `cex` (font magnification), `timestamp` (display time)
* Allow `controllers` (list) to override control UI
* Added preset `syncviewers` (`threejs_brain(control_presets = ...)`) to synchronize multiple viewers in shiny environment

threeBrain 0.1.4
=======

## Changes

* Implemented a new mesh type - volume rendering using ray marching
* Added alternative methods to read `.nii` files, `nibabel` is now optional
* Customized color palettes and value range for better visualizations with outliers
* Only requires `T1.mgz` or `brainmask` of `brain.finalsurf` is not found. This allows users only run `FreeSurfer` to the first stage, which only takes around 8 to 10 minutes instead of 6 hours.
* Fully compatible with `htmlwidgets` in `shiny` mode. When calling `threejsBrainOutput` under `shiny::renderUI`, the `DOM` element might get reset by `shiny`, causing a new 3D viewer created. This might consume more resource, causing memory leaks and even conflict context renderings. Also event listeners couldn't reset correctly. A cache is created and now is reusing the canvas.


### Improvements

* More flexible directory requirement
* Added dispose function to canvas so that memory gets cleared correctly
* Renderer optimization and memory optimization

### Bug Fixes

* Fixed keyboard listeners locking the keys
* Fixed huge memory leaks due to `threejs` not garbage collecting geometries and textures


threeBrain 0.1.3
=======

## Changes

* File structure change: now directly read in from `FreeSurfer` folder
* Added readers for `.mgz`, `.m3z` files
* Added coordinate system to align volume with surface data
* Implemented side-viewers, added three side cameras at XYZ axis
* Can now read, export electrodes as csv file
* Re-write brain generating function
* Can display/switch multiple value types 
* Added transparency to surfaces
* Implemented experimental electrode localization
* Automatically determine color type (continuous or discrete) and value range

### Improvements

* Shortcuts available at [here](https://github.com/dipterix/threeBrain/blob/master/shortcuts.md)
* Optimized electrode value settings

threeBrain 0.1.2
=======

## Changes

* Re-draw canvas on a 2D context to make customized overlay directly on canvas.
* Implemented continuous and discrete legends to replace D3.
* Added support to set main camera position and initial zoom level.
* Added 3D scatter plot and examples.
* Use hybrid render mode when animation not required to save battery usage.
* Improved color palette calculation.
* Support customized title.

### Improvements

* Support customized datapath when saving widgets.
* Added instructions on how to embed widgets into websites without R.

threeBrain 0.1.1
=======

* Implemented three types of geometries: plane, sphere and free. A free geometry
takes arbitrary geometry vertices and faces to form a 3D mesh object.
* Added animation to sphere object.
* Replaced old JavaScript with npx driven modules.
* Implemented D3 side-widget

threeBrain 0.1.0
=======

* Initial private beta release!
