package did

import (
	"fmt"

	"github.com/cosmos/cosmos-sdk/codec"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

// Keeper handles state interactions for the DID module.
type Keeper struct {
	storeKey sdk.StoreKey
	cdc      codec.BinaryCodec
}

// NewKeeper creates a new DID Keeper.
func NewKeeper(storeKey sdk.StoreKey, cdc codec.BinaryCodec) Keeper {
	return Keeper{
		storeKey: storeKey,
		cdc:      cdc,
	}
}

// CreateDID stores a new DID document in the blockchain state.
func (k Keeper) CreateDID(ctx sdk.Context, did DIDDocument) error {
	store := ctx.KVStore(k.storeKey)
	key := []byte(did.ID)
	if store.Has(key) {
		return fmt.Errorf("DID already exists")
	}
	value := k.cdc.MustMarshalBinaryLengthPrefixed(&did)
	store.Set(key, value)
	return nil
}

// GetDID retrieves a DID document from the blockchain state.
func (k Keeper) GetDID(ctx sdk.Context, id string) (DIDDocument, error) {
	store := ctx.KVStore(k.storeKey)
	value := store.Get([]byte(id))
	if value == nil {
		return DIDDocument{}, fmt.Errorf("DID not found")
	}
	var did DIDDocument
	k.cdc.MustUnmarshalBinaryLengthPrefixed(value, &did)
	return did, nil
}
