// Event Handler: messages.upsert
// Description: Handles incoming messages (real-time and offline sync), parses commands, and executes them if matched.
// Triggers when a new message is received in the chat.

import { WASocket } from "@whiskeysockets/baileys";
import { Logger } from "pino";
import { Command, WAMessage } from "../types/index.js";
import config from "../utils.js";

const prefix = config.bot?.prefix || "!";

interface MessagesUpsertData {
  messages: WAMessage[];
  type: "notify" | "append";
}

export const eventName = "messages.upsert";

/**
 * Handles new incoming messages and executes commands.
 * @param {WASocket} sock - The WhatsApp socket instance.
 * @param {Logger} logger - Logger for logging info and errors.
 * @param {Map<string, Command>} commands - Map of available commands.
 * @returns {Function}
 */
export const handler =
  (sock: WASocket, logger: Logger, commands: Map<string, Command>) =>
  async ({ messages, type }: MessagesUpsertData): Promise<void> => {
    const msg = messages[0];
    if (!msg.message) return;

    const from = msg.key?.remoteJid;
    if (!from) return;

    const text =
      msg.message.conversation ||
      (msg.message.extendedTextMessage &&
        msg.message.extendedTextMessage.text) ||
      "";

    if (!text || !text.startsWith(prefix)) return;

    logger.info(`Received command from ${from}: ${text}`);

    const [cmdName, ...args] = text.slice(1).trim().split(" ");
    const command = commands.get(cmdName.toLowerCase());

    if (command) {
      try {
        await command.execute(sock, from, msg, args);
        logger.info(`Command executed: ${cmdName}`);
      } catch (err) {
        logger.error(`Command error (${cmdName}): ${err}`);
      }
    }
  };
