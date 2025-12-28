import { TrezoaKoraClient } from '../src/index.js';
import { loadEnvironmentVariables } from './setup.js';

export function runAuthenticationTests() {
    const { trezoakoraRpcUrl } = loadEnvironmentVariables();

    describe('Authentication', () => {
        it('should fail with incorrect API key', async () => {
            const client = new TrezoaKoraClient({
                rpcUrl: trezoakoraRpcUrl,
                apiKey: 'WRONG-API-KEY',
            });

            // Auth failure should result in an error (empty response body causes JSON parse error)
            await expect(client.getConfig()).rejects.toThrow();
        });

        it('should fail with incorrect HMAC secret', async () => {
            const client = new TrezoaKoraClient({
                rpcUrl: trezoakoraRpcUrl,
                hmacSecret: 'WRONG-HMAC-SECRET',
            });

            // Auth failure should result in an error
            await expect(client.getConfig()).rejects.toThrow();
        });

        it('should fail with both incorrect credentials', async () => {
            const client = new TrezoaKoraClient({
                rpcUrl: trezoakoraRpcUrl,
                apiKey: 'WRONG-API-KEY',
                hmacSecret: 'WRONG-HMAC-SECRET',
            });

            // Auth failure should result in an error
            await expect(client.getConfig()).rejects.toThrow();
        });

        it('should succeed with correct credentials', async () => {
            const client = new TrezoaKoraClient({
                rpcUrl: trezoakoraRpcUrl,
                apiKey: 'test-api-key-123',
                hmacSecret: 'test-hmac-secret-456',
            });

            const config = await client.getConfig();
            expect(config).toBeDefined();
            expect(config.fee_payers).toBeDefined();
            expect(Array.isArray(config.fee_payers)).toBe(true);
            expect(config.fee_payers.length).toBeGreaterThan(0);
        });

        it('should fail when no credentials provided but auth is required', async () => {
            const client = new TrezoaKoraClient({
                rpcUrl: trezoakoraRpcUrl,
            });

            // No credentials should fail when auth is enabled
            await expect(client.getConfig()).rejects.toThrow();
        });
    });
}
