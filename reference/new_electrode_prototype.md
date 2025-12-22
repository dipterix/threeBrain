# Create or load new electrode prototype from existing configurations

Create or load new electrode prototype from existing configurations

## Usage

``` r
new_electrode_prototype(base_prototype, modifier = NULL)
```

## Arguments

- base_prototype:

  base prototype, this can be a string of prototype type (see
  [`list_electrode_prototypes`](https://dipterix.org/threeBrain/reference/list_electrode_prototypes.md)),
  path to the prototype configuration file, configuration in 'json'
  format, or an electrode prototype instance

- modifier:

  internally used

## Value

An electrode prototype instance

## Examples

``` r

available_prototypes <- list_electrode_prototypes()
if("Precision33x31" %in% names(available_prototypes)) {

  # Load by type name
  new_electrode_prototype("Precision33x31")

  # load by path
  path <- available_prototypes[["Precision33x31"]]
  new_electrode_prototype(path)

  # load by json string
  json <- readLines(path)
  new_electrode_prototype(json)

}


```
