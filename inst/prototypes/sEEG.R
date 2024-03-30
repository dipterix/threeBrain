# Spec file: https://www.severnhealthcare.com/images/documents/ad-tech/AD-TECHCatalogue-2015.pdf

# DIPSAUS DEBUG START
# idx <- seq_len(proto$n_channels)
# pal <- threeBrain:::DEFAULT_COLOR_DISCRETE
# invisible(proto$get_texture(as.character(idx), plot = TRUE))
# legend("right", legend = sprintf("ch%d", idx), bty = "n", cex = 0.7,
#        fill = pal)


# ---- AdTech-sEEG-SD??R-SP05X-000 ---------------------------------------------

probe_head <- 2
width <- 2.41
contact_spacing <- 5
overall_length <- 400
diameter <- 1.12

for( n_contacts in c(4, 6, 8, 10, 12) ) {
  contacts <- probe_head + width / 2 + 0:(n_contacts-1) * contact_spacing
  proto <- seeg_prototype(
    type = sprintf("AdTech-sEEG-SD%02dR-SP05X-000", n_contacts),
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
    overall_length = overall_length
  )
}

# ---- AdTech-sEEG-SD??R-SP10X-000 ---------------------------------------------

probe_head <- 2
width <- 2.41
contact_spacing <- 10
overall_length <- 400
diameter <- 1.12

for( n_contacts in c(4, 6, 8, 10) ) {
  contacts <- probe_head + width / 2 + 0:(n_contacts-1) * contact_spacing
  proto <- seeg_prototype(
    type = sprintf("AdTech-sEEG-SD%02dR-SP10X-000", n_contacts),
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
    overall_length = overall_length
  )
}

# ---- AdTech-sEEG-SD??R-AP58X-000 ---------------------------------------------

probe_head <- 2
width <- 1.32
contact_spacing <- 2.2
overall_length <- 300
diameter <- 1.12

for( n_contacts in c(4, 6, 8) ) {
  contacts <- probe_head + width / 2 + 0:(n_contacts-1) * contact_spacing
  proto <- seeg_prototype(
    type = sprintf("AdTech-sEEG-SD%02dR-AP58X-000", n_contacts),
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
    overall_length = overall_length
  )
}

# ---- AdTech-sEEG-RD??R-SP??X-000 ---------------------------------------------

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
  proto <- seeg_prototype(
    type = sprintf("AdTech-sEEG-RD%02dR-SP%02dX-000", n_contacts, contact_spacing),
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
    overall_length = overall_length
  )
}))
