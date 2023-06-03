# Update logs (for R-cran only)

## 2023-06-03
**Version 1.0.0 (current)**

Self check: 0 errors | 0 warnings | 0 notes

## 2023-01-31
**Version 0.2.9 (passed)**

## 2022-10-15
**Version 0.2.7 (passed)**

## 2022-08-24
**Version 0.2.6 (passed)**

## 2022-05-29
**Version 0.2.5 (passed)**

## 2021-12-02
**Version 0.2.4 (passed)**

Starting from this version, the package size will be greater than `5Mb`, which will trigger the check note. However, I can't reduce the size since most are from the `JavaScript` engine.

```
checking installed package size ... NOTE
  installed size is  5.3Mb
```

## 2021-10-13
**Version 0.2.3 (passed)**

## 2021-08-02
**Version 0.2.2 (passed)**

Skipped a version

## 2021-07-18
**Version 0.2.0 (passed)**

## 2021-01-09
**Version 0.1.9 (passed)**

## 2020-06-23
**Version 0.1.8 (passed)**

## 2020-05-12

**Version 0.1.7 (passed)**

## 2020-05-12

**Version 0.1.6 (passed)**

## 2020-03-12

**Version 0.1.6 (passed)**

## 2020-01-20

**Version 0.1.5 (passed)**

## 2019-10-18

**Version 0.1.4 (passed)**

## 2019-09-10

**Version 0.1.3 (passed)**

## 2019-06-27

**Version 0.1.2 (passed)**

## 2019-06-10

Version 0.1.2 

#### Rejected in manual screening

Reason:

```
Thanks, please replace \dontrun{} by \donttest{} or unwap the examples 
if they can be executed in less than 5 sec per Rd-file.

You have examples for unexported functions which cannot run in this way.
Please either add threeBrain::: to the function calls in the examples, 
omit these examples or export these functions.

Please fix and resubmit.
```

#### Solution:

* exported internal functions needed by exaples
* changed dontrun to donttest


## 2019-06-09

Version 0.1.2

Update JavaScript library, added scatter plot methods. Removed files in `inst/` 
that trigger warnings (like `installed.packages`). 

#### Rejected in pre-test

Reason:
```
Package has a VignetteBuilder field but no prebuilt vignette index.
```

#### Solution:

I removed old vignette causing this note. Removed VignetteBuilder field in 
DESCRIPTION.


## 2019-03-08

Version 0.1.0

* Passed cran check but rejected from manual checks

#### Rejected by `Swetlana Herbrandt`. 

Reason:

```
Thanks, please do not use installed.packages(). See help page of 
installed.packages():
"This can be slow when thousands of packages are installed, so do not 
use this to find out if a named package is installed (use system.file or 
find.package) nor to find out if a package is usable (call require and 
check the return value) nor to find details of a small number of 
packages (use packageDescription). It needs to read several files per 
installed package, which will be slow on Windows and on some 
network-mounted file systems."


Please do not change waning options (options(warn=-1)) in your functions.

Please add examples in your Rd-files.

Please fix and resubmit.
```

#### Check:

1. There's a file `AFNIio.R` in `inst/` folder that triggers these warnings. 
`threeBrain` doesn't need this file to function properly. 
However, it's not recommended to change the script due to compatibility issues. 
2. Also this file has lots of syntax mistakes. I plan to write my own afni readers 
in the later versions

#### Solution:

* `AFNIio.R` has been removed.
* Examples added to S3 functions `create_group`, `geom_freemesh` and `geom_sphere`. At current stage, not many geometry types are supported. Plan to add `plane` and `particle` system later on in the next big version, but these geometries are totally enough for iEEG/ECoG analysis.


## 2019-03-07

Version 0.1.0

* Self check has one note: `Possibly mis-spelled words in DESCRIPTION`
* Passed cran check but rejected by manual checks

#### Rejected by `Uwe Ligges`. 

Reason:

```
 The Description field should not start with the package name,
     'This package' or similar.

Please also single quote software names such as 'FreeSurfer'.
```

#### Solution:

Re-wrote DESCRIPTION, added single quotes to software names
