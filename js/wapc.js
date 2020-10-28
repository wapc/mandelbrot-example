class WaPC {
  constructor() {}

  static async instantiate(wasmModule, options) {
    let inst = new WaPC();
    inst.options = options || {};
    const instance = await WebAssembly.instantiate(wasmModule, {
      wapc: {
        __guest_request: inst.__guest_request.bind(inst),
        __guest_response: inst.__guest_response.bind(inst),
        __guest_error: inst.__guest_error.bind(inst),
        __host_call: inst.__host_call.bind(inst),
        __host_response_len: inst.__host_response_len.bind(inst),
        __host_response: inst.__host_response.bind(inst),
        __host_error_len: inst.__host_response_len.bind(inst),
        __host_error: inst.__host_response.bind(inst),
        __console_log: inst.__console_log.bind(inst),
      },
      wasi: {
        fd_write: inst.__fd_write.bind(inst),
      },
      wasi_unstable: {
        fd_write: inst.__fd_write.bind(inst),
      },
    });
    inst.instance = instance;
    inst.exports = instance.exports; // the exports of that instance
    inst.memory = inst.exports.memory;
    inst.guestCall = inst.exports.__guest_call;

    if (inst.exports._start) {
      inst.exports._start();
    }
    if (inst.exports.wapc_init) {
      inst.exports.wapc_init();
    }

    inst.textEncoder = new TextEncoder();
    inst.textDecoder = new TextDecoder("utf-8");

    return inst;
  }

  invoke(operation, payload) {
    this.operationEncoded = this.textEncoder.encode(operation);
    this.payload = payload;
    this.guestCall(this.operationEncoded.length, this.payload.length);
    if (this.err) {
      throw this.err;
    }
    if (this.payload) {
      return this.payload;
    }

    throw new Error("__guest_response or __guest_error were called");
  }

  __guest_request(operationPtr, payloadPtr) {
    const heap = new Uint8Array(this.exports.memory.buffer);
    heap.set(this.operationEncoded, operationPtr);
    heap.set(this.payload, payloadPtr);
  }

  __guest_response(ptr, len) {
    try {
      const heap = new Uint8Array(this.exports.memory.buffer);
      this.err = undefined;
      this.payload = heap.slice(ptr, ptr + len);
    } catch (err) {
      this.err = err;
    }
  }

  __guest_error(ptr, len) {
    this.payload = undefined;
    try {
      const heap = new Uint8Array(this.exports.memory.buffer);
      const s = heap.slice(ptr, ptr + len);
      const msg = this.textDecoder.decode(s);
      this.err = new Error(msg);
      console.log(msg);
    } catch (err) {
      this.err = err;
    }
  }

  __host_call(
    bindingPtr,
    bindingLen,
    namespacePtr,
    namepsaceLen,
    operationPtr,
    operationLen,
    payloadPtr,
    payloadLen
  ) {
    if (!this.options.hostCallHandler) {
      return 0;
    }

    this.hostErr = undefined;
    try {
      const heap = new Uint8Array(this.exports.memory.buffer);
      const binding = this.textDecoder.decode(
        heap.slice(bindingPtr, bindingPtr + bindingLen)
      );
      const namespace = this.textDecoder.decode(
        heap.slice(namespacePtr, namespacePtr + namepsaceLen)
      );
      const operation = this.textDecoder.decode(
        heap.slice(operationPtr, operationPtr + operationLen)
      );
      const payload = MessagePack.decode(
        heap.slice(payloadPtr, payloadPtr + payloadLen)
      );

      this.response = this.options.hostCallHandler(
        binding,
        namespace,
        operation,
        payload
      );

      return 0;
    } catch (err) {
      this.hostErr = this.textEncoder.encode(err.toString());
      return 1;
    }
  }

  __host_response_len() {
    if (!this.hostResponse) {
      return 0;
    }
    return this.hostResponse.length;
  }

  __host_response(ptr) {
    const heap = new Uint8Array(this.exports.memory.buffer);
    heap.set(this.hostResponse, ptr);
  }

  __host_error_len() {
    if (!this.hostErr) {
      return 0;
    }
    return this.hostErr.length;
  }

  __host_error(ptr) {
    const heap = new Uint8Array(this.exports.memory.buffer);
    heap.set(this.hostErr, ptr);
  }

  __console_log(ptr, len) {
    if (!this.options.consoleLogger) {
      return;
    }

    const heap = new Uint8Array(this.exports.memory.buffer);
    const message = this.textDecoder.decode(heap.slice(ptr, ptr + len));

    this.options.consoleLogger(message);
  }

  __fd_write(fileDescriptor, iovsPtr, iovsLen, writtenPtr) {
    // Only writing to standard out (1) is supported
    if (fileDescriptor != 1 || !this.options.writer) {
      return 0;
    }

    const dv = new DataView(this.exports.memory.buffer);
    const heap = new Uint8Array(this.exports.memory.buffer);
    let bytesWritten = 0;

    while (iovsLen > 0) {
      iovsLen--;
      const base = dv.getUint32(iovsPtr, true);
      iovsPtr += 4;
      const length = dv.getUint32(iovsPtr, true);
      iovsPtr += 4;
      const stringBytes = heap.slice(base, base + length);
      i.writer(this.textDecoder.decode(stringBytes));
      bytesWritten += length;
    }

    dv.setUint32(writtenPtr, bytesWritten, true);

    return bytesWritten;
  }
}
