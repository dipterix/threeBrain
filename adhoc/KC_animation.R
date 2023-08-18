tbl <- raveio::load_fst("~/Downloads/KC_for_YAEL.fst")
re <- tbl[, list(decibel_Trial_Onset = mean(decibel_Trial_Onset, na.rm = TRUE)), keyby = c("Electrode", "Time")]
re <- re[re$Time >= -0.5 & re$Time <= 2, ]

brain <- raveio::rave_brain("demo/KC")

ma <- function(x, n = 5){filter(x, rep(1 / n, n), sides = 2)}

re2 <- data.table::rbindlist(lapply(split(re, re$Electrode), function(sub) {
  sub <- sub[complete.cases(sub), ]
  # sm <- lowess(sub$Time, sub$decibel_Trial_Onset, f = 0.1)
  data.frame(
    Electrode = sub$Electrode[[1]],
    Time = sub$Time,
    t.value = ma(sub$decibel_Trial_Onset, n = 11) * 2
  )
}))
brain$set_electrode_values(re2)
brain$plot(
  palettes = list(
    t.value = c("#e2e2e2", "#31688e", "#35b779", "#fde725")
  ),
  controllers = list(
    "Surface Color" = "sync from electrodes",
    "Blend Factor" = 0.57,
    "Decay" = 0.05,
    "Range Limit" = 6.0,
    "Display Data" = "t.value",
    "Display Range" = "0,6",
    "Show Panels" = FALSE
  ), custom_javascript = r"(
canvas.animParameters.onChange((elapsed, total) => {
if( elapsed > 0.45) {
  const f = (elapsed - 0.45) / (total-0.45);
  canvas.mainCamera.position.lerpVectors(
    new THREE.Vector3(294,-410,7),
    new THREE.Vector3(500,0,0),
    f
  )
}
})
  )"
)
