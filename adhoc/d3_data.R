x = seq(-1,2,length.out = 301)
y = seq(1,200, 1)
z = matrix(1:(length(x) * length(y)), nrow = length(x))
plot_data = list(x = x,y=y,z=z)
data = list(

  id = 'canvas',

  width = '100%',
  height = '100%',

  layout = list(
    # first one
    list(
      name = 'plot1',
      x = 0, y = 0, w = 'width - 70', h = 'height',
      # x and ylim
      xlim = range(plot_data$x),
      ylim = range(plot_data$y),
      margin = c(50, 60, 80, 50)
    ),
    list(
      name = 'plot2',
      # x and ylim
      x = 'width - 70', y = 0, w = 70, h = 'height',
      xlim = range(plot_data$x),
      ylim = range(plot_data$y),
      zlim = range(plot_data$z),
      margin = c(50, 0, 80, 50)
    )
  ),

  plot_data = plot_data,

  content = list(
    'plot1' = list(
      # canvas settings
      main = 'Title',
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
          side = 1, text = 'Label X', at = NULL, labels = NULL, las = 1, cex_axis = 1.3, cex_lab = 1.6, line = 1.6
        ),
        list(
          side = 2, text = 'Label Y', at = NULL, labels = NULL, las = 1, cex_axis = 1, cex_lab = 1.2, line = 0
        )
      )
    ),
    'plot2' = list(
      main = 'Legend',
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
          side = 4, text = '', at = c(0, 200), las = 1, cex_axis = 1.3, cex_lab = 1.6, line = 1.6
        )
      )
    )
  )

)


cat(stringr::str_replace_all(deparse(data), '[ ]+', ' '), sep = '')

wg = r2d3::r2d3(data, './inst/js_raws/src/js/Math/sparkles.js'); wg
# htmlwidgets::saveWidget(wg, '~/Downloads/d3.html')
