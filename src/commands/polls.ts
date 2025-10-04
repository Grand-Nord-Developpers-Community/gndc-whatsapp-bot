import { WASocket } from '@whiskeysockets/baileys';

/**
 * Creates a poll in the chat.
 * Usage: !poll Question? Option1; Option2; Option3
 */
export const name = "poll";
export const description = "Create a poll. Usage: !poll Question? Option1; Option2; Option3";

/**
 * Sends a poll message to the chat.
 * @param {WASocket} sock - WhatsApp socket instance
 * @param {string} from - Sender JID
 * @param {Array<string>} args - Command arguments
 */
export async function execute(sock: WASocket, from: string, args: string[]): Promise<void> {
  if (!args.length) {
    await sock.sendMessage(from, { text: "Usage: !poll Question? Option1; Option2; Option3" });
    return;
  }
  
  const input = args.join(" ").split("?");
  if (input.length < 2) {
    await sock.sendMessage(from, { text: "Please provide a question and at least two options." });
    return;
  }
  
  const question = input[0].trim() + "?";
  const options = input[1].split(";").map(opt => opt.trim()).filter(Boolean);
  
  if (options.length < 2) {
    await sock.sendMessage(from, { text: "Please provide at least two options separated by ';'." });
    return;
  }
  
  await sock.sendMessage(from, {
    poll: {
      name: question,
      values: options
    }
  });
}