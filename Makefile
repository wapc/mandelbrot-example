.PHONY: all deps codegen build clean

all: deps codegen build

deps:
	npm install

codegen:
	wapc generate codegen.yaml

build:
	npm run build

clean:
	rm -Rf wasm
