const path = require('path');

module.exports = {
  entry: './js/main.ts',
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        include: path.resolve(__dirname, 'js')
      }
    ]
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  devtool: 'source-map',
  mode: 'development',
  devServer: {
    contentBase: path.resolve(__dirname, './'),
    publicPath: path.resolve(__dirname, '/js/dist/'),
  },
  output: {
    publicPath: path.resolve(__dirname, "js/dist/"),
    filename: "bundle.js",
    path: path.resolve(__dirname, 'js/dist'),
  }
}
