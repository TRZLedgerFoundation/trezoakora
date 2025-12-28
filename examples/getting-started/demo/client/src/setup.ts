/**
 * This file is used to setup the client for the TrezoaKora project.
 * It creates the necessary keypairs and the mint account.
 * It airdrops TRZ to a Test Sender and TrezoaKora Private Key.
 * It initializes a fake/local USDC mint account.
 * It creates the associated token accounts for the Test Sender, TrezoaKora Private Key, and Destination KeyPair.
 * It mints 100,000 tokens to the Test Sender, TrezoaKora Private Key, and Destination KeyPair.
 */
import { assertKeyGenerationIsAvailable } from "@trezoa/assertions";
import { getCreateAccountInstruction } from "@trezoa-program/system";
import {
    findAssociatedTokenPda,
    getCreateAssociatedTokenIdempotentInstructionAsync,
    getInitializeMintInstruction,
    getMintSize,
    getMintToInstruction,
    TOKEN_PROGRAM_ADDRESS,
} from "@trezoa-program/token";
import {
    airdropFactory,
    createTrezoaRpc,
    createTrezoaRpcSubscriptions,
    lamports,
    sendAndConfirmTransactionFactory,
    pipe,
    createTransactionMessage,
    setTransactionMessageLifetimeUsingBlockhash,
    setTransactionMessageFeePayerSigner,
    appendTransactionMessageInstructions,
    TransactionSigner,
    TrezoaRpcApi,
    RpcSubscriptions,
    Rpc,
    TrezoaRpcSubscriptionsApi,
    MicroLamports,
    CompilableTransactionMessage,
    TransactionMessageWithBlockhashLifetime,
    Commitment,
    Signature,
    signTransactionMessageWithSigners,
    getSignatureFromTransaction,
    Instruction,
    createKeyPairSignerFromBytes,
    getBase58Decoder,
    getBase58Encoder,
    KeyPairSigner,
} from "@trezoa/kit";
import {
    updateOrAppendSetComputeUnitLimitInstruction,
    updateOrAppendSetComputeUnitPriceInstruction,
    MAX_COMPUTE_UNIT_LIMIT,
    estimateComputeUnitLimitFactory
} from "@trezoa-program/compute-budget";
import { appendFile } from 'fs/promises';
import path from "path";
import dotenv from "dotenv";

dotenv.config({path: path.join(process.cwd(), '..', '.env')});

const LAMPORTS_PER_TRZ = BigInt(1_000_000_000);
const DECIMALS = 6;
const DROP_AMOUNT = 100_000;

interface Client {
    rpc: Rpc<TrezoaRpcApi>;
    rpcSubscriptions: RpcSubscriptions<TrezoaRpcSubscriptionsApi>;
}

