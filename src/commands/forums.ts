import { proto, WASocket } from "@whiskeysockets/baileys";
import { BlogPostResponse, ForumPostResponse } from "../types/index.js";
import { gloBalCache } from "../index.js";
import config, { resolveTargetGroups } from "../utils.js";
/**
 * Ask a question to the chatbot with web access capabilities
 * Usage: !ask your question here
 */
export const name = "forums";
export const description =
  "Recuperez les 5 dernières questions posés sur la GNDC";

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
  const ids = await resolveTargetGroups("allowedcommand", "forums");
  const isAllowed = ids.some((t) => t.id === from);
  if (!isAllowed && from.endsWith("@g.us")) {
    return;
  }
  const isAllowedInbox = ids[0].allow_inbox?.includes("forums");
  if (!isAllowedInbox) {
    return;
  }
  if (!args.length) {
    await sock.sendMessage(from, {
      text: "Usage: >forums all | no-answer | answered ",
    });
    return;
  }
  const input = args.join().split(" ");
  console.log(input);
  if (input.length < 1) {
    await sock.sendMessage(from, {
      text: "S'il vous plait fournissez au moins une option\n (all : tout, no-answer:pas de reponse, answered:avec au moins une réponse)",
    });
    return;
  }
  const options = ["all", "no-answer", "answered"];
  const option = input[0];
  if (!options.includes(option)) {
    await sock.sendMessage(from, {
      text: "Choix saisi indisponible !!",
    });
    return;
  }
  // Send typing indicator
  await sock.presenceSubscribe(from);
  await sock.sendPresenceUpdate("composing", from);

  try {
    if (!gloBalCache.get("GNDC-FORUMS-" + option)) {
      const response = await fetch(
        `${process.env.WEBSITE_URL}/api/bot/forums?withAns=${
          option === "answered"
        }`
      );
      const data: ForumPostResponse[] = await response.json();
      gloBalCache.set("GNDC-FORUMS-" + option, data);
    }
    const data = gloBalCache.get(
      "GNDC-FORUMS-" + option
    ) as ForumPostResponse[];
    let message = "*Question posées sur la plateforme GNDC:* \n\n";
    let count = 1;

    for (const item of data.slice(0, 5)) {
      //remove dangling space
      message += `${count}. *${item.title.trimEnd()}* \n`;
      message += `   - par : ${item.author.name || "inconnu"}\n`;
      message += `   - lien : ${process.env.WEBSITE_URL}/forum/${item.id}\n\n`;
      count++;
    }
    message += `\Voir plus: ${process.env.WEBSITE_URL}/forum`;
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
