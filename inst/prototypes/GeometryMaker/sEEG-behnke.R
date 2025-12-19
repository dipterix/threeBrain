# ---- BF12R-SP21X-0C3 ---------------------------------------------
# *BF12R-SP21X-0C3
# 12-contact
# macro portion	1-2: 3mm; 2+: 5.5mm 	60.57mm
# Contact 1 begins 1mm from the lumen tip;
# branched hub Wire-Bundle port;
# no need for slotted block
# New - Available Q2 2024


# BF12R-SP21X-0C3
# 12-contact macro portion
#     1-2: 3mm;
#     2+: 5.5mm 	60.57mm
# Contact 1 begins 1mm from the lumen tip;
# branched hub Wire-Bundle port; no need for slotted block
# contact width: 1.57mm???

probe_head <- 1
width <- 1.57
contact_spacings <- c(3, rep(5.5, 20))
diameter <- 1.28

# contact center
contacts <- probe_head + width / 2 + c(0, cumsum(contact_spacings))[seq_len(12)]
overall_length <- ceiling(max(contacts) + width / 2 + 0.05)

proto <- seeg_prototype(
  type = sprintf("sEEG-AdTech-BF12R-SP21X-0C3", length(contacts)),
  description = c(
    sprintf("AdTech Behnke Fried sEEG - %d contacts", length(contacts)),
    "Contact length   : 1.57 mm",
    "Central spacing  : 3 mm, then 5.5 mm",
    "Tip size         : 1    mm",
    "Diameter         : 1.28 mm"
  ),
  center_position = contacts,
  contact_widths = width,
  diameter = diameter,
  overall_length = overall_length,
  default_interpolation = "3x1,5.5x10",
  behnke_fried = TRUE,
  overwrite = TRUE
)

# BF09R-SP51X-0BB
# 9-contact macro portion	1-2: 3mm, 2+: 5mm	39.57mm
# Contact 1 begins 1mm from the lumen tip;
# additional non-functioning collar on tail (10-cable).
# Includes slotted block

probe_head <- 1
width <- 1.57
contact_spacings <- c(3, rep(5, 20))
diameter <- 1.28

# contact center
contacts <- probe_head + width / 2 + c(0, cumsum(contact_spacings))[seq_len(9)]
overall_length <- ceiling(max(contacts) + width / 2 + 0.05)

proto <- seeg_prototype(
  type = "sEEG-AdTech-BF09R-SP51X-0BB",
  description = c(
    sprintf("AdTech Behnke Fried sEEG - %d contacts", length(contacts)),
    "Contact length   : 1.57 mm",
    "Central spacing  : 3 mm, then 5 mm",
    "Tip size         : 1    mm",
    "Diameter         : 1.28 mm"
  ),
  center_position = contacts,
  contact_widths = width,
  diameter = diameter,
  overall_length = overall_length,
  default_interpolation = "3x1,5x7",
  behnke_fried = TRUE,
  overwrite = TRUE
)
