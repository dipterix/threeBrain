# ---- Neuropixels 2.0 NP2014 (4-shank, 1280 contacts/shank, 5120 total) -----
#
# Source of specs: SpikeGLX SGLXMetaToCoords.py (Janelia) and
#   neuropixels.org – NP2013/NP2014 is the actual 4-shank variant.
#   NP2004 is the single-shank Metal Cap probe (same silicon, different mount).
#
# geomList for np2_4s / NP2013 / NP2014:
#   [nShank=4, shankWidth=70, shankPitch=250,
#    even_xOff=27, odd_xOff=27, horizPitch=32, vertPitch=15,
#    rowsPerShank=640, elecPerShank=1280]
#   All offsets / pitches in micrometres.
#
# Geometry (model space, all in mm):
#   +Z : tip (z=0) → connector/entry (z = overall_length)
#   +X : lateral spread of the 4 shanks
#   +Y : front face of the probe (recording side)
#
# Physical shank dimensions (silicon only):
#   - Width     : 70 µm  = 0.070 mm
#   - Length    : 640 rows × 15 µm = 9.60 mm  → 10 mm total with tip taper
#   - Thickness : ~24 µm – rendered as 0.024 mm (a thin box, not zero)
#
# Inter-shank pitch  : 250 µm = 0.250 mm  (centre-to-centre)
# Contacts per shank : 1280  (2 cols × 640 rows)
#   col A (even rows): x_off = 27 µm from shank left edge = 0.027 mm
#   col B (odd  rows): x_off = 27 µm (same → stagger is 0 → linear columns)
#   horiz pitch col A→B: 32 µm = 0.032 mm
#   vert  pitch       : 15 µm = 0.015 mm
#
# Proximal metal cap (rectangular cuboid, just above the shanks):
#   Width  : ~1.52 mm  (shank array ± 0.35 mm margin each side)
#   Height : 0.8 mm   (y/thickness – ±0.40 mm, clearly thicker than shanks)
#   Length : 12 mm    (z extent from silicon base upward)
#
# Silicon shanks end at z_base (10 mm); the cap starts there.
# A thin trajectory shaft (0.1 × 0.1 mm) extends from cap top to
# overall_length = 100 mm for cortical trajectory visualisation.
# ---------------------------------------------------------------------------

library(threeBrain)

# ---- Naming ----------------------------------------------------------------
# We name the prototype NP2014 (4-shank Metal Cap), which is the correct IMEC
# part number. The file was previously labelled NP2004 (single-shank) in error.
type        <- "Neuropixel-NP2014"
description <- paste(c(
  "Neuropixels 2.0 four-shank probe (NP2013 / NP2014, Metal Cap)",
  "Shanks              : 4",
  "Contacts / shank    : 1280 (2 cols x 640 rows)",
  "Total contacts      : 5120",
  "Vertical pitch      : 15 um",
  "Horizontal pitch    : 32 um",
  "Inter-shank pitch   : 250 um",
  "Shank width         : 70 um",
  "Shank thickness     : 24 um",
  "Shank length        : ~10 mm (9.6 mm contact region + tip taper)",
  "Proximal metal cap  : cuboid, 12 mm long, ~1.52 mm wide, 0.8 mm thick",
  "Visualization len.  : 100 mm (includes trajectory extension)"
), collapse = "\n      ")

# ---- Physical constants (all in mm) ----------------------------------------
n_shanks       <- 4L
n_rows         <- 640L
n_cols         <- 2L
n_per_shank    <- n_rows * n_cols        # 1280
n_channels     <- n_shanks * n_per_shank # 5120

shank_width    <- 0.070   # mm
shank_thick    <- 0.024   # mm (~24 µm)
shank_pitch    <- 0.250   # mm
v_pitch        <- 0.015   # mm  (row spacing)
h_pitch        <- 0.032   # mm  (column A → B spacing)
x_col_A        <- 0.027   # mm  from shank left edge, column A (even rows)
x_col_B        <- x_col_A + h_pitch  # 0.059 mm
z_tip          <- 0.0     # probe tip
z_contact_lo   <- 0.020   # first contact centre (above the tapered tip)
z_silicon_top  <- z_contact_lo + (n_rows - 1L) * v_pitch  # 9.605 mm
z_base         <- 10.0    # base of silicon shank (end of silicon)
overall_length <- 100.0   # full trajectory visualisation length

