# Read \`FreeSurfer\` m3z file

Read \`FreeSurfer\` m3z file

## Usage

``` r
read_fs_m3z(filename)
```

## Arguments

- filename:

  file location, usually located at \`mri/transforms/talairach.m3z\`

## Value

registration data

## Details

An \`m3z\` file is a \`gzip\` binary file containing a dense vector
field that describes a 3D registration between two volumes/images. This
implementation follows the \`Matlab\` implementation from the
\`FreeSurfer\`. This function is released under the \`FreeSurfer\`
license:
<https://surfer.nmr.mgh.harvard.edu/fswiki/FreeSurferSoftwareLicense>.
