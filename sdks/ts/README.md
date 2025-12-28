# TrezoaKora TypeScript SDK

A TypeScript SDK for interacting with the TrezoaKora RPC server. This SDK provides a type-safe interface to all TrezoaKora RPC methods.

## Development

### Building from Source

```bash
# Install dependencies
pnpm install

# Build the SDK
pnpm run build
```

### Running Tests


Start your local TrezoaKora RPC Server from the root project directory: 

```bash
trezoakora --config tests/src/common/fixtures/trezoakora-test.toml rpc start --signers-config tests/src/common/fixtures/signers.toml
```

Tests rely on [Trezoa CLI's](https://trezoa.com/docs/intro/installation) local test validator. 

Run:

```bash
pnpm test:ci:integration
```

This will start a local test validator and run all tests.


## Quick Start

```typescript
import { TrezoaKoraClient } from '@trezoa/trezoakora';

// Initialize the client with your RPC endpoint
const client = new TrezoaKoraClient({ rpcUrl: 'http://localhost:8080' });

// Example: Transfer tokens
const result = await client.transferTransaction({
  amount: 1000000, // 1 USDC (6 decimals)
  token: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC mint
  source: "sourceAddress",
  destination: "destinationAddress"
});

// Access the base64 encoded transaction, base64 encoded message, and parsed instructions directly
console.log('Transaction:', result.transaction);
console.log('Message:', result.message);
console.log('Instructions:', result.instructions);
```

**[→ API Reference](https://launch.trezoa.com/docs/trezoakora/json-rpc-api)**
**[→ Quick Start](https://launch.trezoa.com/docs/trezoakora/getting-started/quick-start)**