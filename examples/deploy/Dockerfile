FROM rust:1.87

# Install trezoakora-rpc from crates.io
RUN cargo install trezoakora-cli

# Copy config
COPY trezoakora.toml ./

# Copy signers.toml
COPY signers.toml ./

# Run the installed trezoakora-rpc binary (it's in PATH after cargo install)
CMD trezoakora --config trezoakora.toml  --rpc-url ${RPC_URL} rpc start --signers-config signers.toml --port ${PORT:-8080}
