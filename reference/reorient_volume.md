# Function to reshape data to \`RAS\` order

Function to reshape data to \`RAS\` order

## Usage

``` r
reorient_volume(volume, Torig)
```

## Arguments

- volume, :

  3-mode tensor (voxels), usually from \`mgz\`, \`nii\`, or \`BRIK\`
  files

- Torig:

  a `4x4` transform matrix mapping volume (\`CRS\`) to \`RAS\`

## Value

Reshaped tensor with dimensions corresponding to \`R\`, \`A\`, and \`S\`
