module.exports = {
  productionSourceMap: false,
  devServer: {
    public: "192.168.1.212:8080"
  },
  chainWebpack: config => {
    config.optimization.delete("splitChunks");
  },
  pwa: {
    workboxPluginMode: "InjectManifest",
    appleMobileWebAppCapable: 'no',
    workboxOptions: {
      // swSrc is required in InjectManifest mode.
      swSrc: "public/service-worker.js"
      // ...other Workbox options...
    },
    iconPaths: {
      favicon32: 'images/icons/favicon-32x32.png',
      favicon16: 'images/icons/favicon-16x16.png',
      msTileImage: 'images/icons/logo-144x144.png'
    }
  }

};