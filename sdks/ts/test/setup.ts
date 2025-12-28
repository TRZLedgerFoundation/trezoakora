import { getCreateAccountInstruction } from '@trezoa-program/system';
import {
    findAssociatedTokenPda,
    getCreateAssociatedTokenIdempotentInstructionAsync,
    getInitializeMintInstruction,
    getMintSize,
    getMintToInstruction,
    TOKEN_PROGRAM_ADDRESS,
} from '@trezoa-program/token';
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
    KeyPairSigner,
    Address,
    assertIsAddress,
    createKeyPairSignerFromBytes,
    getBase58Encoder,
} from '@trezoa/kit';
import {
    updateOrAppendSetComputeUnitLimitInstruction,
    updateOrAppendSetComputeUnitPriceInstruction,
    MAX_COMPUTE_UNIT_LIMIT,
    estimateComputeUnitLimitFactory,
} from '@trezoa-program/compute-budget';
import { config } from 'dotenv';
import path from 'path';
import { TrezoaKoraClient } from '../src/index.js';

config({ path: path.resolve(process.cwd(), '.env') });

const DEFAULTS = {
    DECIMALS: 6,
    TOKEN_DROP_AMOUNT: 100_000,
    TREZOAKORA_RPC_URL: 'http://localhost:8080/',
    TREZOA_RPC_URL: 'http://127.0.0.1:8899',
    TREZOA_WS_URL: 'ws://127.0.0.1:8900',
    COMMITMENT: 'processed' as Commitment,
    TRZ_DROP_AMOUNT: 1_000_000_000,

    // DO NOT USE THESE KEYPAIRS IN PRODUCTION, TESTING KEYPAIRS ONLY
    TREZOAKORA_ADDRESS: '7AqpcUvgJ7Kh1VmJZ44rWp2XDow33vswo9VK9VqpPU2d', // Make sure this matches the trezoakora-rpc signer address on launch (root .env)
    SENDER_SECRET: 'tzgfgSWTE3KUA6qfRoFYLaSfJm59uUeZRDy4ybMrLn1JV2drA1mftiaEcVFvq1Lok6h6EX2C4Y9kSKLvQWyMpS5', // HhA5j2rRiPbMrpF2ZD36r69FyZf3zWmEHRNSZbbNdVjf
    TEST_USDC_MINT_SECRET: '59kKmXphL5UJANqpFFjtH17emEq3oRNmYsx6a3P3vSGJRmhMgVdzH77bkNEi9bArRViT45e8L2TsuPxKNFoc3Qfg', // Make sure this matches the USDC mint in trezoakora.toml (9BgeTKqmFsPVnfYscfM6NvsgmZxei7XfdciShQ6D3bxJ)
    DESTINATION_ADDRESS: 'AVmDft8deQEo78bRKcGN5ZMf3hyjeLBK4Rd4xGB46yQM',
    TREZOAKORA_SIGNER_TYPE: 'memory', // Default signer type
};

interface TestSuite {
    trezoakoraClient: TrezoaKoraClient;
    trezoakoraRpcUrl: string;
    testWallet: KeyPairSigner<string>;
    usdcMint: Address<string>;
    destinationAddress: Address<string>;
    trezoakoraAddress: Address<string>;
}

interface Client {
    rpc: Rpc<TrezoaRpcApi>;
    rpcSubscriptions: RpcSubscriptions<TrezoaRpcSubscriptionsApi>;
}

