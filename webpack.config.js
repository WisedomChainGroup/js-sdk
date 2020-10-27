const path = require('path')

module.exports = {
    entry: path.join(__dirname, "contract-src/index.ts"),
    output: {
        path: path.join(__dirname, "contract-dist"),
        filename: 'bundle.js',
        library: 'keystore_wdc_contract',
        libraryTarget: 'umd',        
    },
    resolve: {
        // Add `.ts` and `.tsx` as a resolvable extension.
        extensions: [".ts", ".tsx", ".js"],
        fallback : {
            "child_process": false,
            "crypto": false,
            "buffer": false
        }
    },
    module: {
        rules: [
            // all files with a `.ts` or `.tsx` extension will be handled by `ts-loader`
            { test: /\.tsx?$/, loader: "ts-loader"},
            {    
                test: /\.js$/,    
                exclude: /node_modules/,    
                loader: 'babel-loader'    
            }            
        ]
    }
}