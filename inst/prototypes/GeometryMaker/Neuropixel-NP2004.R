# ---- Neuropixels 2.0 NP2003/NP2004 (single-shank, 1280 contacts) ----------
#
# Source of specs: SpikeGLX SGLXMetaToCoords.py (jenniferColonell/SGLXMetaToCoords)
#
# geomList for np2_ss / NP2003 / NP2004:
#   [nShank=1, shankWidth=70, shankPitch=0,
#    even_xOff=27, odd_xOff=27, horizPitch=32, vertPitch=15,
#    rowsPerShank=640, elecPerShank=1280]
#   All offsets / pitches in micrometres.
#
# Part-number notes:
#   NP2003 : open-access assembly (headstage attached directly, no metal cap)
#   NP2004 : metal-cap assembly (same silicon as NP2003, different package)
#   Both share IDENTICAL contact geometry; two JSON files are written.
#   NP2013/NP2014 are the four-shank versions of the same silicon geometry.
#
# Geometry (model space, all in mm):
#   +Z : tip (z=0) → connector/entry (z = overall_length)
#   +X : lateral direction
#   +Y : front face of the probe (recording side)
#
# Physical shank dimensions (silicon only):
#   - Width     : 70 µm  = 0.070 mm
#   - Length    : 640 rows × 15 µm = 9.60 mm  → 10 mm total with tip taper
#   - Thickness : ~24 µm = 0.024 mm
#
# Contacts per shank : 1280  (2 cols × 640 rows)
#   col A : x_off = even_xOff = 27 µm from shank left edge = 0.027 mm
#   col B : x_off = odd_xOff + horizPitch = 27 + 32 = 59 µm = 0.059 mm
#   (even_xOff == odd_xOff == 27 µm → no row-to-row stagger, pure parallel cols)
#
# Proximal metal cap (rectangular cuboid, just above the shank):
#   Width  : ~0.77 mm  (shank ± 0.35 mm margin each side)
#   Height : 0.80 mm  (y/thickness – ±0.40 mm)
#   Length : 12 mm    (z extent from silicon base upward)
#
# Silicon shank ends at z_base (10 mm); the cap starts there.
# A thin trajectory shaft (0.1 × 0.1 mm) extends from cap top to
# overall_length = 100 mm for cortical trajectory visualisation.
# ---------------------------------------------------------------------------

library(threeBrain)

# ---- Naming ----------------------------------------------------------------
# Primary type: NP2004 (metal-cap).  NP2003 alias saved at the end.
type        <- "Neuropixel-NP2004"
description <- paste(c(
  "Neuropixels 2.0 single-shank probe (NP2003 / NP2004)",
  "Shanks              : 1",
  "Contacts / shank    : 1280 (2 cols x 640 rows)",
  "Total contacts      : 1280",
  "Vertical pitch      : 15 um",
  "Horizontal pitch    : 32 um (col A → col B)",
  "even_xOff / odd_xOff: 27 um / 27 um (non-staggered columns)",
  "Shank width         : 70 um",
  "Shank thickness     : ~24 um",
  "Shank length        : ~10 mm (9.6 mm contact region + tip taper)",
  "Proximal metal cap  : cuboid, 12 mm long, ~0.77 mm wide, 0.8 mm thick",
  "Visualization len.  : 100 mm (includes trajectory extension)"
), collapse = "\n      ")

# ---- Physical constants (all in mm) ----------------------------------------
n_shanks       <- 1L
n_rows         <- 640L
n_cols         <- 2L
n_per_shank    <- n_rows * n_cols        # 1280
n_channels     <- n_shanks * n_per_shank # 1280

shank_width    <- 0.070   # mm
shank_thick    <- 0.024   # mm (~24 µm)
v_pitch        <- 0.015   # mm  (row spacing)
h_pitch        <- 0.032   # mm  (column A → B horizontal pitch)
x_col_A        <- 0.027   # mm  from shank left edge  (even_xOff = 27 µm)
x_col_B        <- x_col_A + h_pitch  # 0.059 mm  (0 + horizPitch + odd_xOff = 27+32 µm)
z_tip          <- 0.0     # probe tip
z_contact_lo   <- 0.020   # first contact centre (above the tapered tip)
z_silicon_top  <- z_contact_lo + (n_rows - 1L) * v_pitch  # 9.605 mm
z_base         <- 10.0    # base of silicon shank (end of silicon)
overall_length <- 100.0   # full trajectory visualisation length

# Metal cap dimensions
cap_z_lo  <- z_base           # starts right at shank base
cap_z_hi  <- z_base + 12.0   # 12 mm long
half_tw   <- shank_thick / 2  # 0.012 mm