# Metal cap dimensions
cap_z_lo       <- z_base             # starts right at shank base
cap_z_hi       <- z_base + 12.0     # 12 mm long
half_tw        <- shank_thick / 2

# ---- Visualisation scale factors (not physical; for 3-D viewer legibility) ----
shank_vis_scale <- 3.0    # render each shank 3× wider/thicker so it is visible
# Contact sphere radius: 1.5× the visualised shank half-thickness so rendered
# spheres protrude through the shank face and are not hidden by the shank mesh.
contact_size    <- half_tw * shank_vis_scale * 1.5  # ≈ 0.054 mm

# Shank centre x positions (symmetric about 0)
shank_cx <- ((seq_len(n_shanks) - 1L) - (n_shanks - 1L) / 2) * shank_pitch
# -> -0.375, -0.125, +0.125, +0.375

# ---- Helper: build one closed rectangular-prism (box) mesh ----------------
# Returns list(position = 3×N, index = 3×M, uv = 2×N) in LOCAL coords.
# box_xyz_lo / hi are c(x,y,z) corners.  u_range = c(u0, u1) in texture.
box_mesh <- function(x0, x1, y0, y1, z0, z1, u_range = c(0, 1)) {
  # 24 unique vertices (4 per face, no sharing) so that computeVertexNormals()
  # in the JS renderer assigns each face a pure outward flat normal rather than
  # averaging across corner-sharing faces.
  # All quads are wound CCW when viewed from outside; triangles (0,1,2)+(0,2,3)
  # within each face's local 0-3 index give outward cross-product normals.
  #
  # Face vertex layouts (CCW from outside, verified by cross-product):
  #  -Z: (x0,y0,z0)→(x0,y1,z0)→(x1,y1,z0)→(x1,y0,z0)  N=(0,0,-1)
  #  +Z: (x0,y0,z1)→(x1,y0,z1)→(x1,y1,z1)→(x0,y1,z1)  N=(0,0,+1)
  #  -Y: (x0,y0,z0)→(x1,y0,z0)→(x1,y0,z1)→(x0,y0,z1)  N=(0,-1,0)
  #  +Y: (x0,y1,z0)→(x0,y1,z1)→(x1,y1,z1)→(x1,y1,z0)  N=(0,+1,0)
  #  -X: (x0,y0,z0)→(x0,y0,z1)→(x0,y1,z1)→(x0,y1,z0)  N=(-1,0,0)
  #  +X: (x1,y0,z0)→(x1,y1,z0)→(x1,y1,z1)→(x1,y0,z1)  N=(+1,0,0)
  u_w  <- u_range[[2]] - u_range[[1]]
  z_lo <- min(z0, z1)
  z_rng <- max(z0, z1) - z_lo
  uv_of <- function(x, z) {
    c(u_range[[1]] + (x - x0) / (x1 - x0 + 1e-9) * u_w,
      if (z_rng > 0) (z - z_lo) / z_rng else 0)
  }

  faces <- list(
    rbind(c(x0, y0, z0), c(x0, y1, z0), c(x1, y1, z0), c(x1, y0, z0)), # -Z
    rbind(c(x0, y0, z1), c(x1, y0, z1), c(x1, y1, z1), c(x0, y1, z1)), # +Z
    rbind(c(x0, y0, z0), c(x1, y0, z0), c(x1, y0, z1), c(x0, y0, z1)), # -Y
    rbind(c(x0, y1, z0), c(x0, y1, z1), c(x1, y1, z1), c(x1, y1, z0)), # +Y
    rbind(c(x0, y0, z0), c(x0, y0, z1), c(x0, y1, z1), c(x0, y1, z0)), # -X
    rbind(c(x1, y0, z0), c(x1, y1, z0), c(x1, y1, z1), c(x1, y0, z1))  # +X
  )
  pos <- do.call(cbind, lapply(faces, t))   # 3 × 24
  uv  <- do.call(cbind, lapply(faces, function(vm)  {
    # 2 × 24
    apply(vm, 1, function(v) {
      uv_of(v[[1]], v[[3]])
    })
  }))
  idx <- do.call(cbind, lapply(seq_len(6L), function(fi) {  # 3 × 12
    v0 <- (fi - 1L) * 4L
    cbind(c(v0, v0 + 1L, v0 + 2L), c(v0, v0 + 2L, v0 + 3L))
  }))
  list(position = pos, index = idx, uv = uv)
}

