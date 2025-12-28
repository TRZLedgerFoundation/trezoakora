use crate::sanitize::sanitize_message;
use jsonrpsee::{core::Error as RpcError, types::error::CallError};
use serde::{Deserialize, Serialize};
use trezoa_client::client_error::ClientError;
use trezoa_program::program_error::ProgramError;
use trezoa_sdk::signature::SignerError;
use std::error::Error as StdError;
use thiserror::Error;

#[derive(Error, Debug, PartialEq, Eq, Serialize, Deserialize, Clone)]
pub enum TrezoaKoraError {
    #[error("Account {0} not found")]
    AccountNotFound(String),

    #[error("RPC error: {0}")]
    RpcError(String),

    #[error("Signing error: {0}")]
    SigningError(String),

    #[error("Invalid transaction: {0}")]
    InvalidTransaction(String),

    #[error("Transaction execution failed: {0}")]
    TransactionExecutionFailed(String),

    #[error("Fee estimation failed: {0}")]
    FeeEstimationFailed(String),

    #[error("Token {0} is not supported for fee payment")]
    UnsupportedFeeToken(String),

    #[error("Insufficient funds: {0}")]
    InsufficientFunds(String),

    #[error("Internal error: {0}")]
    InternalServerError(String),

    #[error("Validation error: {0}")]
    ValidationError(String),

    #[error("Serialization error: {0}")]
    SerializationError(String),

    #[error("Swap error: {0}")]
    SwapError(String),

    #[error("Token operation failed: {0}")]
    TokenOperationError(String),

    #[error("Invalid request: {0}")]
    InvalidRequest(String),

    #[error("Unauthorized: {0}")]
    Unauthorized(String),

    #[error("Rate limit exceeded")]
    RateLimitExceeded,

    #[error("Usage limit exceeded: {0}")]
    UsageLimitExceeded(String),

    #[error("Invalid configuration for TrezoaKora")]
    ConfigError,
}

impl From<ClientError> for TrezoaKoraError {
    fn from(e: ClientError) -> Self {
        let error_string = e.to_string();
        let sanitized_error_string = sanitize_message(&error_string);
        if error_string.contains("AccountNotFound")
            || error_string.contains("could not find account")
        {
            #[cfg(feature = "unsafe-debug")]
            {
                TrezoaKoraError::AccountNotFound(error_string)
            }
            #[cfg(not(feature = "unsafe-debug"))]
            {
                TrezoaKoraError::AccountNotFound(sanitized_error_string)
            }
        } else {
            #[cfg(feature = "unsafe-debug")]
            {
                TrezoaKoraError::RpcError(error_string)
            }
            #[cfg(not(feature = "unsafe-debug"))]
            {
                TrezoaKoraError::RpcError(sanitized_error_string)
            }
        }
    }
}

impl From<SignerError> for TrezoaKoraError {
    fn from(_e: SignerError) -> Self {
        #[cfg(feature = "unsafe-debug")]
        {
            TrezoaKoraError::SigningError(_e.to_string())
        }
        #[cfg(not(feature = "unsafe-debug"))]
        {
            TrezoaKoraError::SigningError(sanitize_message(&_e.to_string()))
        }
    }
}

impl From<bincode::Error> for TrezoaKoraError {
    fn from(_e: bincode::Error) -> Self {
        #[cfg(feature = "unsafe-debug")]
        {
            TrezoaKoraError::SerializationError(_e.to_string())
        }
        #[cfg(not(feature = "unsafe-debug"))]
        {
            TrezoaKoraError::SerializationError(sanitize_message(&_e.to_string()))
        }
    }
}

impl From<bs58::decode::Error> for TrezoaKoraError {
    fn from(_e: bs58::decode::Error) -> Self {
        #[cfg(feature = "unsafe-debug")]
        {
            TrezoaKoraError::SerializationError(_e.to_string())
        }
        #[cfg(not(feature = "unsafe-debug"))]
        {
            TrezoaKoraError::SerializationError(sanitize_message(&_e.to_string()))
        }
    }
}

impl From<bs58::encode::Error> for TrezoaKoraError {
    fn from(_e: bs58::encode::Error) -> Self {
        #[cfg(feature = "unsafe-debug")]
        {
            TrezoaKoraError::SerializationError(_e.to_string())
        }
        #[cfg(not(feature = "unsafe-debug"))]
        {
            TrezoaKoraError::SerializationError(sanitize_message(&_e.to_string()))
        }
    }
}

impl From<std::io::Error> for TrezoaKoraError {
    fn from(_e: std::io::Error) -> Self {
        #[cfg(feature = "unsafe-debug")]
        {
            TrezoaKoraError::InternalServerError(_e.to_string())
        }
        #[cfg(not(feature = "unsafe-debug"))]
        {
            TrezoaKoraError::InternalServerError(sanitize_message(&_e.to_string()))
        }
    }
}

