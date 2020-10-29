if (!("WebAssembly" in window)) {
  alert("you need a browser with wasm support enabled :(");
}

// The following code was copied from
// https://www.assemblyscript.org/examples/mandelbrot.html
// and retrofitted to use waPC.
// Instead of explicitly creating a buffer to store colors,
// the buffer is returned via the "update" function.

const canvas = document.getElementById("canvas");
const boundingRect = canvas.getBoundingClientRect();
const ctx = canvas.getContext("2d");

// Compute the size of the viewport
const ratio = window.devicePixelRatio || 1;
const width = (boundingRect.width | 0) * ratio;
const height = (boundingRect.height | 0) * ratio;
const size = width * height;
const byteSize = size << 1; // discrete color indices in range [0, 2047] (2 bytes per pixel)

canvas.width = width;
canvas.height = height;

ctx.scale(ratio, ratio);

const imageData = ctx.createImageData(width, height);
const argb = new Uint32Array(imageData.data.buffer);

/** Computes a nice set of colors using a gradient. */
function computeColors() {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 1;
  const ctx = canvas.getContext("2d");
  const grd = ctx.createLinearGradient(0, 0, 2048, 0);
  grd.addColorStop(0.0, "#000764");
  grd.addColorStop(0.16, "#2068CB");
  grd.addColorStop(0.42, "#EDFFFF");
  grd.addColorStop(0.6425, "#FFAA00");
  grd.addColorStop(0.8575, "#000200");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 2048, 1);
  return new Uint32Array(ctx.getImageData(0, 0, 2048, 1).data.buffer);
}

const colors = computeColors();

(async () => {
  const initial = ((byteSize + 0xffff) & ~0xffff) >>> 15;
  const module = await compileWebAssembly("/wasm/mandelbrot-as.wasm");
  const instance = await WaPC.instantiate(module, {
    initial: initial,
    consoleLogger: function (message) {
      console.log(message);
    },
  });

  // Update state
  const response = instance.invoke(
    "update",
    MessagePack.encode({
      width: width,
      height: height,
      limit: 40,
    })
  );
  // buffer is a Uint16Array
  const buffer = MessagePack.decode(response);

  // Translate 16-bit color indices to colors
  for (let y = 0; y < height; ++y) {
    const yx = y * width;
    for (let x = 0; x < width; ++x) {
      argb[yx + x] = colors[buffer[yx + x]];
    }
  }

  // Render the image buffer.
  ctx.putImageData(imageData, 0, 0);
})();

async function compileWebAssembly(location) {
  const promise = fetch(location);
  if (WebAssembly.compileStreaming) {
    return WebAssembly.compileStreaming(promise);
  }

  const response = await promise;
  return WebAssembly.compile(await response.arrayBuffer());
}
