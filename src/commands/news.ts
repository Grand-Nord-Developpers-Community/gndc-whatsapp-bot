import { proto, WASocket } from "@whiskeysockets/baileys";
import { BlogPostResponse } from "../types/index.js";
import { gloBalCache } from "../index.js";
import config, { resolveTargetGroups } from "../utils.js";
import dotenv from "dotenv";
dotenv.config();
/**
 * Ask a question to the chatbot with web access capabilities
 * Usage: !ask your question here
 */
export const name = "news";
export const description = "Recuperez les 5 dernières news de GNDC";

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
  const ids = await resolveTargetGroups("allowedcommand", "news");
  const isAllowed = ids.some((t) => t.id === from);
  if (!isAllowed && from.endsWith("@g.us")) {
    return;
  }
  const isAllowedInbox = ids[0].allow_inbox?.includes("news");
  if (!isAllowedInbox) {
    return;
  }
  // Send typing indicator
  await sock.presenceSubscribe(from);
  await sock.sendPresenceUpdate("composing", from);

  try {
    if (!gloBalCache.get("GNDC-NEWS")) {
      const response = await fetch(`${process.env.WEBSITE_URL}/api/bot/blogs`);
      const data: BlogPostResponse[] = await response.json();
      gloBalCache.set("GNDC-NEWS", data);
    }
    const data = gloBalCache.get("GNDC-NEWS") as BlogPostResponse[];
    let message = "*Dernières News de GNDC:*\n\n";
    let count = 1;

    for (const item of data.slice(0, 5)) {
      message += `${count}. *${item.title.trimEnd()}*\n`;
      message += `   - par : ${item.author.name || "inconnu"}\n`;
      message += `   - lien : ${process.env.WEBSITE_URL}/blog/${item.slug}\n\n`;
      count++;
    }
    message += `\Voir plus: ${process.env.WEBSITE_URL}/blog`;
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