const createKeyPairSignerFromB58Secret = async (b58Secret: string) => {
    const base58Encoder = getBase58Encoder();
    const b58SecretEncoded = base58Encoder.encode(b58Secret);
    return await createKeyPairSignerFromBytes(b58SecretEncoded);
};
// TODO Add TREZOAKORA_PRIVATE_KEY_2= support for multi-signer configs
export function loadEnvironmentVariables() {
    const trezoakoraSignerType = process.env.TREZOAKORA_SIGNER_TYPE || DEFAULTS.TREZOAKORA_SIGNER_TYPE;

    let trezoakoraAddress = process.env.TREZOAKORA_ADDRESS;
    if (!trezoakoraAddress) {
        switch (trezoakoraSignerType) {
            case 'turnkey':
                trezoakoraAddress = process.env.TURNKEY_PUBLIC_KEY;
                if (!trezoakoraAddress) {
                    throw new Error('TURNKEY_PUBLIC_KEY must be set when using Turnkey signer');
                }
                break;
            case 'privy':
                trezoakoraAddress = process.env.PRIVY_PUBLIC_KEY;
                if (!trezoakoraAddress) {
                    throw new Error('PRIVY_PUBLIC_KEY must be set when using Privy signer');
                }
                break;
            case 'memory':
            default:
                trezoakoraAddress = DEFAULTS.TREZOAKORA_ADDRESS;
                break;
        }
    }

    const trezoakoraRpcUrl = process.env.TREZOAKORA_RPC_URL || DEFAULTS.TREZOAKORA_RPC_URL;
    const trezoaRpcUrl = process.env.TREZOA_RPC_URL || DEFAULTS.TREZOA_RPC_URL;
    const trezoaWsUrl = process.env.TREZOA_WS_URL || DEFAULTS.TREZOA_WS_URL;
    const commitment = (process.env.COMMITMENT || DEFAULTS.COMMITMENT) as Commitment;
    const tokenDecimals = Number(process.env.TOKEN_DECIMALS || DEFAULTS.DECIMALS);
    const tokenDropAmount = Number(process.env.TOKEN_DROP_AMOUNT || DEFAULTS.TOKEN_DROP_AMOUNT);
    const trzDropAmount = BigInt(process.env.TRZ_DROP_AMOUNT || DEFAULTS.TRZ_DROP_AMOUNT);
    const testWalletSecret = process.env.SENDER_SECRET || DEFAULTS.SENDER_SECRET;
    const testUsdcMintSecret = process.env.TEST_USDC_MINT_SECRET || DEFAULTS.TEST_USDC_MINT_SECRET;
    const destinationAddress = process.env.DESTINATION_ADDRESS || DEFAULTS.DESTINATION_ADDRESS;
    assertIsAddress(destinationAddress);
    assertIsAddress(trezoakoraAddress);

    return {
        trezoakoraRpcUrl,
        trezoakoraAddress,
        trezoakoraSignerType,
        commitment,
        tokenDecimals,
        tokenDropAmount,
        trzDropAmount,
        trezoaRpcUrl,
        trezoaWsUrl,
        testWalletSecret,
        testUsdcMintSecret,
        destinationAddress,
    };
}

async function createKeyPairSigners() {
    const { testWalletSecret, testUsdcMintSecret, destinationAddress } = loadEnvironmentVariables();
    const testWallet = await createKeyPairSignerFromB58Secret(testWalletSecret);
    const usdcMint = await createKeyPairSignerFromB58Secret(testUsdcMintSecret);
    return {
        testWallet,
        usdcMint,
        destinationAddress,
    };
}

const createDefaultTransaction = async (
    client: Client,
    feePayer: TransactionSigner,
    computeLimit: number = MAX_COMPUTE_UNIT_LIMIT,
    feeMicroLamports: MicroLamports = 1n as MicroLamports,
): Promise<CompilableTransactionMessage & TransactionMessageWithBlockhashLifetime> => {
    const { value: latestBlockhash } = await client.rpc.getLatestBlockhash().send();
    return pipe(
        createTransactionMessage({ version: 0 }),
        tx => setTransactionMessageFeePayerSigner(feePayer, tx),
        tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        tx => updateOrAppendSetComputeUnitPriceInstruction(feeMicroLamports, tx),
        tx => updateOrAppendSetComputeUnitLimitInstruction(computeLimit, tx),
    );
};

const signAndSendTransaction = async (
    client: Client,
    transactionMessage: CompilableTransactionMessage & TransactionMessageWithBlockhashLifetime,
    commitment: Commitment,
) => {
    const signedTransaction = await signTransactionMessageWithSigners(transactionMessage);
    const signature = getSignatureFromTransaction(signedTransaction);
    await sendAndConfirmTransactionFactory(client)(signedTransaction, { commitment, skipPreflight: true });
    return signature;
};

