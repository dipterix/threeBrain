const webpack = require("webpack");
const path = require('path');
const minimizer = require('terser-webpack-plugin');

module.exports = {
  mode: 'production',
  entry: path.resolve(__dirname, 'src/index.js'),
  devtool: "source-map",
  output: {
    path: path.resolve(__dirname, '../htmlwidgets/lib/dipterixThreeBrain-1.0.1'),
    filename: "main.js",
    publicPath: "/"
  },
  optimization: {
    minimize: true,
    minimizer: [new minimizer({
      include: /\.min\.js$/
    })]
  }
};
