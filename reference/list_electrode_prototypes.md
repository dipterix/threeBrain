# List or load all electrode prototypes

List all built-in and user-customized electrode prototypes. User paths
will be searched first, if multiple prototype configuration files are
found for the same type.

## Usage

``` r
list_electrode_prototypes()

load_prototype(type)
```

## Arguments

- type:

  electrode type, character

## Value

`list_electrode_prototypes` returns a named list, names are the
prototype types and values are the prototype configuration paths;
`load_prototype` returns the prototype instance if `type` exists, or
throw an error.

## Examples

``` r
availables <- list_electrode_prototypes()
if( "sEEG-16" %in% names(availables) ) {
  proto <- load_prototype( "sEEG-16" )

  print(proto, details = FALSE)
}



```
