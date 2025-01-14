## Changes since last CRAN release
* `1c373a4d (HEAD -> master, origin/master, origin/HEAD)` [_`dipterix`_]: Fixed subcortical ROI matrices
* `d15cdb6a` [_`dipterix`_]: Added surface coordinate for crosshair
* `6981b0e9` [_`dipterix`_]: Fixed get controller state function; added stage transition, allowing users to create animations from key states
* `c720b964` [_`dipterix`_]: Using "color" instead of separated `color` and `underlayColor` attributes for surface underlay
* `3e8e0784` [_`dipterix`_]: Supported visualizing surface annotations; surface colors are sync'ed to the electrode colors if the names are consistent; re-wrote the surface shader to support under- and over-lay colors
* `b09e94ea` [_`dipterix`_]: Updated `SurfaceShader` to use morph normal and transformed positions
* `3126093d` [_`dipterix`_]: Load other common surfaces by default
* `9096bdaf` [_`dipterix`_]: Switching subject surface types will trigger morph if the number of vertex nodes are the same
* `838bff7f` [_`dipterix`_]: Allow animation presets to be shown even when data is not available; added keyboard shortcut to sync data threshold with display; added hidden features that are experimental; `crosshair` position is changed to scanner`RAS` and `Affine MNI152`; added tooltip title support for controllers; added global clock for app; updated `ViewerCanvas` constructor arguments; supported `useMorphTarget` for surface objects
* `4bc77317` [_`dipterix`_]: Fixed electrode useMatrix when contacts are represented as spheres
* `fa452b72` [_`dipterix`_]: Fixed template mapping, supported non-linear mapping for electrode geometries