# ---- Visualisation scale factors (not physical; for 3-D viewer legibility) ----
shank_vis_scale <- 3.0    # render shank 3× wider / thicker so it is visible
# Contact sphere radius: 1.5× the visualised shank half-thickness so rendered
# spheres protrude through the shank face and are not hidden by the shank mesh.
contact_size    <- half_tw * shank_vis_scale * 1.5  # = 0.012 * 3 * 1.5 = 0.054 mm

# Single shank centred at x = 0
shank_cx <- 0.0

# ---- Helper: build one closed rectangular-prism (box) mesh ----------------
# Returns list(position = 3×N, index = 3×M, uv = 2×N) in model coords.
# Uses 24 unique vertices (4 per face, no sharing) so that
# computeVertexNormals() in the JS renderer assigns each face a flat outward
# normal rather than averaging across shared corner vertices.
# All quads are wound CCW from outside; triangles (0,1,2)+(0,2,3) within each
# face's local 0–3 indices give correct outward cross-product normals.
box_mesh <- function(x0, x1, y0, y1, z0, z1, u_range = c(0, 1)) {
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
  uv  <- do.call(cbind, lapply(faces, {
    function(vm) {
      # 2 × 24
      apply(vm, 1, function(v) {
        uv_of(v[[1]], v[[3]])
      })
    }
  }))
  idx <- do.call(cbind, lapply(seq_len(6L), function(fi) {  # 3 × 12
    v0 <- (fi - 1L) * 4L
    cbind(c(v0, v0 + 1L, v0 + 2L), c(v0, v0 + 2L, v0 + 3L))
  }))
  list(position = pos, index = idx, uv = uv)
}

# ---- Helper: thin-slab shank mesh with z-level UV variation ----------------
# Builds a thin box shank from n_zlev z-breakpoints.
# Within each z-strip, 4 vertices per level: (x0,y0), (x1,y0), (x0,y1), (x1,y1)
# at indices base+0..3.  Adjacent levels form 4 side faces + 1 bottom cap.
shank_mesh <- function(cx, half_w, half_t, z_levels, uv_v, u_lo, u_hi) {
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
        # UV denominator uses 2*half_w (the visualised width), NOT shank_width,
        # so U stays in [u_lo, u_hi] even when shank_vis_scale != 1.
        u <- u_lo + (xs[[xi]] - (cx - half_w)) / (2 * half_w) * (u_hi - u_lo)
        uvs[, vi] <- c(u, v)
      }
    }
  }

  # Side faces: CCW from outside for each z-strip.
  # Vertex layout per z-level (0-based within layer):
  #   b+0=(x0,y0,zlo)  b+1=(x1,y0,zlo)  b+2=(x0,y1,zlo)  b+3=(x1,y1,zlo)
  #  bt+0=(x0,y0,zhi) bt+1=(x1,y0,zhi) bt+2=(x0,y1,zhi) bt+3=(x1,y1,zhi)
  tris <- list()
  for (li in seq_len(n_zlev - 1L)) {
    b  <- (li - 1L) * 4L
    bt <- li * 4L
    # +Y face (y=y1, normal +Y)
    tris[[length(tris) + 1]] <- c(b + 2, bt + 2, bt + 3)
    tris[[length(tris) + 1]] <- c(b + 2, bt + 3, b + 3)
    # -Y face (y=y0, normal -Y)
    tris[[length(tris) + 1]] <- c(b + 0, b + 1, bt + 1)
    tris[[length(tris) + 1]] <- c(b + 0, bt + 1, bt + 0)
    # -X face (x=x0, normal -X)
    tris[[length(tris) + 1]] <- c(b + 0, bt + 0, bt + 2)
    tris[[length(tris) + 1]] <- c(b + 0, bt + 2, b + 2)
    # +X face (x=x1, normal +X)
    tris[[length(tris) + 1]] <- c(b + 1, b + 3, bt + 3)
    tris[[length(tris) + 1]] <- c(b + 1, bt + 3, bt + 1)
  }
  # Bottom cap (z=z_tip, normal -Z, CCW from below)
  b <- 0L
  tris[[length(tris) + 1]] <- c(b + 0, b + 3, b + 1)
  tris[[length(tris) + 1]] <- c(b + 0, b + 2, b + 3)

  idx <- t(do.call(rbind, tris))
  list(position = verts, index = idx, uv = uvs)
}

# ---- Build single shank mesh -----------------------------------------------
# Silicon shank stops at z_base (10 mm) – does NOT extend into the cap.
# UV z-levels: tip=0, first-contact≈0.002, silicon-top≈0.5, base=0.55.
z_lvls <- c(z_tip, z_contact_lo, z_silicon_top, z_base)
uv_v   <- c(0.0,   0.002,        0.5,           0.55)

