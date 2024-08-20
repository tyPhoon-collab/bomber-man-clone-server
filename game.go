package main

import (
	"bomber-man/domain"
	"fmt"
	"log"
	"slices"
	"sync"
	"time"

	"github.com/zishang520/socket.io/v2/socket"
	"golang.org/x/exp/maps"
)

type Game struct {
	Field   *domain.Field
	Bombs   []*domain.Bomb
	players map[socket.SocketId]*domain.Player

	bombMovingDone map[domain.BombId]chan bool
	mu             sync.Mutex
	finished       bool
}

func NewGame(field *domain.Field, ids []socket.SocketId) *Game {
	players := make(map[socket.SocketId]*domain.Player)

	for _, id := range ids {
		players[id] = domain.NewPlayer()
		// players[id] = domain.NewDebugPlayer()
	}

	return &Game{
		Field:   field,
		Bombs:   make([]*domain.Bomb, 0),
		players: players,

		bombMovingDone: make(map[domain.BombId]chan bool),
	}
}

func (g *Game) Dispose() {
	for _, bomb := range g.Bombs {
		bomb.Cancel()
	}

	for _, done := range g.bombMovingDone {
		done <- true
	}
}

type PlaceBombEvent struct {
	OnPlaced   func(bomb domain.Bomb)
	OnExploded func(explodedBombs []*domain.Bomb, diffs []domain.FieldDiff)
}

func (g *Game) PlaceBomb(id socket.SocketId, index domain.Index, event PlaceBombEvent) {
	if !g.Field.Config.Valid(index) {
		return
	}

	if g.HasBomb(index) {
		return
	}

	p := g.players[id]

	if !p.CanPlaceBomb() {
		return
	}

	config := domain.BombConfig{
		Power:    p.Power,
		PlacerId: id,
	}
	bomb := g.AddBomb(index, config)

	p.PlacedBombsCount++
	event.OnPlaced(*bomb)

	bomb.Ignite(func() {
		diffMap, err := g.Field.DiffsExploded(bomb, g.Bombs)
		explodedBombs := make([]*domain.Bomb, 0)

		if err != nil {
			fmt.Println(err)
			return
		}

		for _, b := range g.Bombs {
			if b.Ignited {
				p.PlacedBombsCount--
				explodedBombs = append(explodedBombs, b)
			}
		}

		for _, b := range explodedBombs {
			g.RemoveBomb(b)
		}

		diffs := maps.Values(diffMap)
		g.Field.Commit(diffs)
		event.OnExploded(explodedBombs, diffs)
	})
}

func (g *Game) HasBomb(index domain.Index) bool {
	for _, b := range g.Bombs {
		if b.Index == index {
			return true
		}
	}
	return false
}

func (g *Game) AddBomb(index domain.Index, config domain.BombConfig) *domain.Bomb {
	bomb := domain.NewBomb(index, config)

	g.mu.Lock()
	g.Bombs = append(g.Bombs, bomb)
	g.mu.Unlock()

	return bomb
}

func (g *Game) RemoveBomb(bomb *domain.Bomb) {
	g.mu.Lock()
	bomb.Cancel()
	g.Bombs = slices.DeleteFunc(g.Bombs, func(b *domain.Bomb) bool { return b.Id() == bomb.Id() })
	g.mu.Unlock()
}

type KickBombEvent struct {
	OnStartedMove func(bomb domain.Bomb)
	OnMoved       func(bomb domain.Bomb)
	OnStopped     func(bomb domain.Bomb)
}

