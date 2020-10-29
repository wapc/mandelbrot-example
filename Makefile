.PHONY: all deps codegen build clean

all: deps codegen build

deps:
	npm install

codegen:
	wapc generate codegen.yaml

build:
	npm run build
	tinygo build -o wasm/mandelbrot-tinygo.wasm -target wasm -no-debug tinygo/main.go

clean:
	rm -Rf wasm