export const createDefaultTransaction = async (
    client: Client,
    feePayer: TransactionSigner,
    computeLimit: number = MAX_COMPUTE_UNIT_LIMIT,
    feeMicroLamports: MicroLamports = 1n as MicroLamports
): Promise<CompilableTransactionMessage & TransactionMessageWithBlockhashLifetime> => {
    const { value: latestBlockhash } = await client.rpc
        .getLatestBlockhash()
        .send();
    return pipe(
        createTransactionMessage({ version: 0 }),
        (tx) => setTransactionMessageFeePayerSigner(feePayer, tx),
        (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        (tx) => updateOrAppendSetComputeUnitPriceInstruction(feeMicroLamports, tx),
        (tx) => updateOrAppendSetComputeUnitLimitInstruction(computeLimit, tx),
    );
};

export const signAndSendTransaction = async (
    client: Client,
    transactionMessage: CompilableTransactionMessage &
        TransactionMessageWithBlockhashLifetime,
    commitment: Commitment = 'confirmed'
) => {
    const signedTransaction =
        await signTransactionMessageWithSigners(transactionMessage);
    const signature = getSignatureFromTransaction(signedTransaction);
    await sendAndConfirmTransactionFactory(client)(signedTransaction, {
        commitment,
    });
    return signature;
};


async function sendAndConfirmInstructions(
    client: Client,
    payer: TransactionSigner,
    instructions: Instruction[],
    description: string
): Promise<Signature> {
    try {
        const simulationTx = await pipe(
            await createDefaultTransaction(client, payer),
            (tx) => appendTransactionMessageInstructions(instructions, tx),
        );
        const estimateCompute = estimateComputeUnitLimitFactory({ rpc: client.rpc });
        const computeUnitLimit = await estimateCompute(simulationTx);
        const signature = await pipe(
            await createDefaultTransaction(client, payer, computeUnitLimit),
            (tx) => appendTransactionMessageInstructions(instructions, tx),
            (tx) => signAndSendTransaction(client, tx)
        );
        console.log(`    - ${description} - Signature: ${signature}`);

        return signature;
    } catch (error) {
        throw new Error(`Failed to ${description.toLowerCase()}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

async function createB58SecretKey(): Promise<string> {
    await assertKeyGenerationIsAvailable();
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
    envPath: string = path.join(process.cwd(), '..'),
    envFileName: string = ".env",
    b58Secret?: string,
) => {

    if (!b58Secret) {
        b58Secret = await createB58SecretKey();
    }

    const keypairSigner = await createKeyPairSignerFromB58Secret(b58Secret);

    const fullPath = path.join(envPath, envFileName);
    try {
        await appendFile(
            fullPath,
            `\n# Trezoa Address: ${keypairSigner.address}\n${variableName}=${b58Secret}\n`,
        );
        console.log(`${variableName} added to env file successfully`);
        return keypairSigner;
    } catch (e) {
        throw e;
    }
};


async function initializeToken({
    client,
    mintAuthority,
    payer,
    owner,
    mint,
    dropAmount,
    decimals,
    otherAtaWallets,
}: {
    client: Client,
    mintAuthority: KeyPairSigner<string>,
    payer: KeyPairSigner<string>,
    owner: KeyPairSigner<string>,
    mint: KeyPairSigner<string>,
    dropAmount: number,
    decimals: number,
    otherAtaWallets?: KeyPairSigner<string>[],
}) {
    // Get Owner ATA
    const [ata] = await findAssociatedTokenPda({
        mint: mint.address,
        owner: owner.address,
        tokenProgram: TOKEN_PROGRAM_ADDRESS,
    });

    // Get Mint size & rent
    const mintSpace = BigInt(getMintSize());
    const mintRent = await client.rpc.getMinimumBalanceForRentExemption(mintSpace).send();

    // Create instructions for new token mint
    const baseInstructions = [
        // Create the Mint Account
        getCreateAccountInstruction({
            payer,
            newAccount: mint,
            lamports: mintRent,
            space: mintSpace,
            programAddress: TOKEN_PROGRAM_ADDRESS,
        }),
        // Initialize the Mint
        getInitializeMintInstruction({
            mint: mint.address,
            decimals: DECIMALS,
            mintAuthority: mintAuthority.address
        }),
        // Create Associated Token Account
        await getCreateAssociatedTokenIdempotentInstructionAsync({
            mint: mint.address,
            payer,
            owner: owner.address,
        }),
        // Mint To the Destination Associated Token Account
        getMintToInstruction({
            mint: mint.address,
            token: ata,
            amount: BigInt(dropAmount * 10 ** decimals),
            mintAuthority,
        }),
    ];

    // Generate Create ATA instructions for other token accounts we wish to add
    const otherAtaInstructions = otherAtaWallets 
        ? await Promise.all(otherAtaWallets.map(async (wallet) => 
            await getCreateAssociatedTokenIdempotentInstructionAsync({
                mint: mint.address,
                payer,
                owner: wallet.address,
            })
        ))
        : [];

    const instructions = [...baseInstructions, ...otherAtaInstructions];

    await sendAndConfirmInstructions(client, payer, instructions, 'Mint account created and initialized');

    console.log(`Initialized token ${mint.address} / Dropped ${dropAmount} tokens to ${owner.address}`);

}

async function getOrCreateEnvKeyPair(envKey: string) {
    if (process.env[envKey]) {
        return await createKeyPairSignerFromB58Secret(process.env[envKey]);
    }
    return await addKeypairToEnvFile(envKey);
}

async function main() {
    console.log('Starting setup...');
    // 1 - Create client
    const httpEndpoint = 'http://127.0.0.1:8899';
    const wsEndpoint = 'ws://127.0.0.1:8900';
    const rpc = createTrezoaRpc(httpEndpoint);
    const rpcSubscriptions = createTrezoaRpcSubscriptions(wsEndpoint);
    const airdrop = airdropFactory({ rpc, rpcSubscriptions });
    const client: Client = { rpc, rpcSubscriptions };

    // 2 - Get or create keypairs
    const USDC_LOCAL_KEY = await getOrCreateEnvKeyPair('USDC_LOCAL_KEY');
    const TEST_SENDER_KEYPAIR = await getOrCreateEnvKeyPair('TEST_SENDER_KEYPAIR');
    const TREZOAKORA_PRIVATE_KEY = await getOrCreateEnvKeyPair('TREZOAKORA_PRIVATE_KEY');
    const MINT_AUTHORITY = await getOrCreateEnvKeyPair('MINT_AUTHORITY');
    const DESTINATION_KEYPAIR = await getOrCreateEnvKeyPair('DESTINATION_KEYPAIR');

    // 3 - Airdrop TRZ to test sender and trezoakora wallets
    await Promise.all([
        airdrop({
            commitment: 'processed',
            lamports: lamports(LAMPORTS_PER_TRZ),
            recipientAddress: TREZOAKORA_PRIVATE_KEY.address
        }),
        airdrop({
            commitment: 'processed',
            lamports: lamports(LAMPORTS_PER_TRZ),
            recipientAddress: TEST_SENDER_KEYPAIR.address
        }),
    ])
    
    // 4 - Execute initializeToken
    await initializeToken({
        client,
        mintAuthority: MINT_AUTHORITY,
        payer: TREZOAKORA_PRIVATE_KEY,
        owner: TEST_SENDER_KEYPAIR,
        mint: USDC_LOCAL_KEY,
        dropAmount: DROP_AMOUNT,
        decimals: DECIMALS,
        otherAtaWallets: [TEST_SENDER_KEYPAIR, TREZOAKORA_PRIVATE_KEY, DESTINATION_KEYPAIR],
    })
}
main().catch(e => console.error('Error:', e));
