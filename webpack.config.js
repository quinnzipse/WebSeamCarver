const path = require('path');

module.exports = {
  entry: './js/main.ts',
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        include: [path.resolve(__dirname, 'js')]
      }
    ]
  },
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, 'js/dist'),
  }
}