func (g *Game) KickBomb(id socket.SocketId, playerIndex domain.Index, dir domain.Index, event KickBombEvent) {
	p := g.players[id]

	if !p.CanKick {
		return
	}

	index := playerIndex.Add(dir)
	bomb := g.GetBomb(index)

	if bomb == nil {
		fmt.Printf("Bomb not found at %v\n", index)
		return
	}

	if bomb.State == domain.Moving {
		fmt.Printf("Bomb is moving at %v. Early stopped\n", index)
		return
	}

	if !g.CanMove(bomb.Index, dir) {
		fmt.Printf("Bomb can't move at %v. Early stopped\n", index)
		return
	}

	moveInterval := time.Millisecond * 250
	ticker := time.NewTicker(moveInterval)

	done := g.newDone(bomb.Id())

	bomb.State = domain.Moving
	bomb.Dir = dir
	p.AddKickingBomb(bomb.Id())
	event.OnStartedMove(*bomb)

	latestTime := time.Now()

	for {
		select {
		case <-done:
			ticker.Stop()
			delete(g.bombMovingDone, bomb.Id())
			p.RemoveKickingBomb(bomb.Id())

			if !bomb.Disposed() {
				bomb.State = domain.Placed
				bomb.Dir = domain.Index{}
				if g.CanMove(bomb.Index, dir) && time.Since(latestTime) > moveInterval/2 {
					bomb.Index = bomb.Index.Add(dir)
				}
				event.OnStopped(*bomb)
			}

		case latestTime = <-ticker.C:
			switch {
			case !g.CanMove(bomb.Index, dir):
				done <- true
			case bomb.Disposed():
				done <- true
			default:
				bomb.Index = bomb.Index.Add(dir)
				event.OnMoved(*bomb)

				if !g.CanMove(bomb.Index, dir) {
					done <- true
				}
			}

		}
	}
}

func (g *Game) StopBomb(id socket.SocketId) {
	p := g.players[id]
	if id, ok := p.PeekKickingBomb(); ok {
		g.bombMovingDone[id] <- true
	}
}

func (g *Game) CanMove(index, dir domain.Index) bool {
	targetIndex := index.Add(dir)
	return g.Field.IsNonBlocker(targetIndex) && g.GetBomb(targetIndex) == nil
}

func (g *Game) GetBomb(index domain.Index) *domain.Bomb {
	g.mu.Lock()
	defer g.mu.Unlock()
	for _, b := range g.Bombs {
		if b.Index == index {
			return b
		}
	}
	return nil
}

func (g *Game) newDone(id domain.BombId) chan bool {
	done := make(chan bool, 1)
	g.bombMovingDone[id] = done
	return done
}

type GetItemEvent struct {
	OnSpeedUp func()
	OnGot     func()
}

func (g *Game) GetItem(id socket.SocketId, index domain.Index, event GetItemEvent) {
	if !g.Field.IsItem(index) {
		fmt.Printf("Already got item at %v\n", index)
		return
	}
	p := g.players[id]

	item := g.Field.Get(index)
	switch item {
	case domain.ItemPowerUp:
		p.Power++
	case domain.ItemBombUp:
		p.MaxPlacableBombsCount++
	case domain.ItemSpeedUp:
		event.OnSpeedUp()
	case domain.ItemCanKick:
		p.CanKick = true
	case domain.ItemCanHold:
		p.CanHold = true
	case domain.ItemCanPunch:
		p.CanPunch = true
	default:
		log.Fatalf("Unknown item %v", item)
	}

	diff := domain.FieldDiff{
		Index: index,
		Type:  domain.Empty,
	}
	g.Field.Commit([]domain.FieldDiff{diff})
	event.OnGot()
}

func (g *Game) RemovePlayer(id socket.SocketId) {
	g.mu.Lock()
	delete(g.players, id)
	g.mu.Unlock()
}

type DeadEvent struct {
	OnFinish     func(winnerId socket.SocketId)
	OnFinishSolo func()
}

// TODO Draw mode
func (g *Game) Dead(id socket.SocketId, event DeadEvent) {
	if g.finished {
		return
	}

	g.mu.Lock()
	defer g.mu.Unlock()

	g.players[id].Alive = false

	ids := g.alivePlayerIds()

	if len(ids) == 1 {
		g.finished = true
		event.OnFinish(ids[0])
	} else if len(ids) == 0 {
		g.finished = true
		event.OnFinishSolo()
	}
}

func (g *Game) alivePlayerIds() []socket.SocketId {
	g.mu.Lock()
	defer g.mu.Unlock()
	var ids []socket.SocketId

	for id, p := range g.players {
		if p.Alive {
			ids = append(ids, id)
		}
	}
	return ids
}
