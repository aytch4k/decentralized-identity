package main

import (
	"os"

	"github.com/cosmos/cosmos-sdk/server"
	"github.com/cosmos/cosmos-sdk/server/cmd"
	"github.com/cosmos/cosmos-sdk/simapp"
	"github.com/cosmos/cosmos-sdk/types/module"
	"github.com/cosmos/cosmos-sdk/x/auth"
	"github.com/cosmos/cosmos-sdk/x/bank"
	didmodule "github.com/cosmos/app/modules/did" // Custom DID module
)

func main() {
	rootCmd, _ := NewRootCmd()
	if err := cmd.Execute(rootCmd, "", ""); err != nil {
		os.Exit(1)
	}
}

func NewRootCmd() (*cobra.Command, module.BasicManager) {
	encodingConfig := simapp.MakeTestEncodingConfig()
	app := simapp.NewSimApp(
		encodingConfig.Marshaler,
		encodingConfig.TxConfig,
		encodingConfig.Amino,
	)

	appModules := module.NewBasicManager(
		auth.AppModuleBasic{},
		bank.AppModuleBasic{},
		didmodule.AppModuleBasic{}, // Register DID module
	)

	rootCmd := cmd.RootCommand(app, appModules)
	return rootCmd, appModules
}