impl From<Box<dyn StdError>> for TrezoaKoraError {
    fn from(_e: Box<dyn StdError>) -> Self {
        #[cfg(feature = "unsafe-debug")]
        {
            TrezoaKoraError::InternalServerError(_e.to_string())
        }
        #[cfg(not(feature = "unsafe-debug"))]
        {
            TrezoaKoraError::InternalServerError(sanitize_message(&_e.to_string()))
        }
    }
}

impl From<Box<dyn StdError + Send + Sync>> for TrezoaKoraError {
    fn from(_e: Box<dyn StdError + Send + Sync>) -> Self {
        #[cfg(feature = "unsafe-debug")]
        {
            TrezoaKoraError::InternalServerError(_e.to_string())
        }
        #[cfg(not(feature = "unsafe-debug"))]
        {
            TrezoaKoraError::InternalServerError(sanitize_message(&_e.to_string()))
        }
    }
}

impl From<ProgramError> for TrezoaKoraError {
    fn from(_err: ProgramError) -> Self {
        #[cfg(feature = "unsafe-debug")]
        {
            TrezoaKoraError::InvalidTransaction(_err.to_string())
        }
        #[cfg(not(feature = "unsafe-debug"))]
        {
            TrezoaKoraError::InvalidTransaction(sanitize_message(&_err.to_string()))
        }
    }
}

impl From<TrezoaKoraError> for RpcError {
    fn from(err: TrezoaKoraError) -> Self {
        match err {
            TrezoaKoraError::AccountNotFound(_)
            | TrezoaKoraError::InvalidTransaction(_)
            | TrezoaKoraError::ValidationError(_)
            | TrezoaKoraError::UnsupportedFeeToken(_)
            | TrezoaKoraError::InsufficientFunds(_) => invalid_request(err),

            TrezoaKoraError::InternalServerError(_) | TrezoaKoraError::SerializationError(_) => {
                internal_server_error(err)
            }

            _ => invalid_request(err),
        }
    }
}

pub fn invalid_request(e: TrezoaKoraError) -> RpcError {
    RpcError::Call(CallError::from_std_error(e))
}

