import { WASocket } from '@whiskeysockets/baileys';

/**
 * Returns the current server time in a user-friendly format.
 * Usage: !time
 */
export const name = "time";
export const description = "Get the current server time.";

/**
 * Sends the current server time to the user.
 * @param {WASocket} sock - WhatsApp socket instance
 * @param {string} from - Sender JID
 * @param {Array<string>} args - Command arguments
 */
export async function execute(sock: WASocket, from: string, args: string[]): Promise<void> {
  const now = new Date().toLocaleString();
  await sock.sendMessage(from, { text: `Current server time: ${now}` });
}