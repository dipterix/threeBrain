# ---- Neuropixels 1.0 NP1000/NP1001 (single-shank, 960 contacts) -----------
#
# Source of specs: SpikeGLX SGLXMetaToCoords.py and
#   billkarsh/ProbeTable Tables/probe_features.json (version 1.7)
#
# ProbeTable entries used here:
#   NP1000 : Neuropixels 1.0 probe          (no cap  – open access)
#   NP1001 : Neuropixels 1.0 probe with cap (metal cap assembly)
#   Both share IDENTICAL contact geometry; two JSON files are written.
#
# Silicon geometry (from ProbeTable):
#   rows_per_shank    : 480
#   cols_per_shank    : 2
#   electrode_pitch_vert_um  : 20 µm
#   electrode_pitch_horz_um  : 32 µm
#   STAGGERED layout:
#     even rows (row 0, 2, 4...): leftmost electrode 27 µm from left shank edge
#     odd  rows (row 1, 3, 5...): leftmost electrode 11 µm from left shank edge
#   shank_width_um    : 70 µm
#   shank_thickness_um: 24 µm
#   shank_tip_to_base_um: 10 000 µm (10 mm)
#   tip_length_um     : 209 µm
#   num_readout_channels : 384
#   total_electrodes  : 960
#   banks_per_shank   : 2.50  (= 960 / 384)
#   on_shank_ref_chan : 191 (hardware reference, not a recording contact)
#
# Geometry (model space, all in mm):
#   +Z : tip (z=0) → connector/entry (z = overall_length)
#   +X : lateral direction
#   +Y : front face of the probe (recording side)
#
# NP1000 mesh  : silicon shank  +  thin trajectory shaft (no metal cap)
# NP1001 mesh  : silicon shank  +  metal cap cuboid  +  thin trajectory shaft
# ---------------------------------------------------------------------------

library(threeBrain)

# ---- Physical constants (all in mm) ----------------------------------------
n_shanks   <- 1L
n_rows     <- 480L
n_cols     <- 2L
n_per_shank <- n_rows * n_cols        # 960
n_channels  <- n_shanks * n_per_shank # 960

shank_width <- 0.070   # mm  (70 µm)
shank_thick <- 0.024   # mm  (24 µm)
v_pitch     <- 0.020   # mm  (20 µm row spacing)
h_pitch     <- 0.032   # mm  (32 µm col A → col B)

# Staggered column offsets (from shank left edge):
x_even_col_A <- 0.027                    # mm  even rows, col A
x_even_col_B <- x_even_col_A + h_pitch  # 0.059 mm  even rows, col B
x_odd_col_A  <- 0.011                    # mm  odd rows, col A
x_odd_col_B  <- x_odd_col_A  + h_pitch  # 0.043 mm  odd rows, col B

shank_cx      <- 0.0    # single shank centred at x = 0

z_tip         <- 0.0
z_contact_lo  <- 0.020  # mm  first contact row (above tapered tip)
z_silicon_top <- z_contact_lo + (n_rows - 1L) * v_pitch  # 9.600 mm
z_base        <- 10.0   # mm  base of silicon shank
overall_length <- 100.0 # mm  full trajectory visualisation length

# Metal cap (NP1001 only)
cap_z_lo <- z_base
cap_z_hi <- z_base + 12.0   # 12 mm long
half_tw  <- shank_thick / 2  # 0.012 mm

# ---- Visualisation scale factors -------------------------------------------
shank_vis_scale <- 3.0
# Contact sphere radius: 1.5× vis half-thickness so spheres protrude through
# the shank face and are visible in the 3-D renderer.
contact_size    <- half_tw * shank_vis_scale * 1.5   # = 0.054 mm

# ---- Helper: closed rectangular-prism (box) mesh ---------------------------
# 24 unique vertices (4 per face, no sharing) → flat normals from
# computeVertexNormals().  Quads wound CCW from outside.
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
  pos <- do.call(cbind, lapply(faces, t))
  uv  <- do.call(cbind, lapply(faces, function(vm) {
    apply(vm, 1, function(v) uv_of(v[[1]], v[[3]]))
  }))

  idx <- do.call(cbind, lapply(seq_len(6L), function(fi) {
    v0 <- (fi - 1L) * 4L
    cbind(c(v0, v0 + 1L, v0 + 2L), c(v0, v0 + 2L, v0 + 3L))
  }))
  list(position = pos, index = idx, uv = uv)
}

