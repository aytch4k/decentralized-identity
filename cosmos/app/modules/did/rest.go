package did

import (
	"fmt"
	"net/http"

	"github.com/cosmos/cosmos-sdk/client"
	"github.com/gorilla/mux"
)

func RegisterRoutes(cliCtx client.Context, r *mux.Router) {
	r.HandleFunc("/dids", createDIDHandler(cliCtx)).Methods("POST")
	r.HandleFunc("/dids/{id}", queryDIDHandler(cliCtx)).Methods("GET")
}

func createDIDHandler(cliCtx client.Context) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var msg MsgCreateDID
		if err := cliCtx.Codec.UnmarshalJSON(r.Body, &msg); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		_, err := cliCtx.BroadcastTxSync(msg)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusOK)
	}
}

func queryDIDHandler(cliCtx client.Context) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		vars := mux.Vars(r)
		id := vars["id"]
		res, _, err := cliCtx.QueryWithData(fmt.Sprintf("custom/did/%s", id), nil)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.Write(res)
	}
}
