import { proto, WASocket } from "@whiskeysockets/baileys";
import { EventType } from "../types/index.js";
import { gloBalCache } from "../index.js";
import config from "../utils.js";
// import dotenv from "dotenv";
// dotenv.config();
/**
 * Ask a question to the chatbot with web access capabilities
 * Usage: !ask your question here
 */
export const name = "events";
export const description = "evenement GNDC";

// Cache for storing visited URLs and their content

/**
 * Process a user question and respond with information
 * @param {WASocket} sock - WhatsApp socket instance
 * @param {string} from - Sender JID
 * @param {Array<string>} args - Command arguments
 */

//handle search of GNDC,BLOG

export async function execute(
  sock: WASocket,
  from: string,
  msg: proto.IWebMessageInfo,
  args: string[]
): Promise<void> {
  if (from !== config.bot?.group_target) {
    return;
  }
  // Send typing indicator
  await sock.presenceSubscribe(from);
  await sock.sendPresenceUpdate("composing", from);

  try {
    if (!gloBalCache.get("GNDC-EVENT")) {
      const response = await fetch(`${process.env.WEBSITE_URL}/api/events`);
      const data: EventType[] = await response.json();
      gloBalCache.set("GNDC-EVENT", data);
    }
    const data = gloBalCache.get("GNDC-EVENT") as EventType[];
    let message = "*Evenements en cours :*\n\n";
    let count = 1;

    for (const [_, e] of Object.entries(data.slice(0, 5))) {
      message += `${count}. *${e.title}*\n`;
      message += `   - description : ${e.description}\n`;
      message += `   - localisation : ${e.location}\n`;
      message += `   - lien: ${e.link}\n\n`;
      count++;
    }
    message += data.length === 0 ? "pas d'évenement pour le momment !" : "";
    message += `\Voir plus: ${process.env.WEBSITE_URL}/events`;
    await sock.sendMessage(
      from,
      {
        text: message || "pas de reponse !!",
        mentions: [from],
      }
      // {
      //   quoted: { key: msg },
      // }
    );
  } catch (error) {
    console.error("Error processing question:", error);
    await sock.sendMessage(from, {
      text: "Je suis désolé, j'ai rencontré une erreur lors du traitement de votre question. Veuillez réessayer.",
    });
  } finally {
    // Stop typing indicator
    await sock.sendPresenceUpdate("paused", from);
  }
}

/**
 * Process a user question and generate a response
 */
