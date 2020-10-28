# waPC + Mandelbrot example

Adaptation of [https://www.assemblyscript.org/examples/mandelbrot.html](https://www.assemblyscript.org/examples/mandelbrot.html) for [waPC](https://github.com/wapc).

Renders the Mandelbrot set to a canvas using 2048 discrete color values computed on the JS side.

Contents:

* `index.html` - contains the canvas
* `js/wapc.js` - loads waPC modules in the browser/JavaScript
* `js/mandelbrot.js` - performs the rendering on the JS side
* `wasm/mandelbrot.wasm` - WebAssembly module that computes the Mandelbrot set compiled from AssemblyScript

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