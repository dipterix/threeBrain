const webpack = require("webpack");
const path = require('path');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const THREE = require('three');

module.exports = {
  entry: path.resolve(__dirname, 'src/index.js'),
  devtool: "source-map",
  output: {
    path: path.resolve(__dirname, '../htmlwidgets/lib/dipterixThreeBrain-1.0.1'),
    filename: "main.js"
  },
  optimization: {
    minimize: true,
    minimizer: [new UglifyJsPlugin({
      include: /\.min\.js$/
    })]
  }
};
