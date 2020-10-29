.PHONY: all deps codegen build clean

all: deps codegen build

deps:
	npm install

codegen:
	wapc generate codegen.yaml

build:
	npm run build
	tinygo build -o wasm/mandelbrot-tinygo.wasm -target wasm -no-debug tinygo/main.go
	cargo build --target wasm32-unknown-unknown --release --manifest-path=rust/Cargo.toml && \
  	cp rust/target/wasm32-unknown-unknown/release/mandelbrot_example_rust.wasm wasm/mandelbrot-rust.wasm

clean:
	rm -Rf wasm