# ---- Helper: thin-slab shank mesh with z-level UV variation ----------------
shank_mesh <- function(cx, half_w, half_t, z_levels, uv_v, u_lo, u_hi) {
  n_zlev <- length(z_levels)
  xs <- c(cx - half_w, cx + half_w)
  ys <- c(-half_t, +half_t)

  verts <- matrix(0, nrow = 3L, ncol = n_zlev * 4L)
  uvs   <- matrix(0, nrow = 2L, ncol = n_zlev * 4L)
  vi <- 0L
  for (li in seq_len(n_zlev)) {
    z <- z_levels[[li]]
    v <- uv_v[[li]]
    for (yi in seq_len(2L)) {
      for (xi in seq_len(2L)) {
        vi <- vi + 1L
        verts[, vi] <- c(xs[[xi]], ys[[yi]], z)
        u <- u_lo + (xs[[xi]] - (cx - half_w)) / (2 * half_w) * (u_hi - u_lo)
        uvs[, vi] <- c(u, v)
      }
    }
  }

  tris <- list()
  for (li in seq_len(n_zlev - 1L)) {
    b  <- (li - 1L) * 4L
    bt <- li * 4L
    tris[[length(tris) + 1]] <- c(b + 2, bt + 2, bt + 3)  # +Y face
    tris[[length(tris) + 1]] <- c(b + 2, bt + 3, b + 3)
    tris[[length(tris) + 1]] <- c(b + 0, b + 1, bt + 1)   # -Y face
    tris[[length(tris) + 1]] <- c(b + 0, bt + 1, bt + 0)
    tris[[length(tris) + 1]] <- c(b + 0, bt + 0, bt + 2)  # -X face
    tris[[length(tris) + 1]] <- c(b + 0, bt + 2, b + 2)
    tris[[length(tris) + 1]] <- c(b + 1, b + 3, bt + 3)   # +X face
    tris[[length(tris) + 1]] <- c(b + 1, bt + 3, bt + 1)
  }
  b <- 0L  # bottom cap (-Z)
  tris[[length(tris) + 1]] <- c(b + 0, b + 3, b + 1)
  tris[[length(tris) + 1]] <- c(b + 0, b + 2, b + 3)

  idx <- t(do.call(rbind, tris))
  list(position = verts, index = idx, uv = uvs)
}

# ---- Merge sub-meshes -------------------------------------------------------
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
    idx_list[[length(idx_list) + 1]] <- m$index + v_off
    v_off <- v_off + nv
  }
  idx_all <- do.call(cbind, idx_list)
  list(position = pos_all, uv = uv_all, index = idx_all,
       n_vertices = n_total_v, n_triangles = ncol(idx_all))
}

# ---- Build silicon shank mesh ----------------------------------------------
# UV z-levels: tip=0, first-contact, silicon-top, base
z_lvls <- c(z_tip, z_contact_lo, z_silicon_top, z_base)
uv_v   <- c(0.0,   0.002,        0.5,           0.55)

shank_m <- shank_mesh(
  cx       = shank_cx,
  half_w   = shank_width / 2 * shank_vis_scale,
  half_t   = half_tw         * shank_vis_scale,
  z_levels = z_lvls, uv_v = uv_v,
  u_lo = 0.0, u_hi = 1.0
)

# ---- Build metal cap mesh (NP1001 only) ------------------------------------
cap_x_lo <- shank_cx - shank_width / 2 - 0.35   # ≈ -0.385 mm
cap_x_hi <- shank_cx + shank_width / 2 + 0.35   # ≈ +0.385 mm
cap_y_lo <- -0.40
cap_y_hi <- +0.40
cap_m <- box_mesh(cap_x_lo, cap_x_hi, cap_y_lo, cap_y_hi,
                  cap_z_lo, cap_z_hi, u_range = c(0, 1))
cap_m$uv[2, ] <- 1.5   # sentinel → background/body colour in shader

# ---- Build thin trajectory shaft -------------------------------------------
shaft_hw <- 0.050   # 0.1 mm cross-section
shaft_m  <- box_mesh(-shaft_hw, shaft_hw, -shaft_hw, shaft_hw,
                     cap_z_hi, overall_length, u_range = c(0, 1))
shaft_m$uv[2, ] <- 1.5

# ---- Merged meshes (two variants) ------------------------------------------
merged_capped <- merge_meshes(list(shank_m, cap_m, shaft_m))  # NP1001
merged_bare   <- merge_meshes(list(shank_m, shaft_m))          # NP1000

cat("NP1001 (capped) – vertices:", merged_capped$n_vertices,
    "  triangles:", merged_capped$n_triangles, "\n")
cat("NP1000 (bare)   – vertices:", merged_bare$n_vertices,
    "  triangles:", merged_bare$n_triangles, "\n")

# ---- Texture / channel map (960 contacts) -----------------------------------
# Single stripe: 32 × 2048 px.
# Staggered layout: col x positions vary per even/odd row, but the texture
# uses an equal-width split (col A = left half, col B = right half) because
# the 3-D contact_center positions carry the true spatial information.
stride_w     <- 32L
texture_size <- c(stride_w, 2048L)
tex_h        <- texture_size[[2]]