# ---- Helper: thin-slab (double-sided) shank mesh ---------------------------
# Builds a "thin box" shank with z-zones to allow texture UV variation.
# z_levels: increasing z breakpoints; uv_v: corresponding v values.
shank_mesh <- function(cx, half_w, half_t, z_levels, uv_v, u_lo, u_hi) {
  # 2 x-corners, 2 y-corners, n_zlev z-levels → (n_zlev × 2 × 2) verts
  n_zlev <- length(z_levels)
  xs <- c(cx - half_w, cx + half_w)
  ys <- c(-half_t, +half_t)

  verts <- matrix(0, nrow = 3L, ncol = n_zlev * 4L)
  uvs   <- matrix(0, nrow = 2L, ncol = n_zlev * 4L)
  vi <- 0L
  for (li in seq_len(n_zlev)) {
    z   <- z_levels[[li]]
    v   <- uv_v[[li]]
    for (yi in seq_len(2L)) {
      for (xi in seq_len(2L)) {
        vi <- vi + 1L
        verts[, vi] <- c(xs[[xi]], ys[[yi]], z)
        u <- u_lo + (xs[[xi]] - (cx - half_w)) / (2 * half_w) * (u_hi - u_lo)
        uvs[, vi] <- c(u, v)
      }
    }
  }

  # For each pair of adjacent z-levels, 4 faces × 2 tris
  # Layer li verts (0-based): base = (li-1)*4 ; corners: base+0..3
  #   x0y0=base+0, x1y0=base+1, x0y1=base+2, x1y1=base+3
  tris <- list()
  for (li in seq_len(n_zlev - 1L)) {
    b  <- (li - 1L) * 4L
    bt <- li * 4L
    # Vertex layout per z-level (0-based within layer):
    #   b+0=(x0,y0,zlo)  b+1=(x1,y0,zlo)  b+2=(x0,y1,zlo)  b+3=(x1,y1,zlo)
    #  bt+0=(x0,y0,zhi) bt+1=(x1,y0,zhi) bt+2=(x0,y1,zhi) bt+3=(x1,y1,zhi)
    # All faces wound CCW from outside → outward cross-product normals.
    # +y face (y=y1, normal +Y)
    tris[[length(tris) + 1]] <- c(b + 2, bt + 2, bt + 3)
    tris[[length(tris) + 1]] <- c(b + 2, bt + 3, b + 3)
    # -y face (y=y0, normal -Y)
    tris[[length(tris) + 1]] <- c(b + 0, b + 1, bt + 1)
    tris[[length(tris) + 1]] <- c(b + 0, bt + 1, bt + 0)
    # -x face (x=x0, normal -X)
    tris[[length(tris) + 1]] <- c(b + 0, bt + 0, bt + 2)
    tris[[length(tris) + 1]] <- c(b + 0, bt + 2, b + 2)
    # +x face (x=x1, normal +X)
    tris[[length(tris) + 1]] <- c(b + 1, b + 3, bt + 3)
    tris[[length(tris) + 1]] <- c(b + 1, bt + 3, bt + 1)
  }
  # bottom cap (z=z_tip, normal -Z → CCW from below)
  b <- 0L
  tris[[length(tris) + 1]] <- c(b + 0, b + 3, b + 1)
  tris[[length(tris) + 1]] <- c(b + 0, b + 2, b + 3)

  idx <- t(do.call(rbind, tris))
  list(position = verts, index = idx, uv = uvs)
}