shank_m <- shank_mesh(
  cx     = shank_cx,
  half_w = shank_width / 2 * shank_vis_scale,
  half_t = half_tw         * shank_vis_scale,
  z_levels = z_lvls, uv_v = uv_v,
  u_lo = 0.0, u_hi = 1.0   # full texture width for the single shank
)

# ---- Build metal cap mesh --------------------------------------------------
# Slightly wider and thicker than the single shank so the cap is clearly visible.
#   X: shank_cx ± (shank_width/2 + 0.35 mm margin) → ≈ ±0.385 mm
#   Y: ±0.40 mm (vs ±0.012 mm physical shank half-thickness)
#   Z: 12 mm long, starting at z_base
cap_x_lo <- shank_cx - shank_width / 2 - 0.35   # ≈ -0.385 mm
cap_x_hi <- shank_cx + shank_width / 2 + 0.35   # ≈ +0.385 mm
cap_y_lo <- -0.40
cap_y_hi <- +0.40
cap_m <- box_mesh(cap_x_lo, cap_x_hi, cap_y_lo, cap_y_hi,
                  cap_z_lo, cap_z_hi, u_range = c(0, 1))
# Override UV v > 1 (sentinel) so the shader clips cap to background/body colour.
cap_m$uv[2, ] <- 1.5

# ---- Thin trajectory shaft -------------------------------------------------
# Extends from cap top to overall_length as a 0.1 × 0.1 mm rod.
shaft_hw <- 0.050   # half-width = 0.05 mm → 0.1 mm cross-section
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
    uv_all[, v_off + seq_len(nv)] <- m$uv
    idx_list[[length(idx_list) + 1]] <- m$index + v_off   # 0-based
    v_off <- v_off + nv
  }
  idx_all <- do.call(cbind, idx_list)
  list(position = pos_all, uv = uv_all, index = idx_all,
       n_vertices = n_total_v, n_triangles = ncol(idx_all))
}

all_meshes <- list(shank_m, cap_m, shaft_m)
merged     <- merge_meshes(all_meshes)

cat("Total vertices :", merged$n_vertices, "\n")
cat("Total triangles:", merged$n_triangles, "\n")
cat("Index range    :", range(merged$index), "\n")

# ---- Texture / channel map (1280 contacts) ---------------------------------
# Single stripe: stride_w pixels wide, 2048 pixels tall.
# texture_size = c(32, 2048).
stride_w     <- 32L
texture_size <- c(stride_w, 2048L)   # 32 × 2048 (one shank stripe)
tex_w <- texture_size[[1]]
tex_h <- texture_size[[2]]

# contact v: mapped from [z_contact_lo, z_silicon_top] → [0.002, 0.5] in UV
# contact u: equal-width split — col A fills left half, col B fills right half;
#   pw = stride_w / n_cols, no margins between columns.
contact_center <- matrix(0, nrow = 3L, ncol = n_channels)
channel_map    <- matrix(0L, nrow = 4L, ncol = n_channels)

ch          <- 0L
u_stripe_lo <- 1L   # pixel column start (1-based; single stripe starts at px 1)

for (r in seq_len(n_rows)) {
  z_r   <- z_contact_lo + (r - 1L) * v_pitch
  v_frac <- 0.002 + (z_r - z_contact_lo) /
              (z_silicon_top - z_contact_lo) * (0.5 - 0.002)
  v_pix  <- max(1L, min(tex_h, as.integer(round(v_frac * tex_h))))

  col_x_offs <- c(x_col_A, x_col_B)   # mm from shank left edge

  for (cc in seq_len(n_cols)) {
    x_abs <- (shank_cx - shank_width / 2) + col_x_offs[[cc]]
    ch <- ch + 1L
    contact_center[, ch] <- c(x_abs, 0, z_r)

    # u pixel: equal-width split, col index cc (1-based) occupies its own band.
    # col A (cc=1): px 1..16;  col B (cc=2): px 17..32  (for stride_w=32)
    pw <- stride_w %/% n_cols          # 16 px per column, no margins
    ph <- 4L
    uu <- u_stripe_lo + (cc - 1L) * pw
    vv <- max(1L, min(tex_h - ph + 1L, v_pix))
    channel_map[, ch] <- c(uu, vv, pw, ph)
  }
}
stopifnot(ch == n_channels)

# ---- Control points --------------------------------------------------------
# Probe tip (z=0) and entry point (z=overall_length) are purely geometric
# anchors — neither is a recording contact → use NA_integer_.
model_control_points <- rbind(
  c(0, 0, z_tip),
  c(0, 0, overall_length)
)
fix_control_index <- 1L   # anchor = probe tip

# ---- Assemble config -------------------------------------------------------
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

# ---- Validate & save NP2004 ------------------------------------------------
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
