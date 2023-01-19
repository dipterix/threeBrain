const path = require('path');

module.exports = {
  entry: path.resolve(__dirname, 'src/index.js'),
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, '../htmlwidgets/lib/dipterixThreeBrain-1.0.1'),
    // libraryTarget: 'var',
    // library: 'RAVEPipeline'
    publicPath: "/"
  },
  devtool: 'source-map',
};
