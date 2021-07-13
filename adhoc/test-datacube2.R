file.copy('inst/htmlwidgets/lib/dipterixThreeBrain-1.0.1/', to = '/Users/dipterix/Library/R/arm64/4.1/library/threeBrain/htmlwidgets/lib/', overwrite = TRUE, recursive = TRUE)
list.files('/Users/dipterix/Library/R/arm64/4.1/library/threeBrain/htmlwidgets/lib/dipterixThreeBrain-1.0.1/')
yab <- rave::rave_brain2('demo/YAB',surfaces = 'smoothwm')
yab$set_electrode_values(data.frame(
  Subject = 'YAB',
  Electrode = 14,
  Color = 'aa'
))
yab <- threeBrain::merge_brain(yab)
# yab$plot(
#   debug = TRUE, controllers = list(
#     'Left Hemisphere' = 'hidden',
#     'Right Hemisphere' = 'hidden',
#     'Voxel Type' = 'aparc_aseg',
#     'Voxel Opacity' = 0.76,
#     # 'Voxel Label' = '1026, 1002, 1023, 1010, 2026, 2002, 2023, 2010,1012, 1014, 1027, 1032, 2012, 2014, 2027, 2032,18, 54,1035, 2035',
#     'Show Panels' = FALSE
#   )
# )
wg <- yab$plot(
  # voxel_colormap = "inst/palettes/datacube2/ContinuousSample.json",
  debug = TRUE, controllers = list(
    'Left Hemisphere' = 'hidden',
    'Right Hemisphere' = 'hidden',
    'Voxel Type' = 'aparc_aseg',
    # 'Voxel Opacity' = 0.76,
    # 'Voxel Label' = '1026, 1002, 1023, 1010, 2026, 2002, 2023, 2010,1012, 1014, 1027, 1032, 2012, 2014, 2027, 2032,18, 54,1035, 2035',
    'Show Panels' = FALSE
  )

)
# wg
threeBrain::save_brain(wg, '~/Desktop/3dtest', as_zip = TRUE)
# yab$plot(debug = TRUE, voxel_palette = "inst/palettes/datacube2/ContinuousSample.json")
