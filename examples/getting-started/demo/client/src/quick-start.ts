
import { TrezoaKoraClient } from "@trezoa/trezoakora";

async function main() {
    const client = new TrezoaKoraClient({ rpcUrl: 'http://localhost:8080/' });
    try {
        const config = await client.getConfig();
        console.log('TrezoaKora Config:', config);
        const blockhash = await client.getBlockhash();
        console.log('Blockhash: ', blockhash.blockhash);
    } catch (error) {
        console.error(error);
    }
}

main().catch(e => console.error('Error:', e));