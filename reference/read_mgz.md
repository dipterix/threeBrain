# Function to load \`FreeSurfer\` \`mgz/mgh\` file

The function \`read_mgz\` is a dynamic wrapper of Python \`nibabel\`
loader. If no Python is detected, it will switch to built-in function
\`read_fs_mgh_mgz\`, which has limited features.

## Usage

``` r
read_mgz(path)
```

## Format

An R function acting as safe wrapper for `nibabel.load`.

## Arguments

- path:

  \`mgz/mgh\` file path
