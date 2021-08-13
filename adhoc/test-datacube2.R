file.copy('inst/htmlwidgets/lib/dipterixThreeBrain-1.0.1/', to = '/Users/dipterix/Library/R/arm64/4.1/library/threeBrain/htmlwidgets/lib/', overwrite = TRUE, recursive = TRUE)
file.copy('inst/palettes/datacube2/', to = '/Users/dipterix/Library/R/arm64/4.1/library/threeBrain/palettes/', overwrite = TRUE, recursive = TRUE)

yab <- rave::rave_brain2('demo/YAB')
yab$set_electrode_values(data.frame(
  Subject = 'YAB',
  Electrode = c(rep(14, 3), rep(15,1)),
  Color = c(-1:1, 1),
  Time = c(0.5,3,4, 0)
))
yab <- threeBrain::merge_brain(yab)

col <- matrix(NA, 198812, 20)
tmp <- rep(1:255,each = ceiling(198812/255))
for(ii in 1:20){
  skip <- floor(198812/20) * (ii-1)
  col[(skip + 1):198812,ii] <- tmp[1:(198812-skip)]
}

# yab$template_object$surfaces$pial$left_hemisphere$set_value(key = as.vector(col), time_stamp = seq(0, 5, length.out = 20))
# yab$template_object$surfaces$pial$left_hemisphere$time_stamp

# library(shiny)
#
# ui <- shiny::basicPage(
#   threejsBrainOutput('out', height = '100vh'),
#   actionButton("btn", "refresh")
# )
#
# server <- function(input, output, session) {
#   output$out <- renderBrain({
#     input$btn
    yab$plot(
      # voxel_colormap = "inst/palettes/datacube2/ContinuousSample.json",
      debug = TRUE, controllers = list(
        'Left Hemisphere' = 'hidden',
        'Right Hemisphere' = 'hidden',
        'Voxel Type' = 'aparc_aseg',
        # 'Voxel Opacity' = 0.76,
        # 'Voxel Label' = '1026, 1002, 1023, 1010, 2026, 2002, 2023, 2010,1012, 1014, 1027, 1032, 2012, 2014, 2027, 2032,18, 54,1035, 2035',
        'Show Panels' = FALSE
      ), control_presets = 'localization',
      custom_javascript = r'(
      canvas.shared_data.set(".media_content", {
        Color: {
          asp_ratio: 16/9,
          time_start: 1,
          duration: 4,
          name: "Color",
          url: "https://www.dropbox.com/s/opsgvzothqxvsj0/mov_bbb.mp4?raw=1"
        }
      })
      canvas.switch_media("Color");

      )'

    )
#   })
# }

# shinyApp(ui, server, options = list(launch.browser = TRUE))
# threeBrain::save_brain(wg, '~/Desktop/3dtest', as_zip = TRUE)
# yab$plot(debug = TRUE, voxel_palette = "inst/palettes/datacube2/ContinuousSample.json")
    # window.m=canvas.threebrain_instances.get("Atlas - aparc_aseg (N27)");
    # window.m1=canvas.threebrain_instances.get("Standard 141 Left Hemisphere - pial (N27)");
    # window.m2=canvas.threebrain_instances.get("Standard 141 Right Hemisphere - pial (N27)");
    #
    # window.origin = canvas.mouse_raycaster.ray.origin;
    # window.direction = canvas.mouse_raycaster.ray.direction;
    # window.margin_voxels = new THREE.Vector3().fromArray(m._cube_dim);
    # window.margin_lengths = margin_voxels;
    # window.map_array = m._color_texture.image.data;
    # window.delta = 2;
    # gui.get_controller("Edit Mode").setValue("CT/volume")
    #
    # //window.m1=canvas.threebrain_instances.get("FreeSurfer Left Hemisphere - pial (N27)");
    # //window.m2=canvas.threebrain_instances.get("FreeSurfer Right Hemisphere - pial (N27)");
    #
    #
    # // m1._set_color_from_datacube2(m, 3);
    # //m2._set_color_from_datacube2(m, 3);
    # //m1.object.material.userData.shader.uniforms.which_map.value=3;
    # //m1.object.geometry.attributes.track_color.needsUpdate=true;
    # //m1.object.material.needsUpdate=true;
    # //this.gui.get_controller("Screenshot").domElement.click();
