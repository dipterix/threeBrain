
# ---- sEEG-DIXI-MM08-09A33D08 -------------------------------------------------

# Brand: DIXI
# Product ID: MM08-09A33D08
# Type: sEEG
# Description: xxxxx (omit)
# Tip size (distance to the edge of the first contact): 0
# Contact center locations (tip is 0) in mm: 1.00, 4.90, 8.80, 12.70, 16.60, 20.50, 24.40, 28.30, 32.20
# Contact widths: 2.0
# Diameters: 0.8 mm
proto = threeBrain::seeg_prototype(
  type = "sEEG-DIXI-MM08-09A33D08",
  description = c(
    "DIXI sEEG - 9 macro, 8 micro contacts",
    "Contact length   : 2   mm",
    "Central spacing  : 3.9 mm",
    "Tip size         : 0   mm",
    "Diameter         : 0.8 mm"
  ),
  center_position = c(1.00, 4.90, 8.80, 12.70, 16.60, 20.50, 24.40, 28.30, 32.20),
  contact_widths = 2,
  diameter = 0.8,
  overall_length = 34,  # slighly greater than max recording len: 33.20 mm
  default_interpolation = "3.9x8", # 3.9 mm x 8 spacing (1-2, 2-3, ... 8-9)
  overwrite = TRUE
)
invisible(proto$get_texture(letters))
proto$preview_3d()

# ---- sEEG-DIXI-MM08-09A40D08 -------------------------------------------------

# Brand: DIXI
# Product ID: MM08-09A40D08
# Type: sEEG
# Description: xxxxx (omit)
# Tip size (distance to the edge of the first contact): 0
# Contact center locations (tip is 0) in mm: 1.00, 5.80, 10.60, 15.40, 20.20, 25.00, 29.80, 34.60, 39.40
# Contact widths: 2.0
# Diameters: 0.8 mm
proto = threeBrain::seeg_prototype(
  type = "sEEG-DIXI-MM08-09A40D08",
  description = c(
    "DIXI sEEG - 9 macro, 8 micro contacts",
    "Contact length   : 2   mm",
    "Central spacing  : 4.8 mm",
    "Tip size         : 0   mm",
    "Diameter         : 0.8 mm"
  ),
  center_position = c(1.00, 5.80, 10.60, 15.40, 20.20, 25.00, 29.80, 34.60, 39.40),
  contact_widths = 2,
  diameter = 0.8,
  overall_length = 41,
  default_interpolation = "4.8x8",
  overwrite = TRUE
)
invisible(proto$get_texture(letters))
proto$preview_3d()

# ---- sEEG-DIXI-MM08-09A51D08 -------------------------------------------------
# Brand: DIXI
# Product ID: MM08-09A51D08
# Type: sEEG
# Description: xxxxx (omit)
# Tip size (distance to the edge of the first contact): 0
# Contact center locations (tip is 0) in mm: 1.00, 7.10, 13.20, 19.30, 25.40, 31.50, 37.60, 43.70, 49.80
# Contact widths: 2.0
# Diameters: 0.8 mm
proto = threeBrain::seeg_prototype(
  type = "sEEG-DIXI-MM08-09A51D08",
  description = c(
    "DIXI sEEG - 9 macro, 8 micro contacts",
    "Contact length   : 2   mm",
    "Central spacing  : 6.1 mm",
    "Tip size         : 0   mm",
    "Diameter         : 0.8 mm"
  ),
  center_position = c(1.00, 7.10, 13.20, 19.30, 25.40, 31.50, 37.60, 43.70, 49.80),
  contact_widths = 2,
  diameter = 0.8,
  overall_length = 51,
  default_interpolation = "6.1x8",
  overwrite = TRUE
)
invisible(proto$get_texture(letters))
proto$preview_3d()


