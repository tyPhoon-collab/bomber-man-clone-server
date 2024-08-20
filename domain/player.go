package domain

import (
	"slices"
	"sync"

	"github.com/google/uuid"
)

type Player struct {
	Power                 uint
	MaxPlacableBombsCount uint
	CanKick               bool
	CanPunch              bool
	CanHold               bool

	// Speed            uint  // client side only

	PlacedBombsCount uint
	Alive            bool

	kickingBombs []uuid.UUID
	mu           sync.Mutex
}

func NewPlayer() *Player {
	return &Player{
		Power:                 1,
		MaxPlacableBombsCount: 1,

		Alive: true,
	}
}

func NewDebugPlayer() *Player {
	p := NewPlayer()
	p.CanKick = true
	p.CanPunch = true
	p.CanHold = true
	p.MaxPlacableBombsCount = 10

	return p
}

func (p *Player) CanPlaceBomb() bool {
	return p.PlacedBombsCount < p.MaxPlacableBombsCount
}

func (p *Player) AddKickingBomb(id BombId) {
	p.mu.Lock()
	p.kickingBombs = append(p.kickingBombs, id)
	p.mu.Unlock()
}

func (p *Player) RemoveKickingBomb(id BombId) {
	p.mu.Lock()
	p.kickingBombs = slices.DeleteFunc(p.kickingBombs, func(b uuid.UUID) bool { return b == id })
	p.mu.Unlock()
}

func (p *Player) PeekKickingBomb() (BombId, bool) {
	p.mu.Lock()
	defer p.mu.Unlock()

	if len(p.kickingBombs) == 0 {
		return uuid.Nil, false
	}
	return p.kickingBombs[0], true
}

type ClientPlayer struct {
	Name      string `json:"name"`
	InitIndex Index  `json:"initIndex"`
}

type Position struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
	Z float64 `json:"z"`
}
