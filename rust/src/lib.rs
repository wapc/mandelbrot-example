pub mod generated;
extern crate wapc_guest as guest;
use generated::*;
use guest::prelude::*;
use std::cmp;

#[no_mangle]
pub fn wapc_init() {
    Handlers::register_update(update);
}

const NUM_COLORS: u16 = 2048;

fn update(width: u32, height: u32, limit: u32) -> HandlerResult<Vec<u16>> {
    let translate_x: f64 = width as f64 * (1.0 / 1.6);
    let translate_y: f64 = height as f64 * (1.0 / 2.0);
    let scale: f64 = 10.0 / cmp::min(3 * width, 4 * height) as f64;
    let real_offset: f64 = translate_x * scale;
    let inv_limit: f64 = 1.0 / limit as f64;

    let min_iterations: u32 = cmp::min(8, limit);
    let buffer_size = (height * width) as usize;
    let mut buffer_vec = vec![0; buffer_size];
    let buffer = buffer_vec.as_mut_slice();

    for y in 0..height - 1 {
        let imaginary = (y as f64 - translate_y) * scale;
        let y_offset = y * width;

        for x in 0..width - 1 {
            let real = (x as f64 * scale) - real_offset;

            // Iterate until either the escape radius or iteration limit is exceeded
            let mut ix: f64 = 0.0;
            let mut iy: f64 = 0.0;
            let mut iteration: u32 = 0;
            let mut ix_sq = ix * ix;
            let mut iy_sq = iy * iy;

            while ix_sq + iy_sq <= 4.0 {
                iy = 2.0 * ix * iy + imaginary;
                ix = ix_sq - iy_sq + real;
                if iteration >= limit {
                    break;
                }
                iteration = iteration + 1;
                ix_sq = ix * ix;
                iy_sq = iy * iy;
            }

            // Do a few extra iterations for quick escapes to reduce error margin
            while iteration < min_iterations {
                let ix_new = ix * ix - iy * iy + real;
                iy = 2.0 * ix * iy + imaginary;
                ix = ix_new;
                iteration = iteration + 1;
            }

            // Iteration count is a discrete value in the range [0, limit] here, but we'd like it to be
            // normalized in the range [0, 2047] so it maps to the gradient computed in JS.
            // see also: http://linas.org/art-gallery/escape/escape.html
            let mut color_index: u16 = NUM_COLORS - 1;
            let distance_sq = ix * ix + iy * iy;
            if distance_sq > 1.0 {
                let t = 0.5 * distance_sq.log10();
                let fraction = t.log2();
                color_index = ((NUM_COLORS - 1) as f64
                    * clamp((iteration as f64 + 1.0 - fraction) * inv_limit, 0.0, 1.0))
                    as u16;
            }
            buffer[(y_offset + x) as usize] = color_index;
        }
    }

    return Ok(buffer_vec);
}

// Clamps a value between the given minimum and maximum.
fn clamp(value: f64, min_value: f64, max_value: f64) -> f64 {
    let t = value.max(min_value);
    t.min(max_value)
}
