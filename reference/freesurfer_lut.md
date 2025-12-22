# Query the 'FreeSurfer' labels

Query the 'FreeSurfer' labels

## Usage

``` r
freesurfer_lut
```

## Format

An object of class `list` of length 3.

## Details

The 'FreeSurfer' atlases use
<https://surfer.nmr.mgh.harvard.edu/fswiki/FsTutorial/AnatomicalROI/FreeSurferColorLUT>
look-up table to query indexes. The 'threeBrain' electrode localization
also uses this table to export the `'FSLabel'` from electrode. If volume
type is set to `'aparc_aseg'`, then please also use this table to
filter.

## Examples

``` r
freesurfer_lut$from_key(0:10)
#>                              0                              1 
#>                      "Unknown"       "Left-Cerebral-Exterior" 
#>                              2                              3 
#>   "Left-Cerebral-White-Matter"         "Left-Cerebral-Cortex" 
#>                              4                              5 
#>       "Left-Lateral-Ventricle"            "Left-Inf-Lat-Vent" 
#>                              6                              7 
#>     "Left-Cerebellum-Exterior" "Left-Cerebellum-White-Matter" 
#>                              8                              9 
#>       "Left-Cerebellum-Cortex"                "Left-Thalamus" 
#>                             10 
#>        "Left-Thalamus-Proper*" 

freesurfer_lut$get_key("ctx-lh-supramarginal")
#> ctx-lh-supramarginal 
#>                 1031 
```
