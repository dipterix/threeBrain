## ---- AdTech electrodes ------------------------------------------------------
# Spec file: https://www.severnhealthcare.com/images/documents/ad-tech/AD-TECHCatalogue-2015.pdf

# ---- sEEG-AdTech-SD??R-SP05X-000 ---------------------------------------------

probe_head <- 2
width <- 2.41
contact_spacing <- 5
overall_length <- 400
diameter <- 1.12

for ( n_contacts in c(4, 6, 8, 10, 12) ) {
  contacts <- probe_head + width / 2 + 0:(n_contacts - 1) * contact_spacing
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

for ( n_contacts in c(4, 6, 8, 10) ) {
  contacts <- probe_head + width / 2 + 0:(n_contacts - 1) * contact_spacing
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

for ( n_contacts in c(4, 6, 8) ) {
  contacts <- probe_head + width / 2 + 0:(n_contacts - 1) * contact_spacing
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

# ---- sEEG-AdTech-SD16R-AP0?X-000 ---------------------------------------------

probe_head <- 0.68
width <- 1.32
contact_spacing <- 2
overall_length <- 400
diameter <- 1.1
n_contacts <- 16

for ( contact_spacing in c(2, 3) ) {
  contacts <- probe_head + width / 2 + 0:(n_contacts - 1) * contact_spacing
  proto <- seeg_prototype(
    type = sprintf("sEEG-AdTech-SD%02dR-AP%02dX-000", n_contacts, contact_spacing),
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

mat <- cbind(c(6, 8, 8, 10, 10, 10, 10, 10, 10, 12, 14, 16, 16),
             c(5, 4, 5, 3,  4,  5,  6,  7,  8,   5,  5, 5, 3))

invisible(apply(mat, 1L, function(x) {
  n_contacts <- x[[1]]
  contact_spacing <- x[[2]]
  contacts <- probe_head + width / 2 + 0:(n_contacts - 1) * contact_spacing
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
  proto$save_as_default(force = TRUE)
}))

# ---- sEEG-AdTech-RD16R-SP47/8/9X-000 ---------------------------------------------

probe_head <- 2
width <- 2.29
overall_length <- 300
diameter <- 0.86

n_contacts <- 16

# SP47X
contacts <- probe_head + width / 2 + c(0:3 * 3, 3*3 + 1:12 * 5)
contact_spacing <- table(round(diff(contacts)))
contact_spacing <- paste(sprintf("%sx%d", names(contact_spacing), contact_spacing), collapse = ",")

overall_length <- ceiling(max(contacts) + width / 2 + 0.05)

proto <- seeg_prototype(
  type = "sEEG-AdTech-RD16R-SP47X-000",
  description = c(
    sprintf("AdTech sEEG - %d contacts", n_contacts),
    sprintf("Contact length   : %.2f mm", width),
    sprintf("Central spacing  : 3x 3 mm, then 12x 5 mm"),
    sprintf("Tip size         : %.2f mm", probe_head),
    sprintf("Diameter         : %.2f mm", diameter)
  ),
  center_position = contacts,
  contact_widths = width,
  diameter = diameter,
  overall_length = overall_length,
  default_interpolation = contact_spacing,
  overwrite = TRUE
)


# SP48X
contacts <- probe_head + width / 2 + c(0:5 * 3, 5*3 + 1:10 * 5)
# 16, 67
c(length(contacts), max(contacts) - min(contacts) + width)
contact_spacing <- table(round(diff(contacts)))
contact_spacing <- paste(sprintf("%sx%d", names(contact_spacing), contact_spacing), collapse = ",")

overall_length <- ceiling(max(contacts) + width / 2 + 0.05)

proto <- seeg_prototype(
  type = "sEEG-AdTech-RD16R-SP48X-000",
  description = c(
    sprintf("AdTech sEEG - %d contacts", n_contacts),
    sprintf("Contact length   : %.2f mm", width),
    sprintf("Central spacing  : 5x 3 mm, then 10x 5 mm"),
    sprintf("Tip size         : %.2f mm", probe_head),
    sprintf("Diameter         : %.2f mm", diameter)
  ),
  center_position = contacts,
  contact_widths = width,
  diameter = diameter,
  overall_length = overall_length,
  default_interpolation = contact_spacing,
  overwrite = TRUE
)
invisible(proto$get_texture(1:16, plot = TRUE))


# SP49X
contacts <- probe_head + width / 2 + c(0:7 * 3, 7*3 + 1:8 * 5)
# 16, 63
c(length(contacts), max(contacts) - min(contacts) + width)
contact_spacing <- table(round(diff(contacts)))
contact_spacing <- paste(sprintf("%sx%d", names(contact_spacing), contact_spacing), collapse = ",")

overall_length <- ceiling(max(contacts) + width / 2 + 0.05)

proto <- seeg_prototype(
  type = "sEEG-AdTech-RD16R-SP49X-000",
  description = c(
    sprintf("AdTech sEEG - %d contacts", n_contacts),
    sprintf("Contact length   : %.2f mm", width),
    sprintf("Central spacing  : 7x 3 mm, then 8x 5 mm"),
    sprintf("Tip size         : %.2f mm", probe_head),
    sprintf("Diameter         : %.2f mm", diameter)
  ),
  center_position = contacts,
  contact_widths = width,
  diameter = diameter,
  overall_length = overall_length,
  default_interpolation = contact_spacing,
  overwrite = TRUE
)
invisible(proto$get_texture(1:16, plot = TRUE))


