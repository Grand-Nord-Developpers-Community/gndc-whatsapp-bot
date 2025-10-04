// Event Handler Template
// Replace group-participants.update with the actual event name

import { WASocket } from "@whiskeysockets/baileys";
import { Logger } from "pino";
import { groupCache } from "..";

export const eventName = "group-participants.update";

/**
 * Handles the group-participants.update event.
 * @param {WASocket} sock - The WhatsApp socket instance.
 * @param {Logger} logger - Logger for logging info and errors.
 * @returns {Function}
 */
export const handler =
  (sock: WASocket, logger: Logger) =>
  async (eventData: any): Promise<void> => {
    if (!eventData?.id) {
      logger.error(`[${eventName}] Invalid event data:`, eventData);
      return;
    }
    logger.info(`[${eventName}] Event triggered:`, eventData);
    const metadata = await sock.groupMetadata(eventData.id);
    groupCache.set(eventData.id, metadata);
    // TODO: Implement your logic here.
  };
