import { proto, WASocket } from "@whiskeysockets/baileys";
import { BlogPostResponse, LeaderboardType } from "../types";
import { gloBalCache } from "..";
import config from "../utils";
import dotenv from "dotenv";
dotenv.config();
/**
 * Ask a question to the chatbot with web access capabilities
 * Usage: !ask your question here
 */
export const name = "leaderboard";
export const description = "Top 5 gndc users";

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
    if (!gloBalCache.get("GNDC-LEADER")) {
      const response = await fetch(
        `${process.env.WEBSITE_URL}/api/leaderboard`
      );
      const data: LeaderboardType = await response.json();
      gloBalCache.set("GNDC-LEADER", data);
    }
    const data = gloBalCache.get("GNDC-LEADER") as LeaderboardType;
    let message = "*Leaderboard GNDC🏆:*\n\n";
    let count = 1;

    for (const [_, user] of Object.entries(data.users.slice(0, 5))) {
      message += `${count}. *${user.name.trimEnd()}*\n`;
      message += `   - xp: ${user.experiencePoints}\n`;
      message += `   - profil: ${process.env.WEBSITE_URL}/user/${user.username}\n\n`;
      count++;
    }
    message += `\Voir plus: ${process.env.WEBSITE_URL}/leaderboard`;
    await sock.sendMessage(
      from,
      {
        text: message || "pas de reponse !!",
      },
      {
        quoted: msg,
      }
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
