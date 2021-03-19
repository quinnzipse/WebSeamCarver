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
  mode: "production",
  output: {
    publicPath: "js/dist",
    filename: "bundle.js",
    path: path.resolve(__dirname, 'js/dist'),
  }
}
