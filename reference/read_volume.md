# Read volume file in `'MGH'` or `'Nifti'` formats

Read volume file in `'MGH'` or `'Nifti'` formats

## Usage

``` r
read_volume(file, format = c("auto", "mgh", "nii"), header_only = FALSE)
```

## Arguments

- file:

  file path

- format:

  the file format

- header_only:

  whether only read headers; default is false

## Value

A list of volume data and transform matrices; if `header_only=TRUE`,
then volume data will be substituted by the header.
