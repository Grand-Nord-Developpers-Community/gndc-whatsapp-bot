import { proto, WASocket } from "@whiskeysockets/baileys";
import OpenAI from "openai";
import dotenv from "dotenv";
import axios from "axios";
import { stringify } from "querystring";
import { GNDCMemeGenerator } from "../meme-ai";
dotenv.config();
/**
 * Ask a question to the chatbot with web access capabilities
 * Usage: !ask your question here
 */
export const name = "meme";
export const description = "meme generator chatbot";

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
  try {
    const generator = new GNDCMemeGenerator("mohamedconsole", "imgflip123#");

    console.log("🎨 *Générateur de Mèmes Aléatoires GNDC*\n");
    console.log("L'IA va choisir elle-même un sujet et créer un mème !\n");

    // Générer un seul mème aléatoire
    const result = await generator.generateRandomMeme();
    const formattedResponse = generator.formatResponse(result);
    console.log(formattedResponse);
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
