use std::{sync::Arc, time::Duration};

use trezoa_client::nonblocking::rpc_client::RpcClient;
use trezoa_commitment_config::CommitmentConfig;

pub fn get_rpc_client(rpc_url: &str) -> Arc<RpcClient> {
    Arc::new(RpcClient::new_with_timeout_and_commitment(
        rpc_url.to_string(),
        Duration::from_secs(90),
        CommitmentConfig::confirmed(),
    ))
}
