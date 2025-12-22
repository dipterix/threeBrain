# Create `'sEEG'` shaft geometry prototype

Intended for creating/editing geometry prototype, please see
[`load_prototype`](https://dipterix.org/threeBrain/reference/list_electrode_prototypes.md)
to load existing prototype

## Usage

``` r
seeg_prototype(
  type,
  center_position,
  contact_widths,
  diameter = 1,
  channel_order = seq_along(center_position),
  fix_contact = 1,
  overall_length = 200,
  description = NULL,
  dry_run = FALSE,
  default_interpolation = NULL,
  viewer_options = NULL,
  behnke_fried = FALSE,
  overwrite = FALSE
)
```

## Arguments

- type:

  type string and unique identifier of the prototype

- center_position:

  numerical vector, contact center positions

- contact_widths:

  numerical vector or length of one, width or widths of the contacts

- diameter:

  probe diameter

- channel_order:

  the channel order of the contacts; default is a sequence along the
  number

- fix_contact:

  `NULL` or integer in `channel_order`, indicating which contact is the
  most important and should be fixed during the localization, default is
  `1` (inner-most target contact)

- overall_length:

  probe length, default is `200`

- description:

  prototype description

- dry_run:

  whether not to save the prototype configurations

- default_interpolation:

  default interpolation string for electrode localization

- viewer_options:

  list of viewer options; this should be a list of key-value pairs where
  the keys are the controller names and values are the corresponding
  values when users switch to localizing the electrode group

- behnke_fried:

  whether the electrode has micro-wires at the tip; default is false

- overwrite:

  whether to overwrite existing configuration file; default is false,
  which throws a warning when duplicated

## Value

A electrode shaft geometry prototype; the configuration file is saved to
'RAVE' 3rd-party repository.

## Examples

``` r
probe_head <- 2
n_contacts <- 12
width <- 2.41
contact_spacing <- 5
overall_length <- 400
diameter <- 1.12

contacts <- probe_head + width / 2 + 0:(n_contacts-1) * contact_spacing
proto <- seeg_prototype(
  type = "AdTech-sEEG-SD12R-SP05X-000",
  description = c(
    "AdTech sEEG - 12 contacts",
    "Contact length   : 2.41 mm",
    "Central spacing  : 5    mm",
    "Tip size         : 2    mm",
    "Diameter         : 1.12 mm"
  ),
  center_position = contacts,
  contact_widths = width,
  diameter = diameter,
  overall_length = overall_length,
  dry_run = TRUE
)

print(proto, details = FALSE)
#> <Electrode Geometry Prototype>
#>   Type        : ADTECH-SEEG-SD12R-SP05X-000
#>   Description : AdTech sEEG - 12 contacts
#>       Contact length   : 2.41 mm
#>       Central spacing  : 5    mm
#>       Tip size         : 2    mm
#>       Diameter         : 1.12 mm
#>   Channels    : 12
#>   Anchors     : 12 contacts, 0 non-contacts

```
