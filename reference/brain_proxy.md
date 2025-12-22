# Shiny Proxy for Viewer

Shiny Proxy for Viewer

## Usage

``` r
brain_proxy(outputId, session = shiny::getDefaultReactiveDomain())
```

## Arguments

- outputId:

  shiny output ID

- session:

  shiny session, default is current session (see
  [`domains`](https://rdrr.io/pkg/shiny/man/domains.html))

## Value

`R6` class `ViewerProxy`
