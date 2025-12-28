use crate::{
    error::TrezoaKoraError,
    state::{get_config, get_signer_pool},
};
use serde::{Deserialize, Serialize};
use trezoa_keychain::TrezoaSigner;
use utoipa::ToSchema;

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct GetPayerSignerResponse {
    /// The recommended signer's public key
    pub signer_address: String,
    /// The payment destination owner address (same as signer if no separate paymaster is configured)
    pub payment_address: String,
}

pub async fn get_payer_signer() -> Result<GetPayerSignerResponse, TrezoaKoraError> {
    let config = get_config()?;
    let pool = get_signer_pool()?;

    // Get the next signer according to the configured strategy
    let signer = pool.get_next_signer()?;
    let signer_pubkey = signer.pubkey();
    // Get the payment destination address (falls back to signer if no payment address is configured)
    let payment_destination = config.trezoakora.get_payment_address(&signer_pubkey)?;

    Ok(GetPayerSignerResponse {
        signer_address: signer_pubkey.to_string(),
        payment_address: payment_destination.to_string(),
    })
}
