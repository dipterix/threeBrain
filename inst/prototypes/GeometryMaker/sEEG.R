
# DIPSAUS DEBUG START
# idx <- seq_len(proto$n_channels)
# pal <- threeBrain:::DEFAULT_COLOR_DISCRETE
# invisible(proto$get_texture(as.character(idx), plot = TRUE))
# legend("right", legend = sprintf("ch%d", idx), bty = "n", cex = 0.7,
#        fill = pal)

## ---- AdTech electrodes ------------------------------------------------------
# Spec file: https://www.severnhealthcare.com/images/documents/ad-tech/AD-TECHCatalogue-2015.pdf

# ---- sEEG-AdTech-SD??R-SP05X-000 ---------------------------------------------

probe_head <- 2
width <- 2.41
contact_spacing <- 5
overall_length <- 400
diameter <- 1.12

for( n_contacts in c(4, 6, 8, 10, 12) ) {
  contacts <- probe_head + width / 2 + 0:(n_contacts-1) * contact_spacing
  overall_length <- ceiling(max(contacts) + width / 2 + 0.05)
  proto <- seeg_prototype(
    type = sprintf("sEEG-AdTech-SD%02dR-SP05X-000", n_contacts),
    description = c(
      sprintf("AdTech sEEG - %d contacts", n_contacts),
      "Contact length   : 2.41 mm",
      "Central spacing  : 5    mm",
      "Tip size         : 2    mm",
      "Diameter         : 1.12 mm"
    ),
    center_position = contacts,
    contact_widths = width,
    diameter = diameter,
    overall_length = overall_length,
    default_interpolation = sprintf("%.1fx%d", contact_spacing, n_contacts - 1L),
    overwrite = TRUE
  )
}

# ---- sEEG-AdTech-SD??R-SP10X-000 ---------------------------------------------

probe_head <- 2
width <- 2.41
contact_spacing <- 10
overall_length <- 400
diameter <- 1.12

for( n_contacts in c(4, 6, 8, 10) ) {
  contacts <- probe_head + width / 2 + 0:(n_contacts-1) * contact_spacing
  overall_length <- ceiling(max(contacts) + width / 2 + 0.05)
  proto <- seeg_prototype(
    type = sprintf("sEEG-AdTech-SD%02dR-SP10X-000", n_contacts),
    description = c(
      sprintf("AdTech sEEG - %d contacts", n_contacts),
      "Contact length   : 2.41 mm",
      "Central spacing  : 10   mm",
      "Tip size         : 2    mm",
      "Diameter         : 1.12 mm"
    ),
    center_position = contacts,
    contact_widths = width,
    diameter = diameter,
    overall_length = overall_length,
    default_interpolation = sprintf("%.1fx%d", contact_spacing, n_contacts - 1L),
    overwrite = TRUE
  )
}

# ---- sEEG-AdTech-SD??R-AP58X-000 ---------------------------------------------

probe_head <- 2
width <- 1.32
contact_spacing <- 2.2
overall_length <- 300
diameter <- 1.12

for( n_contacts in c(4, 6, 8) ) {
  contacts <- probe_head + width / 2 + 0:(n_contacts-1) * contact_spacing
  overall_length <- ceiling(max(contacts) + width / 2 + 0.05)
  proto <- seeg_prototype(
    type = sprintf("sEEG-AdTech-SD%02dR-AP58X-000", n_contacts),
    description = c(
      sprintf("AdTech sEEG - %d contacts", n_contacts),
      sprintf("Contact length   : %.2f mm", width),
      sprintf("Central spacing  : %.2f mm", contact_spacing),
      sprintf("Tip size         : %.2f mm", probe_head),
      sprintf("Diameter         : %.2f mm", diameter)
    ),
    center_position = contacts,
    contact_widths = width,
    diameter = diameter,
    overall_length = overall_length,
    default_interpolation = sprintf("%.1fx%d", contact_spacing, n_contacts - 1L),
    overwrite = TRUE
  )
}

# ---- sEEG-AdTech-RD??R-SP??X-000 ---------------------------------------------

probe_head <- 2
width <- 2.29
overall_length <- 300
diameter <- 0.86

mat <- cbind(6, 8, 8, 10, 10, 10, 10, 10, 10,
             5, 4, 5, 3,  4,  5,  6,  7,  8)

invisible(apply(mat, 1L, function(x) {
  n_contacts <- x[[1]]
  contact_spacing <- x[[2]]
  contacts <- probe_head + width / 2 + 0:(n_contacts-1) * contact_spacing
  overall_length <- ceiling(max(contacts) + width / 2 + 0.05)
  proto <- seeg_prototype(
    type = sprintf("sEEG-AdTech-RD%02dR-SP%02dX-000", n_contacts, contact_spacing),
    description = c(
      sprintf("AdTech sEEG - %d contacts", n_contacts),
      sprintf("Contact length   : %.2f mm", width),
      sprintf("Central spacing  : %.2f mm", contact_spacing),
      sprintf("Tip size         : %.2f mm", probe_head),
      sprintf("Diameter         : %.2f mm", diameter)
    ),
    center_position = contacts,
    contact_widths = width,
    diameter = diameter,
    overall_length = overall_length,
    default_interpolation = sprintf("%.1fx%d", contact_spacing, n_contacts - 1L),
    overwrite = TRUE
  )
}))


