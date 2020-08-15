x = seq(-1,2,length.out = 301)
y = seq(1,200, 1)
z = matrix(1:(length(x) * length(y)), nrow = length(x))
plot_data = list(x = x,y=y,z=z)
data = list(

  id = 'canvas',

  width = '300px',
  height = '200px',

  layout = list(
    # first one
    list(
      name = 'plot1',
      x = '50', y = 0,
      w = 'width - 70', h = 'height',
      # x and ylim
      xlim = range(plot_data$x),
      ylim = range(plot_data$y),
      margin = c(20, 20, 50, 10)
    ),
    list(
      name = 'plot2',
      # x and ylim
      x = 0, y = 0,
      w = 50, h = 'height',
      xlim = range(plot_data$x),
      ylim = range(plot_data$y),
      zlim = range(plot_data$z),
      margin = c(20, 25, 50, 10)
    )
  ),

  plot_data = plot_data,

  content = list(
    'plot1' = list(
      # canvas settings
      main = 'aa',
      cex_main = 0.5,
      anchor_main = 'middle',
      main_top = 30,
      # overall data
      data = NULL,
      geom_traces = list(
        'lines' = list(
          type = 'geom_line',
          data = NULL,
          x = 'x',
          y = 'y'
        )
      ),
      # axis
      axis = list(
        list(
          side = 1, text = '', at = NULL, labels = NULL, las = 1, cex_axis = 0.5, cex_lab = 0.5, line = 0
        ),
        list(
          side = 2, text = '', at = NULL, labels = NULL, las = 1, cex_axis = 0.5, cex_lab = 0.5, line = 0
        )
      )
    ),
    'plot2' = list(
      main = 'Value',
      cex_main = 0.5,
      anchor_main = 'middle',
      main_top = 30,
      data = NULL,
      geom_traces = list(
        'heatmap' = list(
          type = 'geom_heatmap',
          data = NULL,
          x = 'x',
          y = 'y',
          z = 'z',
          x_scale = 'linear',
          y_scale = 'linear',
          palette = c('steelblue', 'red'),
          rev_x = FALSE,
          rev_y = TRUE
        )
      ),
      axis = list(
        list(
          side = 2, text = '', at = c(0, 200), las = 1, cex_axis = 0.5, cex_lab = 0.5, line = 0
        )
      )
    )
  )

)


cat(stringr::str_replace_all(deparse(data), '[ ]+', ' '), sep = '')
wg = r2d3::r2d3(data, './inst/js_raws/src/js/Math/sparkles.js'); wg
