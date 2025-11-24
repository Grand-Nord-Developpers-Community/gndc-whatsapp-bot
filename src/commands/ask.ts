import { proto, WASocket } from "@whiskeysockets/baileys";
import OpenAI from "openai";
// import * as dotenv from "dotenv";
// dotenv.config();
/**
 * Ask a question to the chatbot with web access capabilities
 * Usage: !ask your question here
 */
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
  if (!args.length) {
    await sock.sendMessage(from, {
      text: "Usage: !ask une question relative à la GNDC",
    });
    return;
  }
  const modelName = "gpt-4o";
  const gndcServiceInfo = `
  Vous êtes un assistant virtuel IA pour GNDC (Grand Nord Developers Community).  
Votre mission : accueillir, informer, assister les visiteurs et membres autour des activités, services, projets, etc., de GNDC.

- GNDC est une *communauté de développeurs du Grand Nord Cameroun*, visant à promouvoir l’innovation, partager des compétences technologiques, et *résoudre des défis locaux* via des solutions collaboratives. 
- GNDC organise des événements, hackathons, ateliers pratiques, publie des articles, et propose des opportunités de collaboration.  
- Le site affiche des coordonnées de contact :  
  • Email : contact@gndc.tech  
- GNDC fonctionne avec des membres, sponsors, un forum, blog, etc.  

[ATTENTION!!!]
 Répondez aux questions des clients en FRANÇAIS. Soyez aimable et concis. Si une question sort du cadre de la gndc, indiquez poliment que vous ne pouvez aider que sur des sujets liés à la gndc.
also send link in plain format url don't use markdown formatting just send the url in plain text
if you want to format use whatsapp format like :
- ** : for bold (only two star between the text : ex : *hey* )
- __:italic
- ~~:strikethrough
and so on

## Ressources
site: https://gndc.tech
faq: https://gndc.tech/faq
blog: https://gndc.tech/blog
forum:https://gndc.tech/forum

  `;
  // Send typing indicator
  await sock.presenceSubscribe(from);
  await sock.sendPresenceUpdate("composing", from);
  const apiKey = process.env.OPENAI_KEY;
  const endpoint = "https://models.inference.ai.azure.com";

  const client = new OpenAI({
    apiKey: apiKey,
    baseURL: endpoint,
  });
  try {
    const query = args.join(" ");
    const response = await client.chat.completions.create({
      model: modelName,
      messages: [
        { role: "system", content: gndcServiceInfo },
        { role: "user", content: query },
      ],
    });

    // const response = await client.chat.create({
    //   model: modelName,
    //   messages: [
    //     { role: "system", content: gndcServiceInfo },
    //     { role: "user", content: query },
    //   ],
    //   temperature: 0.7,
    //   web_search_options:{
    //     search_context_size:"high",

    //   }
    //   ,
    //   tools:[
    //     {
    //       type: "web_search",
    //       filters: {
    //         allowed_domains: [
    //           "pubmed.ncbi.nlm.nih.gov",
    //           "clinicaltrials.gov",
    //           "www.who.int",
    //           "www.cdc.gov",
    //           "www.fda.gov",
    //         ],
    //       },
    //     },
    //   ],
    // tool_choice: "auto",
    // include: ["web_search_call.action.sources"],
    // });
    console.log(msg);
    await sock.sendMessage(from, {
      text: response.choices[0].message.content || "pas de reponse !!",
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
