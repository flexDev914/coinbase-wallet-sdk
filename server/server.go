// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package server

import (
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/CoinbaseWallet/walletlinkd/server/rpc"
	"github.com/CoinbaseWallet/walletlinkd/store"
	"github.com/gorilla/mux"
)

// Server - server
type Server struct {
	router       *mux.Router
	store        store.Store
	agentPubSub  *rpc.PubSub
	signerPubSub *rpc.PubSub
}

// NewServer - construct a Server
func NewServer() *Server {
	router := mux.NewRouter()
	srv := &Server{
		router:       router,
		store:        store.NewMemoryStore(),
		agentPubSub:  rpc.NewPubSub(),
		signerPubSub: rpc.NewPubSub(),
	}

	router.HandleFunc("/rpc/agent", srv.rpcAgentHandler).Methods("GET")
	router.HandleFunc("/rpc/signer", srv.rpcSignerHandler).Methods("GET")
	router.HandleFunc("/", srv.rootHandler).Methods("GET")

	return srv
}

// Start - start the server
func (s *Server) Start(port string) {
	httpServer := &http.Server{
		Addr: fmt.Sprintf("0.0.0.0:%s", port),
		// Good practice to set timeouts to avoid Slowloris attacks.
		WriteTimeout: time.Second * 30,
		ReadTimeout:  time.Second * 30,
		IdleTimeout:  time.Second * 60,
		Handler:      s.router,
	}
	log.Fatal(httpServer.ListenAndServe())
}