# ---- Build shank meshes ----------------------------------------------------
# Silicon shanks stop at z_base (10 mm) – they do NOT extend into the cap.
# UV z-levels: tip=0, first-contact≈0.002, silicon-top≈0.5, base=0.55.
z_lvls <- c(z_tip, z_contact_lo, z_silicon_top, z_base)
uv_v   <- c(0.0,   0.002,        0.5,           0.55)

shank_meshes <- vector("list", n_shanks)
for (s in seq_len(n_shanks)) {
  cx   <- shank_cx[[s]]
  u_lo <- (s - 1L) / n_shanks
  u_hi <-  s        / n_shanks
  shank_meshes[[s]] <- shank_mesh(
    cx = cx, half_w = shank_width / 2 * shank_vis_scale,
    half_t = half_tw * shank_vis_scale,
    z_levels = z_lvls, uv_v = uv_v, u_lo = u_lo, u_hi = u_hi
  )
}

# ---- Build metal cap mesh --------------------------------------------------
# Shank array X span: min(shank_cx) - shank_width/2  to  max(shank_cx) + shank_width/2
#   ≈ -0.41 mm to +0.41 mm (0.82 mm total).
# Cap is just slightly wider/thicker than the array so brain tissue stays visible.
#   X: 0.35 mm margin each side → total ≈ 1.52 mm wide
#   Y: ±0.40 mm thick            → total   0.80 mm (vs 0.024 mm shank thickness)
#   Z: 12 mm long (unchanged)   (cap_z_lo = z_base = 10 mm, cap_z_hi = 22 mm)
cap_x_lo <- min(shank_cx) - shank_width / 2 - 0.35   # ≈ -0.76 mm
cap_x_hi <- max(shank_cx) + shank_width / 2 + 0.35   # ≈ +0.76 mm
cap_y_lo <- -0.40
cap_y_hi <- +0.40
cap_m <- box_mesh(cap_x_lo, cap_x_hi, cap_y_lo, cap_y_hi,
                  cap_z_lo, cap_z_hi, u_range = c(0, 1))
# Override UV v to > 1 so the shader shows cap in the background/body colour
cap_m$uv[2, ] <- 1.5   # sentinel v > 1 → will be clipped to background band

# ---- Thin trajectory shaft -------------------------------------------------
# Extends from cap top to overall_length as a 0.1 × 0.1 mm rod so the
# insertion trajectory remains visible in the viewer.
shaft_hw <- 0.050  # half-width = 0.05 mm → 0.1 mm cross-section
shaft_m <- box_mesh(-shaft_hw, shaft_hw, -shaft_hw, shaft_hw,
                    cap_z_hi, overall_length, u_range = c(0, 1))
shaft_m$uv[2, ] <- 1.5  # same background colour as cap

# ---- Merge all sub-meshes --------------------------------------------------
merge_meshes <- function(meshes) {
  n_total_v <- sum(sapply(meshes, function(m) ncol(m$position)))
  pos_all  <- matrix(0, 3, n_total_v)
  uv_all   <- matrix(0, 2, n_total_v)
  idx_list <- list()
  v_off <- 0L
  for (m in meshes) {
    nv <- ncol(m$position)
    pos_all[, v_off + seq_len(nv)] <- m$position
    uv_all[,  v_off + seq_len(nv)] <- m$uv
    idx_list[[length(idx_list) + 1]] <- m$index + v_off   # 0-based
    v_off <- v_off + nv
  }
  idx_all <- do.call(cbind, idx_list)
  list(position = pos_all, uv = uv_all, index = idx_all,
       n_vertices = n_total_v, n_triangles = ncol(idx_all))
}

all_meshes <- c(shank_meshes, list(cap_m), list(shaft_m))
merged     <- merge_meshes(all_meshes)

cat("Total vertices :", merged$n_vertices, "\n")
cat("Total triangles:", merged$n_triangles, "\n")
cat("Index range    :", range(merged$index), "\n")