# ---- DIXI electrodes ---------------------------------------------------------
# Email: info@diximedical.com

# D08-**AT/AM/BM/CM are 0.8mm diameter electrodes

# ---- sEEG-DIXI-D08-??AM ------------------------------------------------------

# AM and AT electrodes are identical on spacing, the differences are the
# total lengths

probe_head <- 0
width <- 2
diameter <- 0.8

# Li + Lc
contact_spacing <- 1.5 + 2
for( n_contacts in c(5,8,10,12,15,18) ) {
  contacts <- probe_head + width / 2 + 0:(n_contacts-1) * contact_spacing
  overall_length <- ceiling(max(contacts) + width / 2 + 0.05)
  proto <- seeg_prototype(
    type = sprintf("sEEG-DIXI-D08-%02dAM", n_contacts),
    description = c(
      sprintf("DIXI sEEG - %d contacts", n_contacts),
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

# ---- sEEG-DIXI-D08-??BM ------------------------------------------------------

probe_head <- 0
width <- 2
diameter <- 0.8

# Li + Lc
contact_spacing <- 1.5 + 2
# Large spacing
lsi <- 7
for( n_contacts in c(15) ) {
  part_contacts <- n_contacts / 3
  part_positions <- 0:(part_contacts-1) * contact_spacing
  contacts <- probe_head + width / 2 + part_positions
  contacts <- c(contacts, max(contacts) + lsi + width + part_positions)
  contacts <- c(contacts, max(contacts) + lsi + width + part_positions)
  overall_length <- ceiling(max(contacts) + width / 2 + 0.05)
  proto <- seeg_prototype(
    type = sprintf("sEEG-DIXI-D08-%02dBM", n_contacts),
    description = c(
      sprintf("DIXI sEEG - %d (3x%d) contacts", n_contacts, part_contacts),
      "Contact length   : 2   mm",
      sprintf("Central spacing  : 4x3.5 mm, then %.1f mm", lsi + width),
      "Tip size         : 0   mm",
      "Diameter         : 0.8 mm"
    ),
    center_position = contacts,
    contact_widths = width,
    diameter = diameter,
    overall_length = overall_length,
    default_interpolation = sprintf(
      "%.1fx%d,%.0fx1,%.1fx%d,%.0fx1,%.1fx%d",
      contact_spacing, part_contacts - 1L, lsi + width,
      contact_spacing, part_contacts - 1L, lsi + width,
      contact_spacing, part_contacts - 1L
    ),
    overwrite = TRUE
  )
}


# ---- sEEG-DIXI-D08-??CM ------------------------------------------------------

probe_head <- 0
width <- 2
diameter <- 0.8

# Li + Lc
contact_spacing <- 1.5 + 2
# Large spacing
lsi <- 11
for( n_contacts in c(15, 18) ) {
  part_contacts <- n_contacts / 3
  part_positions <- 0:(part_contacts-1) * contact_spacing
  contacts <- probe_head + width / 2 + part_positions
  contacts <- c(contacts, max(contacts) + lsi + width + part_positions)
  contacts <- c(contacts, max(contacts) + lsi + width + part_positions)
  overall_length <- ceiling(max(contacts) + width / 2 + 0.05)
  proto <- seeg_prototype(
    type = sprintf("sEEG-DIXI-D08-%02dCM", n_contacts),
    description = c(
      sprintf("DIXI sEEG - %d (3x%d) contacts", n_contacts, part_contacts),
      "Contact length   : 2   mm",
      sprintf("Central spacing  : %dx3.5 mm, then %.1f mm", part_contacts-1, lsi + width),
      "Tip size         : 0   mm",
      "Diameter         : 0.8 mm"
    ),
    center_position = contacts,
    contact_widths = width,
    diameter = diameter,
    overall_length = overall_length,
    default_interpolation = sprintf(
      "%.1fx%d,%.0fx1,%.1fx%d,%.0fx1,%.1fx%d",
      contact_spacing, part_contacts - 1L, lsi + width,
      contact_spacing, part_contacts - 1L, lsi + width,
      contact_spacing, part_contacts - 1L
    ),
    overwrite = TRUE
  )
}

# ---- BostonScientific DBS-BSC-DB-2201 electrode ------------
probe_head <- 1.5 # Not sure about this one
width <- 1.5
contact_spacing <- 2
overall_length <- 450
diameter <- 1.3
n_contacts <- 8

contacts <- probe_head + width / 2 + 0:(n_contacts-1) * contact_spacing
# overall_length <- ceiling(max(contacts) + width / 2 + 0.05)

proto <- seeg_prototype(
  type = "DBS-BSC-DB-2201",
  description = c(
    "Boston Scientific DB-2201 (8 contacts)",
    "Contact length   : 1.5 mm",
    "Central spacing  : 2   mm",
    "Tip size         : 1.5 mm(*)",
    "Diameter         : 1.3 mm"
  ),
  center_position = contacts,
  contact_widths = width,
  diameter = diameter,
  overall_length = overall_length,
  default_interpolation = sprintf("%.1fx%d", contact_spacing, n_contacts - 1L),
  overwrite = TRUE
)

proto$model_rigid <- TRUE
proto$save_as_default(force = TRUE)
