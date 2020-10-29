package module

import (
	"context"

	"github.com/vmihailenco/msgpack/v4"
	"github.com/wapc/wapc-go"
)

type Module struct {
	instance *wapc.Instance
}

func New(instance *wapc.Instance) *Module {
	return &Module{
		instance: instance,
	}
}

func (m *Module) Update(ctx context.Context, width uint32, height uint32, limit uint32) ([]uint16, error) {
	var ret []uint16
	inputArgs := UpdateArgs{
		Width:  width,
		Height: height,
		Limit:  limit,
	}
	inputPayload, err := msgpack.Marshal(&inputArgs)
	if err != nil {
		return ret, err
	}
	payload, err := m.instance.Invoke(
		ctx,
		"update",
		inputPayload,
	)
	if err != nil {
		return ret, err
	}
	err = msgpack.Unmarshal(payload, &ret)
	return ret, err
}

type UpdateArgs struct {
	Width  uint32 `msgpack:"width"`
	Height uint32 `msgpack:"height"`
	Limit  uint32 `msgpack:"limit"`
}
