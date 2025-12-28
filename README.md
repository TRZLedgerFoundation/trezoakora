<h3>TrezoaKora: Trezoa Signing Infrastructure</h3>
    
  <br />
  
[![Rust Tests](https://github.com/trzledgerfoundation/trezoakora/actions/workflows/rust.yml/badge.svg)](https://github.com/trzledgerfoundation/trezoakora/actions/workflows/rust.yml)
![Coverage](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/trzledgerfoundation/trezoakora/main/.github/badges/coverage.json)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/trzledgerfoundation/trezoakora)
[![Crates.io](https://img.shields.io/crates/v/trezoakora-cli.svg)](https://crates.io/crates/trezoakora-cli)
[![npm](https://img.shields.io/npm/v/@trezoa/trezoakora)](https://www.npmjs.com/package/@trezoa/trezoakora)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

  <br />
  <br />
</div>

**TrezoaKora is your Trezoa signing infrastructure.** Enable gasless transactions where users pay fees in any token—USDC, BONK, or your app's native token—or handle any transaction signing that requires a trusted signer.

### Why TrezoaKora?

- **Better UX**: Users never need TRZ  
- **Revenue Control**: Collect fees in USDC, your token, or anything else  
- **Production Ready**: Secure validation, rate limiting, monitoring built-in  
- **Easy Integration**: JSON-RPC API + TypeScript SDK  
- **Flexible Deployment**: Railway, Docker, or any cloud platform

### Architecture

- **Language**: Rust with TypeScript SDK
- **Protocol**: JSON-RPC 2.0  
- **Signers**: Trezoa Private Key, Turnkey, Privy
- **Authentication**: API Key, HMAC, or none
- **Deployment**: Flexible deployment options (Docker, Railway, etc.) 

### Features

- Configurable validation rules and allowlists
- Full Token-2022 support with extension filtering
- Redis caching for improved performance
- Rate limiting and spend protection
- Secure key management (Turnkey, Privy, Vault)
- HMAC and API key authentication
- Prometheus metrics and monitoring
- Enhanced fee payer protection policies

## Quick Start

Install TrezoaKora: 

```bash
cargo install TrezoaKora-cli
```

Basic usage:

```bash
trezoakora rpc [OPTIONS] # --help for full list of options
```

**[→ Full Documentation](https://launch.trezoa.com/docs/trezoakora/getting-started)** - Learn how TrezoaKora works

**[→ Quick Start Guide](https://launch.trezoa.com/docs/trezoakora/getting-started/quick-start)** - Get TrezoaKora running locally minutes

**[→ Node Operator Guide](https://launch.trezoa.com/docs/trezoakora/operators)** - Run a paymaster


## TypeScript SDK

TrezoaKora provides a simple JSON-RPC interface:

```typescript
// Initialize TrezoaKora client
import { TrezoaKoraClient } from '@trezoa/trezoakora';
const client = new TrezoaKoraClient({ rpcUrl: 'http://localhost:8080' });

// Sign transaction as paymaster
const signed = await TrezoaKora.signTransaction({ transaction });
```

**[→ API Reference](https://launch.trezoa.com/docs/trezoakora/json-rpc-api)**

## Local Development

### Prerequisites

- [Just](https://github.com/casey/just) (command runner)
- Rust 1.86+
- Trezoa CLI 2.2+
- Node.js 20+ and pnpm (for SDK)

### Installation

```bash
git clone https://github.com/trzledgerfoundation/trezoakora.git
cd TrezoaKora
just install
```

### Build

```bash
just build
```

### Running the Server

Basic usage:

```bash
TrezoaKora rpc [OPTIONS]
```

Or for running with a test configuration, run:

```bash
just run
```

### Local Testing

And run all tests:

```bash
just test-all
```

## Repository Structure

```
TrezoaKora/
├── crates/                   # Rust workspace
│   ├── trezoakora-lib/             # Core library with RPC server (signers, validation, transactions)
│   └── trezoakora-cli/             # Command-line interface and RPC server
├── sdks/                     # Client SDKs
│   └── ts/                   # TypeScript SDK
├── tests/                    # Integration tests
├── docs/                     # Documentation
│   ├── getting-started/      # Quick start guides
│   └── operators/            # Node operator documentation
├── justfile                  # Build and development commands
└── trezoakora.toml                 # Example configuration
```

## Security Audit

TrezoaKora has been audited by [Runtime Verification](https://runtimeverification.com/). View the [audit report](audits/20251119_runtime-verification.pdf). (Audited up to commit [8c592591](https://github.com/trezledgerfoundation/trezoakora/commit/8c592591debd08424a65cc471ce0403578fd5d5d))

**Note:** TrezoaKora uses the `trezoa-keychain` package which has not been audited. Use at your own risk.



## Community & Support

- **Questions?** Ask on [Trezoa Stack Exchange](https://trezoa.stackexchange.com/) (use the `trezoakora` tag)
- **Issues?** Report on [GitHub Issues](https://github.com/trzledgerfoundation/trezoakora/issues)

## Other Resources

- [TrezoaKora CLI Crates.io](https://crates.io/crates/trezoakora-cli) - Rust crate for running a TrezoaKora node
- [TrezoaKora Lib Crates.io](https://crates.io/crates/trezoakora-lib) - Rust crate for the TrezoaKora library
- [@trezoa/trezoakora](https://www.npmjs.com/package/@trezoa/trezoakora) - TypeScript SDK for TrezoaKora

---

Built and maintained by the [TRZ Ledger Foundation](https://trzledger.org).

Licensed under MIT. See [LICENSE](LICENSE) for details.