const webpack = require("webpack");
const path = require('path');
const { WebpackManifestPlugin } = require('webpack-manifest-plugin');
// const HtmlWebpackPlugin = require('html-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  mode: 'production',
  entry: path.resolve(__dirname, 'src/js/index.js'),
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: [
          'style-loader',
          'css-loader',
        ]
      },
    ],
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: "main.js",
    publicPath: "/",
    clean : true,
    globalObject: 'this',
    library: {
      name: 'threeBrainJS',
      type: 'umd',

    },
  },
  plugins: [
    new WebpackManifestPlugin({}),
    // new webpack.SourceMapDevToolPlugin({})
  ],
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin()],
  }
};
//*/

/*
const path = require('path');

module.exports = {
  mode: 'production',
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
//*/
