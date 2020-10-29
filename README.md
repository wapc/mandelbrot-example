# waPC + Mandelbrot example

Adaptation of [https://www.assemblyscript.org/examples/mandelbrot.html](https://www.assemblyscript.org/examples/mandelbrot.html) for [waPC](https://github.com/wapc).

Renders the Mandelbrot set to a canvas using 2048 discrete color values computed on the JS side.

Contents:

* `index.html` - contains the canvas
* `js/wapc.js` - loads waPC modules in the browser/JavaScript
* `js/mandelbrot.js` - performs the rendering on the JS side
* `wasm/mandelbrot-as.wasm` - Compiled [AssemblyScript](https://www.assemblyscript.org/) module that computes the Mandelbrot set
* `wasm/mandelbrot-tinygo.wasm` - Compiled [TinyGo](https://tinygo.org/) module that computes the Mandelbrot set
* `wasm/mandelbrot-rust.wasm` - Compiled [Rust](https://www.rust-lang.org/) module that computes the Mandelbrot set

Note: `js/mandelbrot.js` loads the AssemblyScript module, but you can change it to test the other language's modules.

Building:

This depends on having the [waPC CLI](https://github.com/wapc/cli.git) installed.

```sh
make
```

This installs dependencies, runs the `wapc generate` command to generate the biolerplate code from `schema.widl`, and compiles the AssemblyScript module.

Running:

You can start an HTTP server from this directory (so long as `.wasm` files are served with a `Content-Type` of `application/wasm`). If you have node installed you can run the following command to start a simple static server.

```sh
node server.js
```

Then point your browswer to [http://localhost:8888](http://localhost:8888).

Finally, to demonstrate the portability of waPC modules, you can run a simple Go program to export the rendered image to a png.

```sh
make png
```
