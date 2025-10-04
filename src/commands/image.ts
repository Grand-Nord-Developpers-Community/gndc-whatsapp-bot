import { WASocket } from '@whiskeysockets/baileys';

/**
 * Sends a predefined image with a caption to the chat.
 * Usage: !image
 */
export const name = "image";
export const description = "Send an image.";

/**
 * Sends an image to the user.
 * @param {WASocket} sock - WhatsApp socket instance
 * @param {string} from - Sender JID
 * @param {Array<string>} args - Command arguments
 */
export async function execute(sock: WASocket, from: string, args: string[]): Promise<void> {
  await sock.sendMessage(from, {
    image: { url: "https://www.nexoscreator.tech/logo.png" },
    caption: "Here is an image!",
  });
}