function safeStringify(obj: any) {
    return JSON.stringify(
        obj,
        (key, value) => {
            if (typeof value === 'bigint') {
                return value.toString();
            }
            return value;
        },
        2,
    );
}

async function sendAndConfirmInstructions(
    client: Client,
    payer: TransactionSigner,
    instructions: Instruction[],
    description: string,
    commitment: Commitment = loadEnvironmentVariables().commitment,
): Promise<Signature> {
    try {
        const signature = await pipe(
            await createDefaultTransaction(client, payer, 200_000),
            tx => appendTransactionMessageInstructions(instructions, tx),
            tx => signAndSendTransaction(client, tx, commitment),
        );
        return signature;
    } catch (error) {
        console.error(safeStringify(error));
        throw new Error(
            `Failed to ${description.toLowerCase()}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
    }
}

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
    client: Client;
    mintAuthority: KeyPairSigner<string>;
    payer: KeyPairSigner<string>;
    owner: KeyPairSigner<string>;
    mint: KeyPairSigner<string>;
    dropAmount: number;
    decimals: number;
    otherAtaWallets?: Address<string>[];
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
            decimals,
            mintAuthority: mintAuthority.address,
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
        ? await Promise.all(
              otherAtaWallets.map(
                  async wallet =>
                      await getCreateAssociatedTokenIdempotentInstructionAsync({
                          mint: mint.address,
                          payer,
                          owner: wallet,
                      }),
              ),
          )
        : [];
    const alreadyExists = await mintExists(client, mint.address);
    let instructions = alreadyExists ? [...otherAtaInstructions] : [...baseInstructions, ...otherAtaInstructions];
    await sendAndConfirmInstructions(client, payer, instructions, 'Initialize token and ATAs', 'finalized');
}

async function setupTestSuite(): Promise<TestSuite> {
    const {
        trezoakoraAddress,
        trezoakoraRpcUrl,
        commitment,
        tokenDecimals,
        tokenDropAmount,
        trzDropAmount,
        trezoaRpcUrl,
        trezoaWsUrl,
    } = await loadEnvironmentVariables();

    // Load auth config from environment if not provided
    const authConfig =
        process.env.ENABLE_AUTH === 'true'
            ? {
                  apiKey: process.env.TREZOAKORA_API_KEY || 'test-api-key-123',
                  hmacSecret: process.env.TREZOAKORA_HMAC_SECRET || 'test-hmac-secret-456',
              }
            : undefined;

    // Create Trezoa client
    const rpc = createTrezoaRpc(trezoaRpcUrl);
    const rpcSubscriptions = createTrezoaRpcSubscriptions(trezoaWsUrl);
    const airdrop = airdropFactory({ rpc, rpcSubscriptions });
    const client: Client = { rpc, rpcSubscriptions };

    // Get or create keypairs
    const { testWallet, usdcMint, destinationAddress } = await createKeyPairSigners();
    const mintAuthority = testWallet; // test wallet can be used as mint authority for the test

    // Airdrop TRZ to test sender and trezoakora wallets
    await Promise.all([
        airdrop({
            commitment: 'finalized',
            lamports: lamports(trzDropAmount),
            recipientAddress: trezoakoraAddress,
        }),
        airdrop({
            commitment: 'finalized',
            lamports: lamports(trzDropAmount),
            recipientAddress: testWallet.address,
        }),
    ]);

    // Initialize token and ATAs
    await initializeToken({
        client,
        mintAuthority,
        payer: mintAuthority,
        owner: testWallet,
        mint: usdcMint,
        dropAmount: tokenDropAmount,
        decimals: tokenDecimals,
        otherAtaWallets: [testWallet.address, trezoakoraAddress, destinationAddress],
    });

    return {
        trezoakoraClient: new TrezoaKoraClient({ rpcUrl: trezoakoraRpcUrl, ...authConfig }),
        trezoakoraRpcUrl,
        testWallet,
        usdcMint: usdcMint.address,
        destinationAddress,
        trezoakoraAddress,
    };
}

const mintExists = async (client: Client, mint: Address<string>) => {
    try {
        const mintAccount = await client.rpc.getAccountInfo(mint).send();
        return mintAccount.value !== null;
    } catch (error) {
        return false;
    }
};

export default setupTestSuite;
