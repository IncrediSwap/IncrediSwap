const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  reactStrictMode: true,
  webpack: (config) => {
      // Note: we provide webpack above so you should not `require` it
      // Perform customizations to webpack config
      config.plugins.push(
          new CopyPlugin({
            patterns: [
              {
                from: 'node_modules/@aztec/sdk/*.(wasm|worker.js)',
                to: '[name].[ext]',
              },
            ],
          })
      )

      // Important: return the modified config
      return config
  },
}

// module.exports = {
//   reactStrictMode: true,
//   webpack: (config) => {
//     config = {
//       plugins: [
//         new CopyPlugin({
//           patterns: [
//             {
//               from: 'node_modules/@aztec/sdk/*.(wasm|worker.js)',
//               to: '[name].[ext]',
//             },
//           ],
//         }
//       ),
//     ], ...config};
//     return config
//   },
// }