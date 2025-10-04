import { WASocket } from '@whiskeysockets/baileys';

/**
 * Responds with "Pong!" and measures the bot's response time.
 * Usage: !ping
 */
export const name = "ping";
export const description = "Check if the bot is alive and measure response time.";

/**
 * Sends a ping message and response time.
 * @param {WASocket} sock - WhatsApp socket instance
 * @param {string} from - Sender JID
 * @param {Array<string>} args - Command arguments
 */
export async function execute(sock: WASocket, from: string, args: string[]): Promise<void> {
  const start = Date.now();
  // Send initial message and save the returned message object
  const sentMsg = await sock.sendMessage(from, { text: "Pong! 🏓" });
  const latency = Date.now() - start;
  // Fallback: send as a new message if editing is not supported
  await sock.sendMessage(from, { text: `Pong! 🏓\nResponse time: ${latency}ms` });
}