contact_center <- matrix(0, nrow = 3L, ncol = n_channels)
channel_map    <- matrix(0L, nrow = 4L, ncol = n_channels)

ch          <- 0L
u_stripe_lo <- 1L

for (r in seq_len(n_rows)) {
  z_r    <- z_contact_lo + (r - 1L) * v_pitch

  # Staggered offset: physical row index is (r - 1), even = 0 mod 2
  is_even <- ((r - 1L) %% 2L) == 0L
  col_x_offs <- if (is_even) c(x_even_col_A, x_even_col_B) else
                              c(x_odd_col_A,  x_odd_col_B)

  v_frac <- 0.002 + (z_r - z_contact_lo) /
              (z_silicon_top - z_contact_lo) * (0.5 - 0.002)
  v_pix  <- max(1L, min(tex_h, as.integer(round(v_frac * tex_h))))

  for (cc in seq_len(n_cols)) {
    x_abs <- (shank_cx - shank_width / 2) + col_x_offs[[cc]]
    ch    <- ch + 1L
    contact_center[, ch] <- c(x_abs, 0, z_r)

    pw <- stride_w %/% n_cols          # 16 px per column
    ph <- 4L
    uu <- u_stripe_lo + (cc - 1L) * pw
    vv <- max(1L, min(tex_h - ph + 1L, v_pix))
    channel_map[, ch] <- c(uu, vv, pw, ph)
  }
}
stopifnot(ch == n_channels)

# ---- Control points --------------------------------------------------------
model_control_points <- rbind(
  c(0, 0, z_tip),
  c(0, 0, overall_length)
)
fix_control_index <- 1L

# ---- Helper: build config list from a merged mesh --------------------------
make_config <- function(type_name, description_str, merged) {
  list(
    type        = type_name,
    name        = "",
    description = description_str,

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
}

# ---- Descriptions ----------------------------------------------------------
desc_shared <- c(
  "Shanks              : 1",
  "Contacts / shank    : 960 (2 cols x 480 rows)",
  "Total contacts      : 960",
  "Vertical pitch      : 20 um",
  "Horizontal pitch    : 32 um (col A to col B)",
  "Layout              : STAGGERED",
  "  even rows (0,2,...): col A at 27 um, col B at 59 um from left edge",
  "  odd  rows (1,3,...): col A at 11 um, col B at 43 um from left edge",
  "Readout channels    : 384 (of 960 total; bank-selectable)",
  "Banks per shank     : 2.50 (= 960 / 384)",
  "On-shank ref chan   : 191 (hardware reference, not a recording contact)",
  "Shank width         : 70 um",
  "Shank thickness     : 24 um",
  "Shank length        : ~10 mm (9.6 mm contact region + tip taper)",
  "Visualization len.  : 100 mm (includes trajectory extension)"
)

desc_np1001 <- paste(c(
  "Neuropixels 1.0 probe with metal cap (NP1001)",
  desc_shared,
  "Metal cap           : cuboid, 12 mm long, ~0.77 mm wide, 0.8 mm thick"
), collapse = "\n      ")

desc_np1000 <- paste(c(
  "Neuropixels 1.0 probe, open-access (NP1000)",
  desc_shared,
  "Metal cap           : none (open-access assembly)"
), collapse = "\n      ")

# ---- Validate & save NP1001 (with cap) -------------------------------------
cfg1001 <- make_config("Neuropixel-NP1001", desc_np1001, merged_capped)
proto1001 <- threeBrain:::ElectrodePrototype$new("")$from_list(cfg1001)
proto1001$validate()

out1001 <- normalizePath(
  file.path("inst", "prototypes", "NEUROPIXEL-NP1001.json"),
  mustWork = FALSE
)
proto1001$as_json(to_file = out1001)
cat("Saved:", out1001, "\n")
cat("Channels:", proto1001$n_channels, "\n")
print(proto1001, details = TRUE)

# # ---- Validate & save NP1000 (bare, no cap) ---------------------------------
# cfg1000 <- make_config("Neuropixel-NP1000", desc_np1000, merged_bare)
# proto1000 <- threeBrain:::ElectrodePrototype$new("")$from_list(cfg1000)
# proto1000$validate()

# out1000 <- normalizePath(
#   file.path("inst", "prototypes", "NEUROPIXEL-NP1000.json"),
#   mustWork = FALSE
# )
# proto1000$as_json(to_file = out1000)
# cat("Saved:", out1000, "\n")
# cat("Channels:", proto1000$n_channels, "\n")
# print(proto1000, details = TRUE)