# ---- Texture / channel map (5120 contacts) ---------------------------------
# Texture: 4 stripes × (stride_w px each), total width = 4 * stride_w.
# Height: 2048 px for 640 rows.
stride_w     <- 32L
texture_size <- c(n_shanks * stride_w, 2048L)  # 128 × 2048
tex_w <- texture_size[[1]]
tex_h <- texture_size[[2]]

# Map contacts into texture pixels
# contact v = 0.002 + row_fraction * (0.5 - 0.002)  (from z z_levels above)
# contact u: within shank stripe, col A at 0.27, col B at 0.59 (normalised)
contact_center <- matrix(0, nrow = 3L, ncol = n_channels)
channel_map    <- matrix(0L, nrow = 4L, ncol = n_channels)

ch <- 0L
for (s in seq_len(n_shanks)) {
  cx      <- shank_cx[[s]]
  u_stripe_lo <- (s - 1L) * stride_w + 1L  # pixel column start (1-based)

  for (r in seq_len(n_rows)) {
    z_r   <- z_contact_lo + (r - 1L) * v_pitch
    # v normalised to texture
    v_frac <- 0.002 + (z_r - z_contact_lo) /
                (z_silicon_top - z_contact_lo) * (0.5 - 0.002)
    v_pix  <- max(1L, min(tex_h, as.integer(round(v_frac * tex_h))))

    # col A: x_col_A from shank-left; col B: x_col_B from shank-left
    col_x_offs <- c(x_col_A, x_col_B)  # mm from shank left edge

    for (cc in seq_len(n_cols)) {
      x_abs <- (cx - shank_width / 2) + col_x_offs[[cc]]
      ch <- ch + 1L
      contact_center[, ch] <- c(x_abs, 0, z_r)

      # u pixel: equal-width split — each column occupies its own half of the stripe.
      # col A (cc=1): px u_stripe_lo .. +15;  col B (cc=2): px u_stripe_lo+16 .. +31
      pw <- stride_w %/% n_cols          # 16 px per column, no margins
      ph <- 4L
      uu <- u_stripe_lo + (cc - 1L) * pw
      vv <- max(1L, min(tex_h - ph + 1L, v_pix))
      channel_map[, ch] <- c(uu, vv, pw, ph)
    }
  }
}
stopifnot(ch == n_channels)

# ---- Control points --------------------------------------------------------
# First point = probe tip (fixed anchor).
# Second point = far end of trajectory shaft (entry point at brain surface).
model_control_points <- rbind(
  c(0, 0, z_tip),
  c(0, 0, overall_length)
)
fix_control_index <- 1L

# ---- Assemble & save -------------------------------------------------------
config <- list(
  type        = type,
  name        = "",
  description = description,

  n           = c(merged$n_vertices, merged$n_triangles),
  geometry    = "CustomGeometry",
  fix_outline = FALSE,

  transform   = diag(1, 4L),

  position    = merged$position,
  index       = merged$index,
  normal      = NULL,
  uv          = merged$uv,

  texture_size = texture_size,
  channel_map  = channel_map,
  marker_map   = NULL,

  contact_center = contact_center,
  contact_sizes  = rep(contact_size, n_channels),

  model_direction = c(0, 0, 1),
  model_up        = c(1, 0, 0),
  model_rigid     = TRUE,

  model_control_points       = t(model_control_points),
  model_control_point_orders = c(NA_integer_, NA_integer_),
  fix_control_index          = fix_control_index,

  viewer_options = list(
    "Show Panels" = TRUE
  )
)

proto <- threeBrain:::ElectrodePrototype$new("")$from_list(config)
proto$validate()

out_path <- normalizePath(
  file.path("inst", "prototypes",
            sprintf("%s.json", toupper(type))),
  mustWork = FALSE
)
proto$as_json(to_file = out_path)
cat("Saved:", out_path, "\n")
cat("Channels:", proto$n_channels, "\n")
print(proto, details = TRUE)

# proto$preview_3d()
