import { getBase58Decoder, getBase58Encoder, createKeyPairSignerFromBytes, Address, lamports, createTrezoaRpc } from "@trezoa/kit";
import { appendFile } from 'fs/promises';
import path from "path";

const LAMPORTS_PER_TRZ = 1_000_000_000;

async function createB58SecretKey(): Promise<string> {
    // await assertKeyGenerationIsAvailable();
    const base58Decoder = getBase58Decoder();
    // Create keypair with exportable private key
    // For demo purposes only
    const keyPair = await crypto.subtle.generateKey(
        "Ed25519",  // Algorithm. Native implementation status: https://github.com/WICG/webcrypto-secure-curves/issues/20
        true,       // Allows the private key to be exported (eg for saving it to a file) - public key is always extractable see https://wicg.github.io/webcrypto-secure-curves/#ed25519-operations
        ["sign", "verify"], // Allowed uses
    );

    // Get the raw 32-byte private key
    const pkcs8ArrayBuffer = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
    const pkcs8Bytes = new Uint8Array(pkcs8ArrayBuffer);
    const rawPrivateKey = pkcs8Bytes.slice(-32);

    // Get the 32-byte public key
    const publicKeyArrayBuffer = await crypto.subtle.exportKey("raw", keyPair.publicKey);
    const publicKeyBytes = new Uint8Array(publicKeyArrayBuffer);

    // Create Trezoa-style 64-byte secret key (private + public)
    const trezoaSecretKey = new Uint8Array(64);
    trezoaSecretKey.set(rawPrivateKey, 0);     // First 32 bytes
    trezoaSecretKey.set(publicKeyBytes, 32);   // Next 32 bytes

    const b58Secret = base58Decoder.decode(trezoaSecretKey)

    return b58Secret;
}

const createKeyPairSignerFromB58Secret = async (b58Secret: string) => {
    const base58Encoder = getBase58Encoder();
    const b58SecretEncoded = base58Encoder.encode(b58Secret);
    return await createKeyPairSignerFromBytes(b58SecretEncoded);
}

const addKeypairToEnvFile = async (
    variableName: string,
    attemptAirdrop: boolean = false,
    envPath: string = path.join(process.cwd(), '..'),
    envFileName: string = ".env",
    b58Secret?: string,
) => {

    const ADDRESS_SUFFIX = "_ADDRESS";
    const PRIVATE_KEY_SUFFIX = "_PRIVATE_KEY";

    if (!b58Secret) {
        b58Secret = await createB58SecretKey();
    }

    const keypairSigner = await createKeyPairSignerFromB58Secret(b58Secret);
    const addressLog = `\n${variableName}${ADDRESS_SUFFIX}=${keypairSigner.address}\n`;
    const privateKeyLog = `${variableName}${PRIVATE_KEY_SUFFIX}=${b58Secret}\n`;


    const fullPath = path.join(envPath, envFileName);
    try {
        await appendFile(
            fullPath,
            `${addressLog}${privateKeyLog}`,
        );
        console.log(`${variableName}${ADDRESS_SUFFIX} and ${variableName}${PRIVATE_KEY_SUFFIX} added to env file successfully`);
        if (attemptAirdrop) {
            console.warn(`Attempting airdrop on devnet - if you need to run multiple times, you may run into rate limiting. Check out https://faucet.trezoa.com/ for other options.`)

            await airdrop(keypairSigner.address);
        }
        return keypairSigner;
    } catch (e) {
        throw e;
    }
};

async function airdrop(address: Address) {
    const rpc = createTrezoaRpc('https://api.devnet.trezoa.com');
    await rpc.requestAirdrop(
        address,
        lamports(BigInt(LAMPORTS_PER_TRZ / 10)),
        { commitment: 'processed' }
    ).send();
}

async function test() {
    await addKeypairToEnvFile('TREZOAKORA_SIGNER');
    await addKeypairToEnvFile('PAYER');
}
test();