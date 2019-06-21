const fs = require('fs');
const path = require('path');
const webpack = require('webpack');
const nodeExternals = require('webpack-node-externals');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const PnpWebpackPlugin = require('pnp-webpack-plugin');

const configs = require('./app-configs');
const babelConf = require('./babel-server');
const applyOverrides = require('./util/apply-overrides');
const assetsIgnoreBanner = fs.readFileSync(require.resolve('./util/node-assets-ignore'), 'utf8');

// This is the production configuration.
// It compiles slowly and is focused on producing a fast and minimal bundle.
// The development configuration is different and lives in a separate file.
module.exports = applyOverrides(['webpack', 'webpackServer', 'webpackProd', 'webpackServerProd'], {
    mode: 'production',
    // Don't attempt to continue if there are any errors.
    bail: true,
    // We generate sourcemaps in production. This is slow but gives good results.
    devtool: 'source-map',
    target: 'node',
    node: {
        __filename: true,
        __dirname: true
    },
    // These are the "entry points" to our application.
    // This means they will be the "root" imports that are included in JS bundle.
    entry: [
        // Finally, this is your app's code:
        configs.serverEntry,
    ],
    context: configs.cwd,
    output: {
        // Add /* filename */ comments to generated require()s in the output.
        pathinfo: true,
        path: configs.serverOutputPath,
        publicPath: configs.publicPath,
        filename: configs.serverOutput,
        chunkFilename: '[name].js',
        // Point sourcemap entries to original disk location (format as URL on Windows)
        devtoolModuleFilenameTemplate: info =>
            path
                .relative(configs.appSrc, info.absoluteResourcePath)
                .replace(/\\/g, '/'),
    },
    externals: [nodeExternals({
        whitelist: [/^arui-feather/, /^arui-ft-private/, /^arui-private/, /^alfaform-core-ui/, /^#/]
    })],
    resolve: {
        // This allows you to set a fallback for where Webpack should look for modules.
        // We placed these paths second because we want `node_modules` to "win"
        // if there are any conflicts. This matches Node resolution mechanism.
        // https://github.com/facebookincubator/create-react-app/issues/253
        modules: ['node_modules', configs.appNodeModules],
        // These are the reasonable defaults supported by the Node ecosystem.
        // We also include JSX as a common component filename extension to support
        // some tools, although we do not recommend using it, see:
        // https://github.com/facebookincubator/create-react-app/issues/290
        // `web` extension prefixes have been added for better support
        // for React Native Web.
        extensions: ['.web.js', '.mjs', '.js', '.json', '.web.jsx', '.jsx', '.ts', '.tsx'],
        plugins: [
            PnpWebpackPlugin
        ]
    },
    resolveLoader: {
        plugins: [
            // Also related to Plug'n'Play, but this time it tells Webpack to load its loaders
            // from the current package.
            PnpWebpackPlugin.moduleLoader(module),
        ],
    },
    module: {
        // typescript interface will be removed from modules, and we will get an error on correct code
        // see https://github.com/webpack/webpack/issues/7378
        strictExportPresence: !configs.tsconfig,
        rules: [
            {
                oneOf: [
                    // Process JS with Babel.
                    {
                        test: configs.useTscLoader ? /\.(js|jsx|mjs)$/ : /\.(js|jsx|mjs|ts|tsx)$/,
                        include: configs.appSrc,
                        loader: require.resolve('babel-loader'),
                        options: babelConf,
                    },
                    (configs.tsconfig && configs.useTscLoader) && {
                        test: /\.tsx?$/,
                        use: [
                            {
                                loader: require.resolve('babel-loader'),
                                options: Object.assign({
                                    // This is a feature of `babel-loader` for webpack (not Babel itself).
                                    // It enables caching results in ./node_modules/.cache/babel-loader/
                                    // directory for faster rebuilds.
                                    cacheDirectory: true
                                }, babelConf)
                            },
                            {
                                loader: require.resolve('cache-loader')
                            },
                            {
                                loader: require.resolve('ts-loader'),
                                options: PnpWebpackPlugin.tsLoaderOptions({
                                    onlyCompileBundledFiles: true,
                                    transpileOnly: true,
                                    happyPackMode: true,
                                    configFile: configs.tsconfig
                                })
                            }
                        ]
                    },
                    // replace css imports with empty files
                    {
                        test: /\.css$/,
                        loader: require.resolve('null-loader')
                    },
                    // "file" loader makes sure those assets get served by WebpackDevServer.
                    // When you `import` an asset, you get its (virtual) filename.
                    // In production, they would get copied to the `build` folder.
                    // This loader doesn't use a "test" so it will catch all modules
                    // that fall through the other loaders.
                    {
                        // Exclude `js` files to keep "css" loader working as it injects
                        // its runtime that would otherwise processed through "file" loader.
                        // Also exclude `html` and `json` extensions so they get processed
                        // by webpacks internal loaders.
                        exclude: [/\.(js|jsx|mjs|ts|tsx)$/, /\.(html|ejs)$/, /\.json$/],
                        loader: require.resolve('file-loader'),
                        options: {
                            outputPath: configs.publicPath,
                            publicPath: configs.publicPath,
                            name: 'static/media/[name].[hash:8].[ext]',
                        },
                    },
                ].filter(Boolean),
            },
        ],
    },
    plugins: [
        new webpack.BannerPlugin({
            banner: assetsIgnoreBanner,
            raw: true,
            entryOnly: false
        }),
        new webpack.BannerPlugin({
            banner: 'require("source-map-support").install();',
            raw: true,
            entryOnly: false
        }),
        configs.tsconfig !== null && new ForkTsCheckerWebpackPlugin(PnpWebpackPlugin.forkTsCheckerOptions())
    ].filter(Boolean)
});