# ---- sEEG-DIXI-MM08-06B33D12 -------------------------------------------------
# Brand: DIXI
# Product ID: MM08-06B33D12
# Type: sEEG
# Contact center locations (tip is 0) in mm: 1.00, 5.00, 9.00, 25.00, 29.00, 33.00
# Contact widths: 2.0
# Recording length: N/A
# ***NOTE: The electrode MM08-06B33D12 has only 6 active contacts, but there are 3 disconnected contacts that show up on the CT but are non-recording/non-functional (a total of 9 contacts visible on imaging). Hence, the contact center locations above reflect only the active contacts.***
# Diameters: 0.8 mm
proto = threeBrain::seeg_prototype(
  type = "sEEG-DIXI-MM08-06B33D12",
  description = c(
    "DIXI sEEG - 6 (2x3) macro, 12 micro contacts",
    "Contact length   : 2   mm",
    "Central spacing  : 2x4 mm, then 16 mm",  # two spacings of 2mm, then 14mm leap
    "Tip size         : 0   mm",
    "Diameter         : 0.8 mm"
  ),
  center_position = c(1.00, 5.00, 9.00, 25.00, 29.00, 33.00),
  contact_widths = 2,
  diameter = 0.8,
  overall_length = 35,
  default_interpolation = "4x2,16x1,4x2", # interpolation
  overwrite = TRUE
)
invisible(proto$get_texture(letters))
proto$preview_3d()


# ---- sEEG-DIXI-MM08-06B40D12 -------------------------------------------------
# Brand: DIXI
# Product ID: MM08-06B40D12
# Type: sEEG
# Description: xxxxx (omit)
# Tip size (distance to the edge of the first contact): 0
# Contact center locations (tip is 0) in mm: 1.00, 5.00, 9.00, 33.00, 37.00, 41.00,
# Contact widths: 2.0
# Recording length: N/A
# ***NOTE: The electrode MM08-06B40D12 has only 6 active contacts, but there are 5 disconnected contacts that show up on the CT but are non-recording/non-functional (a total of 11 contacts visible on imaging). Hence, the contact center locations above reflect only the active contacts.***
# Diameters: 0.8 mm
proto = threeBrain::seeg_prototype(
  type = "sEEG-DIXI-MM08-06B40D12",
  description = c(
    "DIXI sEEG - 6 (2x3) macro, 12 micro contacts",
    "Contact length   : 2   mm",
    "Central spacing  : 2x4 mm, then 24 mm",  # two spacings of 2mm, then 24mm leap (or 22mm edge-to-edge)
    "Tip size         : 0   mm",
    "Diameter         : 0.8 mm"
  ),
  center_position = c(1.00, 5.00, 9.00, 33.00, 37.00, 41.00),
  contact_widths = 2,
  diameter = 0.8,
  overall_length = 43,
  default_interpolation = "4x2,24x1,4x2",
  overwrite = TRUE
)
invisible(proto$get_texture(letters))
proto$preview_3d()


# ---- sEEG-DIXI-MM08-06B51D12 -------------------------------------------------
# Brand: DIXI
# Product ID: MM08-06B51D12
# Type: sEEG
# Description: xxxxx (omit)
# Tip size (distance to the edge of the first contact): 0
# Contact center locations (tip is 0) in mm: 1.00, 5.00, 9.00, 41.00, 45.00, 49.00
# Contact widths: 2.0
# Recording length: N/A
# ***NOTE: The electrode MM08-06B33D12 has only 6 active contacts, but there are 7 disconnected contacts that show up on the CT but are non-recording/non-functional (a total of 13 contacts visible on imaging). Hence, the contact center locations above reflect only the active contacts.***
# Diameters: 0.8 mm
proto = threeBrain::seeg_prototype(
  type = "sEEG-DIXI-MM08-06B51D12",
  description = c(
    "DIXI sEEG - 6 (2x3) macro, 12 micro contacts",
    "Contact length   : 2   mm",
    "Central spacing  : 2x4 mm, then 32 mm",  # two spacings of 2mm, then 32mm leap (or 20mm edge-to-edge)
    "Tip size         : 0   mm",
    "Diameter         : 0.8 mm"
  ),
  center_position = c(1.00, 5.00, 9.00, 41.00, 45.00, 49.00),
  contact_widths = 2,
  diameter = 0.8,
  overall_length = 51,
  default_interpolation = "4x2,32x1,4x2",
  overwrite = TRUE
)
invisible(proto$get_texture(letters))
proto$preview_3d()

paths = threeBrain::list_electrode_prototypes()
paths[["SEEG-DIXI-MM08-06B51D12"]]
