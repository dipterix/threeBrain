# Function to check whether \`FreeSurfer\` folder has everything we need

Function to check whether \`FreeSurfer\` folder has everything we need

## Usage

``` r
check_freesurfer_path(
  fs_subject_folder,
  autoinstall_template = FALSE,
  return_path = FALSE,
  check_volume = FALSE,
  check_surface = FALSE
)
```

## Arguments

- fs_subject_folder:

  character, path to \`fs\` project directory or \`RAVE\` subject
  directory

- autoinstall_template:

  logical, whether \`N27\` brain should be installed if missing

- return_path:

  logical, whether to return \`FreeSurfer\` path

- check_volume:

  logical, whether to check volume data

- check_surface:

  logical, whether to check surface data (not implemented yet)

## Value

logical whether the directory is valid or, if `return_path` is true,
return \`FreeSurfer\` path
