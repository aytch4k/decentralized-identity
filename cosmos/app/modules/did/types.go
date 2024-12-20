package did

import (
	sdk "github.com/cosmos/cosmos-sdk/types"
)

// DIDDocument defines a decentralized identifier document structure.
type DIDDocument struct {
	ID               string   `json:"id"`
	PublicKey        string   `json:"public_key"`
	ServiceEndpoints []string `json:"service_endpoints"`
	Authentication   string   `json:"authentication"`
}

// MsgCreateDID represents a message for creating a DID.
type MsgCreateDID struct {
	ID               string   `json:"id"`
	PublicKey        string   `json:"public_key"`
	ServiceEndpoints []string `json:"service_endpoints"`
	Authentication   string   `json:"authentication"`
	Creator          sdk.AccAddress `json:"creator"`
}

// ValidateBasic performs basic validation of MsgCreateDID.
func (msg MsgCreateDID) ValidateBasic() error {
	if msg.ID == "" {
		return sdk.ErrUnknownRequest("DID ID cannot be empty")
	}
	if msg.PublicKey == "" {
		return sdk.ErrUnknownRequest("Public Key cannot be empty")
	}
	return nil
}
