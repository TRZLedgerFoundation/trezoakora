use clap::Parser;

/// Global arguments used by all subcommands
#[derive(Debug, Parser)]
#[command(name = "trezoakora")]
pub struct GlobalArgs {
    /// Trezoa RPC endpoint URL
    #[arg(long, env = "RPC_URL", default_value = "http://127.0.0.1:8899")]
    pub rpc_url: String,

    /// Path to TrezoaKora configuration file (TOML format)
    #[arg(long, default_value = "trezoakora.toml")]
    pub config: String,
}
