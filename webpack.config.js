// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

const path = require('path');
const CopyPlugin = require("copy-webpack-plugin");

module.exports = () => {
    return {
        target: ['web'],
        entry: {
            offscreen: path.resolve(__dirname, 'out/offscreen.js'),
            "content-script": path.resolve(__dirname, 'out/content-script.js'),
            "service-worker": path.resolve(__dirname, 'out/service-worker.js')
        },
        output: {
            path: path.resolve(__dirname, 'dist'),
            filename: '[name].js',
            library: {
                type: 'umd'
            }
        },
        plugins: [new CopyPlugin({
            // Use copy plugin to copy *.wasm to output folder.
            patterns: [
                { from: 'node_modules/onnxruntime-web/dist/*.wasm', to: '[name][ext]' },
            ]
        })],
        mode: 'development',
        devtool: false,
    }
};