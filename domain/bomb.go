package domain

import (
	"time"

	"github.com/google/uuid"
	"github.com/zishang520/socket.io/v2/socket"
)

type BombId = uuid.UUID

type Bomb struct {
	id    BombId
	timer *time.Timer

	State  BombState
	Index  Index
	Config BombConfig
	Dir    Index

	Ignited  bool
	Exploded bool
	Canceled bool
}

type BombConfig struct {
	Power    uint
	PlacerId socket.SocketId
}

type BombState int

const (
	Placed BombState = iota
	Moving
	Punched
)

func (s BombState) String() string {
	return [...]string{"Placed", "Moving", "Punched"}[s]
}

type ClientBomb struct {
	Id    BombId `json:"id"`
	Index Index  `json:"index"`
	State string `json:"state"`
	Dir   Index  `json:"dir"`
}

func NewBomb(index Index, config BombConfig) *Bomb {
	return &Bomb{
		id: uuid.New(),

		Index:  index,
		Config: config,
	}
}

func (b *Bomb) Id() BombId {
	return b.id
}

func (b *Bomb) Ignite(explode func()) {
	b.timer = time.NewTimer(time.Second * 3)
	<-b.timer.C
	explode()
}

func (b *Bomb) Cancel() {
	b.timer.Stop()
	b.Canceled = true
}

func (b *Bomb) Disposed() bool {
	return b.Exploded || b.Canceled
}

func (b *Bomb) Client() ClientBomb {
	return ClientBomb{
		Id:    b.id,
		Index: b.Index,
		State: b.State.String(),
		Dir:   b.Dir,
	}
}
