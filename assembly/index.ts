import { handleCall, handleAbort } from "@wapc/as-guest";
import { Handlers } from "./module";

export function wapc_init(): void {
  Handlers.registerUpdate(update);
}

// The following code was copied from
// https://www.assemblyscript.org/examples/mandelbrot.html
// and retrofitted to use waPC.
// update explicitly returns a array instead of
// using store to write to arbitrary locations in the memory buffer.

/** Number of discrete color values on the JS side. */
const NUM_COLORS = 2048;

function update(width: u32, height: u32, limit: u32): Array<u16> {
  var translateX = width  * (1.0 / 1.6);
  var translateY = height * (1.0 / 2.0);
  var scale      = 10.0 / min(3 * width, 4 * height);
  var realOffset = translateX * scale;
  var invLimit   = 1.0 / limit;

  var minIterations = min(8, limit);
  var buffer = new Array<u16>(width * height);

  for (let y: u32 = 0; y < height; ++y) {
    let imaginary = (y - translateY) * scale;
    let yOffset   = (y * width); // << 1;

    for (let x: u32 = 0; x < width; ++x) {
      let real = x * scale - realOffset;

      // Iterate until either the escape radius or iteration limit is exceeded
      let ix = 0.0, iy = 0.0, ixSq: f64, iySq: f64;
      let iteration: u32 = 0;
      while ((ixSq = ix * ix) + (iySq = iy * iy) <= 4.0) {
        iy = 2.0 * ix * iy + imaginary;
        ix = ixSq - iySq + real;
        if (iteration >= limit) break;
        ++iteration;
      }

      // Do a few extra iterations for quick escapes to reduce error margin
      while (iteration < minIterations) {
        let ixNew = ix * ix - iy * iy + real;
        iy = 2.0 * ix * iy + imaginary;
        ix = ixNew;
        ++iteration;
      }

      // Iteration count is a discrete value in the range [0, limit] here, but we'd like it to be
      // normalized in the range [0, 2047] so it maps to the gradient computed in JS.
      // see also: http://linas.org/art-gallery/escape/escape.html
      let colorIndex = NUM_COLORS - 1;
      let distanceSq = ix * ix + iy * iy;
      if (distanceSq > 1.0) {
        let fraction = Math.log2(0.5 * Math.log(distanceSq));
        colorIndex = <u32>((NUM_COLORS - 1) * clamp<f64>((iteration + 1 - fraction) * invLimit, 0.0, 1.0));
      }
      buffer[yOffset + x] = <u16>colorIndex;
    }
  }

  return buffer;
}

/** Clamps a value between the given minimum and maximum. */
function clamp<T>(value: T, minValue: T, maxValue: T): T {
  return min(max(value, minValue), maxValue);
}

// Boilerplate code for waPC.  Do not remove.

export function __guest_call(operation_size: usize, payload_size: usize): bool {
  return handleCall(operation_size, payload_size);
}

// Abort function
function abort(
  message: string | null,
  fileName: string | null,
  lineNumber: u32,
  columnNumber: u32
): void {
  handleAbort(message, fileName, lineNumber, columnNumber);
}
