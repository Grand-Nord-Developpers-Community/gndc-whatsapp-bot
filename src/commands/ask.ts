import { proto, WASocket } from "@whiskeysockets/baileys";
import OpenAI from "openai";
import { GNDCBaseGenerator } from "../ai.js";
import { resolveTargetGroups } from "../utils.js";

// import * as dotenv from "dotenv";
// dotenv.config();
/**
 * Ask a question to the chatbot with web access capabilities
 * Usage: !ask your question here
 */
class GNDCAskGenerator extends GNDCBaseGenerator {
  constructor() {
    super({
      model: "gpt-4.1-nano",
      context: `
  Vous êtes un assistant virtuel IA pour GNDC (Grand Nord Developers Community).  
Votre mission : accueillir, informer, assister les visiteurs et membres autour des activités, services, projets, etc., de GNDC.

*À propos de GNDC*

GNDC est une *communauté de développeurs du Grand Nord Cameroun*, visant à promouvoir l'innovation, partager des compétences technologiques, et *résoudre des défis locaux* via des solutions collaboratives. 

GNDC organise des événements, hackathons, ateliers pratiques, publie des articles, et propose des opportunités de collaboration.

*Instructions de réponse*

1. Répondez aux questions des clients en *FRANÇAIS* ou *ANGLAIS* uniquement
2. Soyez *aimable*, *concis* et *professionnel*
3. Utilisez le format WhatsApp pour la mise en forme :
   • *texte* pour du gras
   • _texte_ pour l'italique
   • ~texte~ pour le barré
4. Envoyez les URLs en *texte brut* (sans formatage markdown)
5. Si une question sort du cadre de GNDC, indiquez poliment que vous ne pouvez aider que sur des sujets liés à GNDC

*Format de réponse recommandé*

Utilisez une structure claire :
📌 *En-tête/Titre*

Contenu principal avec explications.

🔗 *Ressources utiles*
- Description : lien

📞 *Besoin d'aide?*
Informations de contact

*Ressources disponibles*

Site officiel : https://gndc.tech
FAQ : https://gndc.tech/faq
Blog : https://gndc.tech/blog
Forum : https://gndc.tech/forum
Github : https://github.com/Grand-Nord-Developpers-Community
lien groupe whatsapp (communauté) : https://chat.whatsapp.com/FMUPbBkEKs24B8rE4h9xsh?mode=hqrt2

*Contact*

Email : contact@gndc.tech
`,
    });
  }
  async generate(...args: any[]): Promise<any> {}
}

export const name = "ask";
export const description = "Posez une question au chatbot";

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
  const ids = await resolveTargetGroups("allowedcommand", "ask");
  const isAllowed = ids.some((t) => t.id === from);
  if (!isAllowed && from.endsWith("@g.us")) {
    return;
  }
  const isAllowedInbox = ids[0].allow_inbox?.includes("ask");
  if (!isAllowedInbox) {
    return;
  }
  if (!args.length) {
    await sock.sendMessage(from, {
      text: "Usage: > ask [une question relative à la GNDC]",
    });
    return;
  }
  const ai = new GNDCAskGenerator();
  // Send typing indicator
  await sock.presenceSubscribe(from);
  await sock.sendPresenceUpdate("composing", from);

  try {
    const query = args.join(" ");
    const response = await ai.output(query);
    console.log(msg);
    await sock.sendMessage(from, {
      text: response || "pas de reponse !!",
      mentions: from ? [from] : [],
    });
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
