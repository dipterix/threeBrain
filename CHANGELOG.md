## Changes since last CRAN release
* `2ea07114 (HEAD -> master)` [_`dipterix`_]: Fixed drag and drop color key length issue
* `2d525370 (origin/master, origin/HEAD)` [_`dipterix`_]: Added radiographic view
* `43ee4c15` [_`dipterix`_]: Use `KDTree` to query the stream-lines that intersect the target volume
* `4f28d734` [_`dipterix`_]: Updated `BlueRed` color palette to match with the `ravebuiltins` color
* `24b00b58` [_`dipterix`_]: Removed obsolete `freesurfer_brain` and embrace the new universal interface `threeBrain`; added `render` method for template brain; `mereg_brain` also gains new argument `electrode_priority` to control the priority when setting electrode shape
* `f35f6d98` [_`dipterix`_]: Drag and drop is handled by file-system `API` or `Webkit` before fallback to naive approaches; Added support for `tt` format; streamline colors are fixed; using new shaders for streamline; better fallback for workers who don't get new job spawned; Worker spawn is throttled; Added pseudo random generator; Streamlines have better memory management, with random shuffle; In highlight mode faded streamline widths can be adjusted; Added global ruler next to compass
* `e0355547` [_`dipterix`_]: Added try-catch to handle file processing errors to avoid stopping processing files
* `e5c88b9b` [_`dipterix`_]: Drag & drop file now generates consistent default colors and ignores the left-right keywords
* `80a90588` [_`dipterix`_]: Fixed drag and drop multiple files issue
* `7bf5c2ce` [_`dipterix`_]: Drag drop supports folders now
* `4a7aa43c` [_`dipterix`_]: Fixed https://github.com/rave-ieeg/rave-pipelines/issues/49; Added support for streamline
* `cc9ba41f` [_`dipterix`_]: Added support for `MXene` electrodes
* `510f3f8c` [_`dipterix`_]: Added Adtech-RD series
* `da5ff210` [_`dipterix`_]: Added interpolate without refine
* `2799e04f` [_`dipterix`_]: native annotation from template supports FreeSurfer `curv` file too
* `6048bf01` [_`dipterix`_]: Surface mapping is more robust even if the hemisphere is unset: using `MNI152` R-axis to infer the hemisphere instead
* `80c16686` [_`dipterix`_]: Added release tag