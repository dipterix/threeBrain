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
