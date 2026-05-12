# Description Model 3387 Model 3389
# Connector Quadripolar, in-line Quadripolar, in-line
# Shape Straight Straight
# Conductor resistanceb <100 Ω <100 Ω
# Length 10 – 50 cm 10 – 50 cm
# Diameter 1.27 mm 1.27 mm
# Distal end
# Number of electrodes 4 4
# Electrode shape Cylindrical Cylindrical
# Electrode length 1.5 mm 1.5 mm
# Electrode spacing 1.5 mm 0.5 mm
# Electrode distance 10.5 mm 7.5 mm
# Distal tip distance 1.5 mm 1.5 mm
# Proximal end
# Lead contact length 2.3 mm 2.3 mm
# Lead contact spacing 4.3 mm 4.3 mm
# Lead contact distance 16.6 mm 16.6 mm
# Stylet handle length 40.1 mm 40.1 mm

# ---- sEEG-Medtronic-3387 ---------------------------------------------

probe_head <- 1.5
width <- 1.5
contact_spacing <- 3
diameter <- 1.27
n_contacts <- 4

contacts <- probe_head + width / 2 + 0:(n_contacts - 1) * contact_spacing
overall_length <- ceiling(max(contacts) + width / 2 + 0.05)
proto <- seeg_prototype(
  type = "DBS-Medtronic-3387",
  description = c(
    sprintf("Medtronic DBS - %d contacts", n_contacts),
    "Contact length   : 1.5  mm",
    "Central spacing  : 3    mm",
    "Tip size         : 1.5  mm",
    "Diameter         : 1.27 mm"
  ),
  center_position = contacts,
  contact_widths = width,
  diameter = diameter,
  overall_length = overall_length,
  default_interpolation = sprintf("%.1fx%d", contact_spacing, n_contacts - 1L),
  overwrite = TRUE
)
proto$validate()
a <- invisible(proto$get_texture(seq_len(proto$n_channels), plot = TRUE))
proto$preview_3d()

# ---- sEEG-Medtronic-3389 ---------------------------------------------

probe_head <- 1.5
width <- 1.5
contact_spacing <- 2
diameter <- 1.27
n_contacts <- 4

contacts <- probe_head + width / 2 + 0:(n_contacts - 1) * contact_spacing
overall_length <- ceiling(max(contacts) + width / 2 + 0.05)
proto <- seeg_prototype(
  type = "DBS-Medtronic-3389",
  description = c(
    sprintf("Medtronic DBS - %d contacts", n_contacts),
    "Contact length   : 1.5  mm",
    "Central spacing  : 2    mm",
    "Tip size         : 1.5  mm",
    "Diameter         : 1.27 mm"
  ),
  center_position = contacts,
  contact_widths = width,
  diameter = diameter,
  overall_length = overall_length,
  default_interpolation = sprintf("%.1fx%d", contact_spacing, n_contacts - 1L),
  overwrite = TRUE
)
proto$validate()
a <- invisible(proto$get_texture(seq_len(proto$n_channels), plot = TRUE))
proto$preview_3d()

