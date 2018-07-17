const CopyWebpackPlugin = require('copy-webpack-plugin');
const path = require('path')
const fs = require("fs")

let entries = {}
let files = fs.readdirSync(__dirname + "/examples")
files.forEach((file) => {
	if (fs.lstatSync(__dirname + "/examples/" + file).isDirectory()) {
		entries[file] = [
			__dirname, "examples", file, file + ".ts"
		].join("/")
	}
})

module.exports = {
	entry: entries,
	resolve: {
		extensions: [".ts", ".tsx", ".js", ".json"]
	},
	devtool: "source-map",
	module: {
		rules: [
			{ test: /\.tsx?$/, loader: "awesome-typescript-loader" },
			{ enforce: "pre", test: /\.js$/, loader: "source-map-loader" },
			{ test: /\.(frag|vert)$/, loader: "raw-loader" }
		]
	},
	mode: "development",
	output: {
		path: path.resolve(__dirname, 'build/'),
		filename: '[name]/dist/bundle.js'
	},
	plugins: [
		new CopyWebpackPlugin([
			{
				from: "./**/index.html",
				to: "./",
				toType: "dir"
			}
		], {
			context: "./examples"
		})
	]
}