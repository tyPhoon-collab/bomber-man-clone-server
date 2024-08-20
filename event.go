package main

import (
	"bomber-man/domain"
	"bomber-man/domain/field_builder"
	"fmt"
	"log"

	"github.com/zishang520/socket.io/v2/socket"
)

var games = map[socket.Room]*Game{}

func HandleGameEvent(io *socket.Server, client *socket.Socket) {
	var room socket.Room

	client.On("join", func(data ...any) {
		room = socket.Room((data[0].(string)))

		io.To(room).FetchSockets()(func(rs []*socket.RemoteSocket, err error) {
			if err != nil {
				log.Fatalf("FetchSockets: %v", err)
				return
			}
			if len(rs)+1 >= 4 {
				client.Emit("error_too_many_players")
			} else {
				client.Join(room)
				client.SetData(domain.ClientPlayer{
					Name: fmt.Sprintf("Player %d", len(rs)+1),
				})
				io.To(room).Emit("player_count", len(rs)+1) // 暫定でプレイヤー数を送る
			}
		})
	})

	client.On("leave", func(data ...any) {
		io.To(room).FetchSockets()(func(rs []*socket.RemoteSocket, err error) {
			if err != nil {
				log.Fatalf("FetchSockets: %v", err)
				return
			}

			g := games[room]

			if g != nil {
				g.RemovePlayer(client.Id())
			}

			client.Leave(room)
			client.SetData(nil)
			io.To(room).Emit("player_count", len(rs)-1) // 暫定でプレイヤー数を送る
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
			indexes := builder.InitialSpawnIndexes()

			if len(indexes) < len(rs) {
				log.Fatalf("not enough initial indexes")
			}

			players := make(map[socket.SocketId]domain.ClientPlayer, len(rs))

			for i, r := range rs {
				data := r.Data().(domain.ClientPlayer)
				data.InitIndex = indexes[i]
				players[r.Id()] = data
			}

			if g := games[room]; g != nil {
				g.Dispose()
			}
			games[room] = NewGame(f, players)

			io.To(room).Emit("field", f)
			io.To(room).Emit("players", players)
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
			g.Dead(client.Id(), DeadEvent{
				OnFinish: func(winnerId socket.SocketId) {
					io.To(room).Emit("finish", winnerId)
				},
				OnFinishSolo: func() {
					io.To(room).Emit("finish_solo")
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

func emitBomb(emitter *socket.BroadcastOperator, b domain.Bomb) {
	emitter.Emit("bomb", b.Client())
}
