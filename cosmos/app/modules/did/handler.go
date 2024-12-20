package did

import (
	"fmt"

	sdk "github.com/cosmos/cosmos-sdk/types"
)

// NewHandler creates a handler for DID messages.
func NewHandler(k Keeper) sdk.Handler {
	return func(ctx sdk.Context, msg sdk.Msg) (*sdk.Result, error) {
		switch msg := msg.(type) {
		case MsgCreateDID:
			return handleMsgCreateDID(ctx, k, msg)
		default:
			return nil, fmt.Errorf("unrecognized DID message type: %T", msg)
		}
	}
}

func handleMsgCreateDID(ctx sdk.Context, k Keeper, msg MsgCreateDID) (*sdk.Result, error) {
	did := DIDDocument{
		ID:               msg.ID,
		PublicKey:        msg.PublicKey,
		ServiceEndpoints: msg.ServiceEndpoints,
		Authentication:   msg.Authentication,
	}
	if err := k.CreateDID(ctx, did); err != nil {
		return nil, err
	}
	return &sdk.Result{}, nil
}
