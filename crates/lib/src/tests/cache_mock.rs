use crate::{config::Config, error::TrezoaKoraError};
use mockall::mock;
use trezoa_client::nonblocking::rpc_client::RpcClient;
use trezoa_sdk::{account::Account, pubkey::Pubkey};

mock! {
    pub CacheUtil {
        pub async fn init() -> Result<(), TrezoaKoraError>;
        pub async fn get_account(
            config: &Config,
            rpc_client: &RpcClient,
            pubkey: &Pubkey,
            force_refresh: bool,
        ) -> Result<Account, TrezoaKoraError>;
    }
}
