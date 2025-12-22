# Default Directory to Store Template Brain

Default Directory to Store Template Brain

## Usage

``` r
default_template_directory(check = FALSE)
```

## Arguments

- check:

  logical, check if the folder is missing, is so, create one. This
  option ensures the folder is always created.

## Value

A directory path where template brain is stored at; see also
[`download_N27`](https://dipterix.org/threeBrain/reference/template_subject.md)

## Details

When `threeBrain.template_dir` is not set or invalid, the function
checks 'RAVE' (R Analysis and Visualization for 'iEEG',
<https://rave.wiki>) folder at home directory. If this folder is
missing, then returns results from `R_user_dir('threeBrain', 'data')`.
To override the default behavior, use
`options(threeBrain.template_dir=...)`.

## Examples

``` r
default_template_directory()
#> [1] "/home/runner/.local/share/R/threeBrain/templates"
```
