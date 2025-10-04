import { WASocket } from "@whiskeysockets/baileys";

/**
 * Greets the user with a friendly hello message.
 * Usage: !hi
 */
export const name = "hi";
export const description = "Say hello.";
import config from "../utils";
/**
 * Sends a hello message to the user.
 * @param {WASocket} sock - WhatsApp socket instance
 * @param {string} from - Sender JID
 * @param {Array<string>} args - Command arguments
 */
export async function execute(
  sock: WASocket,
  from: string,
  args: string[]
): Promise<void> {
  await sock.sendMessage(from, {
    text: `Salut! 👋 ${config.bot?.description}`,
  });
  // if (from === config.bot?.group_target) {
  // } else {
  //   await sock.sendMessage(from, {
  //     text: `Salut! 👋`,
  //   });
  // }
}
