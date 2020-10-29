package main

import (
	"math"

	"github.com/wapc/mandelbrot-example/tinygo/module"
)

func main() {
	module.Handlers{
		Update: update,
	}.Register()
}

const numColors = 2048

func update(width uint32, height uint32, limit uint32) ([]uint16, error) {
	translateX := float64(width) * (1.0 / 1.6)
	translateY := float64(height) * (1.0 / 2.0)
	scale := 10.0 / math.Min(float64(3*width), float64(4*height))
	realOffset := translateX * scale
	invLimit := 1.0 / float64(limit)

	minIterations := limit
	if minIterations > 8 {
		minIterations = 8
	}
	buffer := make([]uint16, width*height)

	for y := uint32(0); y < height; y++ {
		imaginary := (float64(y) - translateY) * scale
		yOffset := (y * width)

		for x := uint32(0); x < width; x++ {
			real := float64(x)*scale - realOffset

			// Iterate until either the escape radius or iteration limit is exceeded
			ix, iy := 0.0, 0.0
			iteration := uint32(0)
			ixSq := ix * ix
			iySq := iy * iy

			for ixSq+iySq <= 4.0 {
				iy = 2.0*ix*iy + imaginary
				ix = ixSq - iySq + real
				if iteration >= limit {
					break
				}
				iteration++
				ixSq = ix * ix
				iySq = iy * iy
			}

			// Do a few extra iterations for quick escapes to reduce error margin
			for iteration < minIterations {
				ixNew := ix*ix - iy*iy + real
				iy = 2.0*ix*iy + imaginary
				ix = ixNew
				iteration++
			}

			// Iteration count is a discrete value in the range [0, limit] here, but we'd like it to be
			// normalized in the range [0, 2047] so it maps to the gradient computed in JS.
			// see also: http://linas.org/art-gallery/escape/escape.html
			colorIndex := uint16(numColors - 1)
			distanceSq := ix*ix + iy*iy
			if distanceSq > 1.0 {
				fraction := math.Log2(0.5 * math.Log(distanceSq))
				colorIndex = uint16((numColors - 1) * clamp((float64(iteration)+1-fraction)*invLimit, 0.0, 1.0))
			}
			buffer[yOffset+x] = colorIndex
		}
	}

	return buffer, nil
}

// Clamps a value between the given minimum and maximum.
func clamp(value, minValue, maxValue float64) float64 {
	return math.Min(math.Max(value, minValue), maxValue)
}
