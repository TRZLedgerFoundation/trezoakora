//! Re-exports for external signer infrastructure
//!
//! TrezoaKora uses trezoa-keychain crate as its signing infrastructure.
//! This module exists only for re-exporting convenience.

// Re-export the external signer for use throughout TrezoaKora
pub use trezoa_keychain::{Signer, TrezoaSigner};
