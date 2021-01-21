import { register, hostCall } from "@wapc/as-guest";
import {
  Decoder,
  Writer,
  Encoder,
  Sizer,
  Codec,
  Value,
} from "@wapc/as-msgpack";

export class Host {
  binding: string;

  constructor(binding: string) {
    this.binding = binding;
  }

  update(width: u32, height: u32, limit: u32): Array<u16> {
    const inputArgs = new UpdateArgs();
    inputArgs.width = width;
    inputArgs.height = height;
    inputArgs.limit = limit;
    const payload = hostCall(
      this.binding,
      "mandelbrot",
      "update",
      inputArgs.toBuffer()
    );
    const decoder = new Decoder(payload);
    const ret = decoder.readArray(
      (decoder: Decoder): u16 => {
        return decoder.readUInt16();
      }
    );
    return ret;
  }
}

export class Handlers {
  static registerUpdate(
    handler: (width: u32, height: u32, limit: u32) => Array<u16>
  ): void {
    updateHandler = handler;
    register("update", updateWrapper);
  }
}

var updateHandler: (width: u32, height: u32, limit: u32) => Array<u16>;
function updateWrapper(payload: ArrayBuffer): ArrayBuffer {
  const decoder = new Decoder(payload);
  const inputArgs = new UpdateArgs();
  inputArgs.decode(decoder);
  const response = updateHandler(
    inputArgs.width,
    inputArgs.height,
    inputArgs.limit
  );
  const sizer = new Sizer();
  sizer.writeArray(response, (sizer: Writer, item: u16): void => {
    sizer.writeUInt16(item);
  });
  const ua = new ArrayBuffer(sizer.length);
  const encoder = new Encoder(ua);
  encoder.writeArray(response, (encoder: Writer, item: u16): void => {
    encoder.writeUInt16(item);
  });
  return ua;
}

export class UpdateArgs implements Codec {
  width: u32 = 0;
  height: u32 = 0;
  limit: u32 = 0;

  static decodeNullable(decoder: Decoder): UpdateArgs | null {
    if (decoder.isNextNil()) return null;
    return UpdateArgs.decode(decoder);
  }

  // decode
  static decode(decoder: Decoder): UpdateArgs {
    const o = new UpdateArgs();
    o.decode(decoder);
    return o;
  }

  decode(decoder: Decoder): void {
    var numFields = decoder.readMapSize();

    while (numFields > 0) {
      numFields--;
      const field = decoder.readString();

      if (field == "width") {
        this.width = decoder.readUInt32();
      } else if (field == "height") {
        this.height = decoder.readUInt32();
      } else if (field == "limit") {
        this.limit = decoder.readUInt32();
      } else {
        decoder.skip();
      }
    }
  }

  encode(encoder: Writer): void {
    encoder.writeMapSize(3);
    encoder.writeString("width");
    encoder.writeUInt32(this.width);
    encoder.writeString("height");
    encoder.writeUInt32(this.height);
    encoder.writeString("limit");
    encoder.writeUInt32(this.limit);
  }

  toBuffer(): ArrayBuffer {
    let sizer = new Sizer();
    this.encode(sizer);
    let buffer = new ArrayBuffer(sizer.length);
    let encoder = new Encoder(buffer);
    this.encode(encoder);
    return buffer;
  }
}
