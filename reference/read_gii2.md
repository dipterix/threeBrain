# Function to load surface data from \`Gifti\` files

The function \`read_gii2\` is a dynamic wrapper of Python \`nibabel\`
loader. If no Python is detected, it will switch to \`gifti::readgii\`.

## Usage

``` r
read_gii2(path)
```

## Format

An R function acting as safe wrapper for `nibabel.load`.

## Arguments

- path:

  \`Gifti\` file path
