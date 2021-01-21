package module

import (
	msgpack "github.com/wapc/tinygo-msgpack"
	wapc "github.com/wapc/wapc-guest-tinygo"
)

type Host struct {
	binding string
}

func NewHost(binding string) *Host {
	return &Host{
		binding: binding,
	}
}

func (h *Host) Update(width uint32, height uint32, limit uint32) ([]uint16, error) {
	inputArgs := UpdateArgs{
		Width:  width,
		Height: height,
		Limit:  limit,
	}
	inputBytes, err := msgpack.ToBytes(&inputArgs)
	if err != nil {
		return []uint16{}, err
	}
	payload, err := wapc.HostCall(
		h.binding,
		"mandelbrot",
		"update",
		inputBytes,
	)
	if err != nil {
		return []uint16{}, err
	}
	decoder := msgpack.NewDecoder(payload)
	listSize, err := decoder.ReadArraySize()
	if err != nil {
		return []uint16{}, err
	}
	ret := make([]uint16, 0, listSize)
	for listSize > 0 {
		listSize--
		var nonNilItem uint16
		nonNilItem, err = decoder.ReadUint16()
		if err != nil {
			return []uint16{}, err
		}
		ret = append(ret, nonNilItem)
	}
	return ret, err
}

type Handlers struct {
	Update func(width uint32, height uint32, limit uint32) ([]uint16, error)
}

func (h Handlers) Register() {
	if h.Update != nil {
		updateHandler = h.Update
		wapc.RegisterFunction("update", updateWrapper)
	}
}

var (
	updateHandler func(width uint32, height uint32, limit uint32) ([]uint16, error)
)

func updateWrapper(payload []byte) ([]byte, error) {
	decoder := msgpack.NewDecoder(payload)
	var inputArgs UpdateArgs
	inputArgs.Decode(&decoder)
	response, err := updateHandler(inputArgs.Width, inputArgs.Height, inputArgs.Limit)
	if err != nil {
		return nil, err
	}
	var sizer msgpack.Sizer
	sizer.WriteArraySize(uint32(len(response)))
	for _, v := range response {
		sizer.WriteUint16(v)
	}

	ua := make([]byte, sizer.Len())
	encoder := msgpack.NewEncoder(ua)
	encoder.WriteArraySize(uint32(len(response)))
	for _, v := range response {
		encoder.WriteUint16(v)
	}

	return ua, nil
}

type UpdateArgs struct {
	Width  uint32
	Height uint32
	Limit  uint32
}

func DecodeUpdateArgsNullable(decoder *msgpack.Decoder) (*UpdateArgs, error) {
	if isNil, err := decoder.IsNextNil(); isNil || err != nil {
		return nil, err
	}
	decoded, err := DecodeUpdateArgs(decoder)
	return &decoded, err
}

func DecodeUpdateArgs(decoder *msgpack.Decoder) (UpdateArgs, error) {
	var o UpdateArgs
	err := o.Decode(decoder)
	return o, err
}

func (o *UpdateArgs) Decode(decoder *msgpack.Decoder) error {
	numFields, err := decoder.ReadMapSize()
	if err != nil {
		return err
	}

	for numFields > 0 {
		numFields--
		field, err := decoder.ReadString()
		if err != nil {
			return err
		}
		switch field {
		case "width":
			o.Width, err = decoder.ReadUint32()
		case "height":
			o.Height, err = decoder.ReadUint32()
		case "limit":
			o.Limit, err = decoder.ReadUint32()
		default:
			err = decoder.Skip()
		}
		if err != nil {
			return err
		}
	}

	return nil
}

func (o *UpdateArgs) Encode(encoder msgpack.Writer) error {
	if o == nil {
		encoder.WriteNil()
		return nil
	}
	encoder.WriteMapSize(3)
	encoder.WriteString("width")
	encoder.WriteUint32(o.Width)
	encoder.WriteString("height")
	encoder.WriteUint32(o.Height)
	encoder.WriteString("limit")
	encoder.WriteUint32(o.Limit)

	return nil
}
