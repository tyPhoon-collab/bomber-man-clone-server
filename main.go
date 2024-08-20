package main

import (
	"log"
	"net/http"
	"os"

	"github.com/rs/cors"
	"github.com/zishang520/socket.io/v2/socket"
)

func main() {
	io := socket.NewServer(nil, nil)

	handle(io)
	defer io.Close(nil)

	http.Handle("/socket.io/", io.ServeHandler(nil))

	port := port()
	log.Println("Socket.IO server listening at port " + port)
	err := http.ListenAndServe(":"+port, corsHandler())
	if err != nil {
		log.Fatal("ListenAndServe: ", err)
	}
}

func port() string {
	port := os.Getenv("PORT")
	if port == "" {
		return "8000"
	}
	return port
}

func corsHandler() http.Handler {
	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowCredentials: true,
	})
	return c.Handler(http.DefaultServeMux)
}

func handle(io *socket.Server) {
	io.On("connection", func(clients ...any) {
		client := clients[0].(*socket.Socket)
		log.Println("connection:", client.Id())

		client.On("error", func(err ...any) {
			log.Println("error:", err)
		})

		HandleGameEvent(io, client)
	})
}