pub fn internal_server_error(e: TrezoaKoraError) -> RpcError {
    RpcError::Call(CallError::from_std_error(e))
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KoraResponse<T> {
    pub data: Option<T>,
    pub error: Option<TrezoaKoraError>,
}

impl<T> KoraResponse<T> {
    pub fn ok(data: T) -> Self {
        Self { data: Some(data), error: None }
    }

    pub fn err(error: TrezoaKoraError) -> Self {
        Self { data: None, error: Some(error) }
    }

    pub fn from_result(result: Result<T, TrezoaKoraError>) -> Self {
        match result {
            Ok(data) => Self::ok(data),
            Err(error) => Self::err(error),
        }
    }
}

// Extension trait for Result<T, E> to convert to KoraResponse
pub trait IntoKoraResponse<T> {
    fn into_response(self) -> KoraResponse<T>;
}

impl<T, E: Into<TrezoaKoraError>> IntoKoraResponse<T> for Result<T, E> {
    fn into_response(self) -> KoraResponse<T> {
        match self {
            Ok(data) => KoraResponse::ok(data),
            Err(e) => KoraResponse::err(e.into()),
        }
    }
}

impl From<anyhow::Error> for TrezoaKoraError {
    fn from(_err: anyhow::Error) -> Self {
        #[cfg(feature = "unsafe-debug")]
        {
            TrezoaKoraError::SigningError(_err.to_string())
        }
        #[cfg(not(feature = "unsafe-debug"))]
        {
            TrezoaKoraError::SigningError(sanitize_message(&_err.to_string()))
        }
    }
}

impl From<trezoa_keychain::SignerError> for TrezoaKoraError {
    fn from(_err: trezoa_keychain::SignerError) -> Self {
        #[cfg(feature = "unsafe-debug")]
        {
            TrezoaKoraError::SigningError(_err.to_string())
        }
        #[cfg(not(feature = "unsafe-debug"))]
        {
            TrezoaKoraError::SigningError(sanitize_message(&_err.to_string()))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use trezoa_program::program_error::ProgramError;
    use std::error::Error as StdError;

    #[test]
    fn test_trezoakora_response_ok() {
        let response = KoraResponse::ok(42);
        assert_eq!(response.data, Some(42));
        assert_eq!(response.error, None);
    }

    #[test]
    fn test_trezoakora_response_err() {
        let error = TrezoaKoraError::AccountNotFound("test_account".to_string());
        let response: KoraResponse<()> = KoraResponse::err(error.clone());
        assert_eq!(response.data, None);
        assert_eq!(response.error, Some(error));
    }

    #[test]
    fn test_trezoakora_response_from_result() {
        let ok_response = KoraResponse::from_result(Ok(42));
        assert_eq!(ok_response.data, Some(42));
        assert_eq!(ok_response.error, None);

        let error = TrezoaKoraError::ValidationError("test error".to_string());
        let err_response: KoraResponse<i32> = KoraResponse::from_result(Err(error.clone()));
        assert_eq!(err_response.data, None);
        assert_eq!(err_response.error, Some(error));
    }

    #[test]
    fn test_into_trezoakora_response() {
        let result: Result<i32, TrezoaKoraError> = Ok(42);
        let response = result.into_response();
        assert_eq!(response.data, Some(42));
        assert_eq!(response.error, None);

        let error = TrezoaKoraError::SwapError("swap failed".to_string());
        let result: Result<i32, TrezoaKoraError> = Err(error.clone());
        let response = result.into_response();
        assert_eq!(response.data, None);
        assert_eq!(response.error, Some(error));
    }

    #[test]
    fn test_client_error_conversion() {
        let client_error = ClientError::from(std::io::Error::other("test"));
        let trezoakora_error: TrezoaKoraError = client_error.into();
        assert!(matches!(trezoakora_error, TrezoaKoraError::RpcError(_)));
        // With sanitization, error message context is preserved unless it contains sensitive data
        if let TrezoaKoraError::RpcError(msg) = trezoakora_error {
            assert!(msg.contains("test"));
        }
    }

    #[test]
    fn test_signer_error_conversion() {
        let signer_error = SignerError::Custom("signing failed".to_string());
        let trezoakora_error: TrezoaKoraError = signer_error.into();
        assert!(matches!(trezoakora_error, TrezoaKoraError::SigningError(_)));
        // With sanitization, error message context is preserved unless it contains sensitive data
        if let TrezoaKoraError::SigningError(msg) = trezoakora_error {
            assert!(msg.contains("signing failed"));
        }
    }

    #[test]
    fn test_bincode_error_conversion() {
        let bincode_error = bincode::Error::from(bincode::ErrorKind::SizeLimit);
        let trezoakora_error: TrezoaKoraError = bincode_error.into();
        assert!(matches!(trezoakora_error, TrezoaKoraError::SerializationError(_)));
    }

    #[test]
    fn test_bs58_decode_error_conversion() {
        let bs58_error = bs58::decode::Error::InvalidCharacter { character: 'x', index: 0 };
        let trezoakora_error: TrezoaKoraError = bs58_error.into();
        assert!(matches!(trezoakora_error, TrezoaKoraError::SerializationError(_)));
    }

    #[test]
    fn test_bs58_encode_error_conversion() {
        let buffer_too_small_error = bs58::encode::Error::BufferTooSmall;
        let trezoakora_error: TrezoaKoraError = buffer_too_small_error.into();
        assert!(matches!(trezoakora_error, TrezoaKoraError::SerializationError(_)));
    }

    #[test]
    fn test_io_error_conversion() {
        let io_error = std::io::Error::other("file not found");
        let trezoakora_error: TrezoaKoraError = io_error.into();
        assert!(matches!(trezoakora_error, TrezoaKoraError::InternalServerError(_)));
        // With sanitization, error message context is preserved unless it contains sensitive data
        if let TrezoaKoraError::InternalServerError(msg) = trezoakora_error {
            assert!(msg.contains("file not found"));
        }
    }

    #[test]
    fn test_boxed_error_conversion() {
        let error: Box<dyn StdError> = Box::new(std::io::Error::other("boxed error"));
        let trezoakora_error: TrezoaKoraError = error.into();
        assert!(matches!(trezoakora_error, TrezoaKoraError::InternalServerError(_)));
    }

    #[test]
    fn test_boxed_error_send_sync_conversion() {
        let error: Box<dyn StdError + Send + Sync> =
            Box::new(std::io::Error::other("boxed send sync error"));
        let trezoakora_error: TrezoaKoraError = error.into();
        assert!(matches!(trezoakora_error, TrezoaKoraError::InternalServerError(_)));
    }

    #[test]
    fn test_program_error_conversion() {
        let program_error = ProgramError::InvalidAccountData;
        let trezoakora_error: TrezoaKoraError = program_error.into();
        assert!(matches!(trezoakora_error, TrezoaKoraError::InvalidTransaction(_)));
        if let TrezoaKoraError::InvalidTransaction(msg) = trezoakora_error {
            // Just check that the error is converted properly, don't rely on specific formatting
            assert!(!msg.is_empty());
        }
    }

    #[test]
    fn test_anyhow_error_conversion() {
        let anyhow_error = anyhow::anyhow!("something went wrong");
        let trezoakora_error: TrezoaKoraError = anyhow_error.into();
        assert!(matches!(trezoakora_error, TrezoaKoraError::SigningError(_)));
        // With sanitization, error message context is preserved unless it contains sensitive data
        if let TrezoaKoraError::SigningError(msg) = trezoakora_error {
            assert!(msg.contains("something went wrong"));
        }
    }

    #[test]
    fn test_trezoakora_error_to_rpc_error_invalid_request() {
        let test_cases = vec![
            TrezoaKoraError::AccountNotFound("test".to_string()),
            TrezoaKoraError::InvalidTransaction("test".to_string()),
            TrezoaKoraError::ValidationError("test".to_string()),
            TrezoaKoraError::UnsupportedFeeToken("test".to_string()),
            TrezoaKoraError::InsufficientFunds("test".to_string()),
        ];

        for trezoakora_error in test_cases {
            let rpc_error: RpcError = trezoakora_error.into();
            assert!(matches!(rpc_error, RpcError::Call(_)));
        }
    }

    #[test]
    fn test_trezoakora_error_to_rpc_error_internal_server() {
        let test_cases = vec![
            TrezoaKoraError::InternalServerError("test".to_string()),
            TrezoaKoraError::SerializationError("test".to_string()),
        ];

        for trezoakora_error in test_cases {
            let rpc_error: RpcError = trezoakora_error.into();
            assert!(matches!(rpc_error, RpcError::Call(_)));
        }
    }

    #[test]
    fn test_trezoakora_error_to_rpc_error_default_case() {
        let other_errors = vec![
            TrezoaKoraError::RpcError("test".to_string()),
            TrezoaKoraError::SigningError("test".to_string()),
            TrezoaKoraError::TransactionExecutionFailed("test".to_string()),
            TrezoaKoraError::FeeEstimationFailed("test".to_string()),
            TrezoaKoraError::SwapError("test".to_string()),
            TrezoaKoraError::TokenOperationError("test".to_string()),
            TrezoaKoraError::InvalidRequest("test".to_string()),
            TrezoaKoraError::Unauthorized("test".to_string()),
            TrezoaKoraError::RateLimitExceeded,
        ];

        for trezoakora_error in other_errors {
            let rpc_error: RpcError = trezoakora_error.into();
            assert!(matches!(rpc_error, RpcError::Call(_)));
        }
    }

    #[test]
    fn test_invalid_request_function() {
        let error = TrezoaKoraError::ValidationError("invalid input".to_string());
        let rpc_error = invalid_request(error);
        assert!(matches!(rpc_error, RpcError::Call(_)));
    }

    #[test]
    fn test_internal_server_error_function() {
        let error = TrezoaKoraError::InternalServerError("server panic".to_string());
        let rpc_error = internal_server_error(error);
        assert!(matches!(rpc_error, RpcError::Call(_)));
    }

    #[test]
    fn test_into_trezoakora_response_with_different_error_types() {
        let io_result: Result<String, std::io::Error> = Err(std::io::Error::other("test"));
        let response = io_result.into_response();
        assert_eq!(response.data, None);
        assert!(matches!(response.error, Some(TrezoaKoraError::InternalServerError(_))));

        let signer_result: Result<String, SignerError> =
            Err(SignerError::Custom("test".to_string()));
        let response = signer_result.into_response();
        assert_eq!(response.data, None);
        assert!(matches!(response.error, Some(TrezoaKoraError::SigningError(_))));
    }

    #[test]
    fn test_trezoakora_error_display() {
        let error = TrezoaKoraError::AccountNotFound("test_account".to_string());
        let display_string = format!("{error}");
        assert_eq!(display_string, "Account test_account not found");

        let error = TrezoaKoraError::RateLimitExceeded;
        let display_string = format!("{error}");
        assert_eq!(display_string, "Rate limit exceeded");
    }

    #[test]
    fn test_trezoakora_error_debug() {
        let error = TrezoaKoraError::ValidationError("test".to_string());
        let debug_string = format!("{error:?}");
        assert!(debug_string.contains("ValidationError"));
    }

    #[test]
    fn test_trezoakora_error_clone() {
        let error = TrezoaKoraError::SwapError("original".to_string());
        let cloned = error.clone();
        assert_eq!(error, cloned);
    }

    #[test]
    fn test_trezoakora_response_serialization() {
        let response = KoraResponse::ok("test_data".to_string());
        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("test_data"));

        let error_response: KoraResponse<String> =
            KoraResponse::err(TrezoaKoraError::ValidationError("test".to_string()));
        let error_json = serde_json::to_string(&error_response).unwrap();
        assert!(error_json.contains("ValidationError"));
    }
}
