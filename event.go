package main

import (
	"bomber-man/domain"
	"bomber-man/domain/field_builder"
	"fmt"
	"log"
	"sort"
	"time"

	"github.com/zishang520/socket.io/v2/socket"
)

var games = map[socket.Room]*Game{}

func HandleGameEvent(io *socket.Server, client *socket.Socket) {
	var room socket.Room

	client.On("disconnect", func(...any) {
		removePlayer(room, client.Id())
		client.To(room).Emit("left_player", client.Id())
	})

	client.On("join", func(data ...any) {
		room = socket.Room((data[0].(string)))

		// If game is playing, do not join
		if g, ok := games[room]; ok && g.state != GameStateDisposed {
			log.Printf("room %s is playing", room)
			client.Emit("error_room_is_playing")
			return
		}

		io.To(room).FetchSockets()(func(rs []*socket.RemoteSocket, err error) {
			if err != nil {
				log.Fatalf("FetchSockets: %v", err)
				return
			}
			if len(rs) >= 4 {
				client.Emit("error_room_is_full")
				return
			}

			player := domain.ClientPlayer{
				JoinedTime: time.Now(),
				Id:         client.Id(),
				Name:       fmt.Sprintf("Player %s", client.Id()),
			}
			io.To(room).Emit("joined_player", player)

			client.Join(room)
			client.SetData(player)

			players := []domain.ClientPlayer{player}

			for _, r := range rs {
				players = append(players, r.Data().(domain.ClientPlayer))
			}

			sortedPlayers := sortPlayers(players)

			client.Emit("players", sortedPlayers)
		})
	})

	client.On("leave", func(data ...any) {
		io.To(room).FetchSockets()(func(rs []*socket.RemoteSocket, err error) {
			if err != nil {
				log.Fatalf("FetchSockets: %v", err)
				return
			}
			removePlayer(room, client.Id())

			client.To(room).Emit("left_player", client.Id())
			client.Leave(room)
			client.SetData(nil)
		})
	})

	client.On("start", func(data ...any) {
		builder := field_builder.NewSimpleFieldConfig()
		// builder := field_builder.NewDebugFieldBuilder()
		f := domain.NewField(builder, builder.Config())

		io.In(room).FetchSockets()(func(rs []*socket.RemoteSocket, err error) {
			if err != nil {
				log.Fatalf("FetchSockets: %v", err)
				return
			}

			ids := make([]socket.SocketId, 0)
			for _, r := range rs {
				ids = append(ids, r.Id())
			}

			if g := games[room]; g != nil {
				g.Dispose()
			}
			games[room] = NewGame(f, ids)

			io.To(room).Emit("field", f)
		})
	})

	client.On("move", func(data ...any) {
		client.To(room).Emit("move", data)
	})

	client.On("place_bomb", func(data ...any) {
		g := games[room]
		index := domain.NewIndexFromData(data[0])

		fmt.Println("place_bomb", index)

		go g.PlaceBomb(
			client.Id(),
			index,
			PlaceBombEvent{
				OnPlaced: func(bomb domain.Bomb) {
					emitBomb(io.To(room), bomb)
				},
				OnExploded: func(bombs []*domain.Bomb, diffs []domain.FieldDiff) {
					bombIds := make([]domain.BombId, 0)
					for _, b := range bombs {
						bombIds = append(bombIds, b.Id())
					}
					io.To(room).Emit("explode", bombIds, diffs)
				},
			},
		)
	})

	client.On("kick_bomb", func(data ...any) {
		g := games[room]
		playerIndex := domain.NewIndexFromData(data[0])
		dir := domain.NewIndexFromData(data[1])

		go g.KickBomb(
			client.Id(),
			playerIndex,
			dir,
			KickBombEvent{
				OnStartedMove: func(bomb domain.Bomb) {
					emitBomb(io.To(room), bomb)
				},
				OnMoved: func(bomb domain.Bomb) {
					emitBomb(io.To(room), bomb)
				},
				OnStopped: func(bomb domain.Bomb) {
					emitBomb(io.To(room), bomb)
				},
			},
		)
	})

	client.On("stop_bomb", func(data ...any) {
		g := games[room]

		go g.StopBomb(client.Id())
	})

	client.On("position", func(data ...any) {
		client.To(room).Emit("player_position", client.Id(), data[0])
	})

	client.On("angle", func(data ...any) {
		client.To(room).Emit("player_angle", client.Id(), data[0])
	})

	client.On("state", func(data ...any) {
		state := data[0].(string)
		if state == "Dead" {
			g := games[room]
			go g.Dead(client.Id(), DeadEvent{
				OnFinish: func(winnerId socket.SocketId) {
					io.To(room).Emit("finish", winnerId)
				},
				OnFinishSolo: func() {
					io.To(room).Emit("finish_solo")
				},
				OnDraw: func() {
					io.To(room).Emit("finish_draw")
				},
			})
		}
		client.To(room).Emit("player_state", client.Id(), state)
	})

	client.On("get_item", func(data ...any) {
		index := domain.NewIndexFromData(data[0])
		g := games[room]

		g.GetItem(client.Id(), index, GetItemEvent{
			OnSpeedUp: func() {
				client.Emit("speed_up")
			},
			OnGot: func() {
				io.To(room).Emit("got_item", index)
			},
		})
	})
}

func removePlayer(room socket.Room, id socket.SocketId) {
	g := games[room]
	if g != nil {
		g.RemovePlayer(id)
	}
}

func emitBomb(emitter *socket.BroadcastOperator, b domain.Bomb) {
	emitter.Emit("bomb", b.Client())
}

func sortPlayers(players []domain.ClientPlayer) []domain.ClientPlayer {
	sort.Slice(players, func(i, j int) bool {
		return players[i].JoinedTime.Before(players[j].JoinedTime)
	})
	return players
}
