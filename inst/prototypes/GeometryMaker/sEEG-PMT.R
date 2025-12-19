# ---- sEEG-PMT-2102-??-SP350 ---------------------------------------------

# 8 contact - 26.5mm recording length 2mm contacts 3.5mm spacing and .8mm diameter
# 10 contact- 33.5mm recording length 2mm contacts 3.5mm spacing and .8mm diameter
# 12 contact- 40.5mm recording length 2mm contacts 3.5mm spacing and .8mm diameter
# 14 contact- 47.5mm recording length 2mm contacts 3.5mm spacing and .8mm diameter
# 16 contact- 56.5mm recording length 2mm contacts 3.5mm spacing and .8mm diameter

probe_head <- 0
width <- 2
contact_spacing <- 3.5
# overall_length <- probe_head + width + contact_spacing * (n_contacts-1)
diameter <- 0.8

for( n_contacts in c(8, 10, 12, 14, 16) ) {
  contacts <- probe_head + width / 2 + 0:(n_contacts-1) * contact_spacing
  overall_length <- ceiling(max(contacts) + width / 2 + 300)
  proto <- seeg_prototype(
    type = sprintf("sEEG-PMT-2102-%02d-SP350", n_contacts),
    description = c(
      sprintf("PMT sEEG - %d contacts", n_contacts),
      "Contact length   : 2   mm",
      "Central spacing  : 3.5 mm",
      "Tip size         : 0   mm",
      "Diameter         : 0.8 mm"
    ),
    center_position = contacts,
    contact_widths = width,
    diameter = diameter,
    overall_length = overall_length,
    default_interpolation = sprintf("%.1fx%d", contact_spacing, n_contacts - 1L),
    overwrite = TRUE
  )
}

# ---- sEEG-PMT-2102-16-SP??? ---------------------------------------------

# 16 contact- 61.5mm recording length 2mm contacts 3.97mm spacing and .8mm diameter
# 16 contact- 68.5mm recording length 2mm contacts 4.43mm spacing and .8mm diameter

probe_head <- 0
width <- 2
contact_spacing <- c(3.97, 4.43)
# overall_length <- probe_head + width + contact_spacing * (n_contacts-1)
diameter <- 0.8
n_contacts <- 16

for( spacing in contact_spacing ) {
  contacts <- probe_head + width / 2 + 0:(n_contacts-1) * spacing
  overall_length <- ceiling(max(contacts) + width / 2 + 300)
  proto <- seeg_prototype(
    type = sprintf("sEEG-PMT-2102-16-SP%.0f", spacing * 100),
    description = c(
      sprintf("PMT sEEG - %d contacts", n_contacts),
      "Contact length   : 2    mm",
      sprintf("Central spacing  : %.2f mm", spacing),
      "Tip size         : 0    mm",
      "Diameter         : 0.8  mm"
    ),
    center_position = contacts,
    contact_widths = width,
    diameter = diameter,
    overall_length = overall_length,
    default_interpolation = sprintf("%.2fx%d", spacing, n_contacts - 1L),
    overwrite = TRUE
  )
}

# ---- sEEG-PMT-2102-16-SP??? ---------------------------------------------
# Product ID: PMT 2102-16-099
# Type: sEEG
# Description: xxxxx (omit)
# Tip size (distance to the edge of the first contact): 0
# Contact center locations (tip is 0) in mm:
# 1.00, 4.50, 8.00, 11.50, 15.00, 18.50, 22.00, 25.50  54.75,
# 58.25, 61.75, 65.25, 68.75, 72.25, 75.75, 79.25
# Contact widths: 2.0
# Recording length: N/A
# ***NOTE: The electrode PMT 2102-08-099 shapes have a width along the probe of 2mm but the probe diameter is 0.8mm.***
#


probe_head <- 0
width <- 2
contact_spacings <- c(rep(3.5, 7), 29.25, rep(3.5, 7))
diameter <- 0.8

# contact center
contacts <- probe_head + width / 2 + c(0, cumsum(contact_spacings))
overall_length <- ceiling(max(contacts) + width / 2 + 0.05)

proto <- seeg_prototype(
  type = "sEEG-PMT-2102-16-099",
  description = c(
    sprintf("PMT sEEG - %d contacts", length(contacts)),
    "Contact length   : 2   mm",
    "Central spacing  : 3.5 mm x 7, then 29.25 mm",
    "Tip size         : 0   mm",
    "Diameter         : 0.8 mm"
  ),
  center_position = contacts,
  contact_widths = width,
  diameter = diameter,
  overall_length = overall_length,
  default_interpolation = "3.5x7,29.25x1,3.5x7",
  behnke_fried = TRUE,
  overwrite = TRUE
)

# file.rename("~/Library/Application Support/org.R-project.R/R/threeBrain/templates/prototypes/SEEG-PMT-2102-16-099.json", "inst/prototypes/SEEG-PMT-2102-16-099.json")

