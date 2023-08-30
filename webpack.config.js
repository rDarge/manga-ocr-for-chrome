// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

const path = require('path');
const CopyPlugin = require("copy-webpack-plugin");

module.exports = () => {
    return {
        target: ['web'],
        entry: path.resolve(__dirname, 'out/content-script.js'),
        output: {
            path: path.resolve(__dirname, 'dist'),
            filename: 'content-script.js',
            library: {
                type: 'umd'
            }
        },
        plugins: [new CopyPlugin({
            // Use copy plugin to copy *.wasm to output folder.
            patterns: [
                { from: 'node_modules/onnxruntime-web/dist/*.wasm', to: '[name][ext]' },
                { from: 'out/service-worker.js', to: '[name][ext]'},
                { from: 'out/offscreen.js', to: '[name][ext]'}
            ]
        })],
        mode: 'development',
        devtool: false,
    }
};