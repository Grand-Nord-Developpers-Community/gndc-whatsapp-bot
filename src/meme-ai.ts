import dotenv from "dotenv";
dotenv.config();
import OpenAI from "openai";

interface MemeTemplate {
  [key: string]: string;
}

interface MemeResult {
  success: boolean;
  url?: string;
  page_url?: string;
  template?: string;
  text0?: string;
  text1?: string;
  message?: string;
  error?: string;
  topic?: string;
}

export class GNDCMemeGenerator {
  private client: OpenAI;
  private imgflipUsername: string;
  private imgflipPassword: string;
  private memeTemplates: MemeTemplate;
  private tools: OpenAI.Chat.Completions.ChatCompletionTool[];
  private gndcContext: string;
  private memeTopics: string[];
  private model: string;

  constructor(imgflipUsername: string, imgflipPassword: string) {
    const apiKey = process.env.OPENAI_KEY;
    const endpoint = "https://models.inference.ai.azure.com";
    this.model = "gpt-4o";
    console.log(apiKey);
    this.client = new OpenAI({
      apiKey: apiKey,
      baseURL: endpoint,
    });

    this.imgflipUsername = imgflipUsername;
    this.imgflipPassword = imgflipPassword;

    this.memeTemplates = {
      drake: "181913649",
      distracted_boyfriend: "112126428",
      two_buttons: "87743020",
      expanding_brain: "104937008",
      change_my_mind: "129242436",
      success_kid: "61544",
      one_does_not_simply: "61579",
      batman_slapping_robin: "438680",
      is_this: "100777631",
      surprised_pikachu: "155067746",
    };

    this.tools = [
      {
        type: "function",
        function: {
          name: "create_meme",
          description:
            "Crée un mème en français pour la communauté GNDC (Grand Nord Developers Community du Cameroun). Utilise des références à la tech, au développement, aux hackathons, et à la culture du Grand Nord Cameroun. Les textes doivent être concis et humoristiques.",
          parameters: {
            type: "object",
            properties: {
              template: {
                type: "string",
                enum: Object.keys(this.memeTemplates),
                description: "Le template de mème à utiliser",
              },
              text0: {
                type: "string",
                description:
                  "Texte du haut pour le mème (en français, court et percutant)",
              },
              text1: {
                type: "string",
                description:
                  "Texte du bas pour le mème (en français, court et percutant)",
              },
            },
            required: ["template", "text0", "text1"],
          },
        },
      },
    ];

    this.gndcContext = `Tu es un assistant créatif pour GNDC (Grand Nord Developers Community), une communauté de développeurs du Grand Nord Cameroun.

GNDC vise à :
- Promouvoir l'innovation technologique
- Partager des compétences en développement
- Résoudre des défis locaux via des solutions collaboratives
- Organiser des événements, hackathons, et ateliers pratiques

Contact : contact@gndc.tech
Site : https://gndc.tech

Tu dois créer des mèmes en FRANÇAIS qui résonnent avec :
- Les développeurs camerounais du Grand Nord
- La culture tech et geek
- L'humour sur les bugs, le code, les deadlines
- Les défis et réussites de la communauté GNDC
- Les réalités locales (coupures d'électricité, connexion internet, etc.)

Sois créatif, drôle, et pertinent pour l'audience GNDC !`;

    // Sujets de mèmes pour génération aléatoire
    this.memeTopics = [
      "Les coupures d'électricité pendant qu'on code",
      "La connexion internet lente pendant un hackathon GNDC",
      "Debugger du code à 3h du matin",
      "Quand le code fonctionne du premier coup",
      "Les bugs en production pendant une démo GNDC",
      "Apprendre un nouveau framework pour un projet GNDC",
      "La différence entre junior et senior dev à GNDC",
      "Stack Overflow qui sauve la vie",
      "Git merge conflicts",
      "Les attentes vs la réalité du développement",
      "Travailler sur un projet open source GNDC",
      "Les promesses des clients vs le budget",
      "CSS qui ne veut pas s'aligner",
      "Les réunions qui auraient pu être un email",
      "Coder avec VS Code vs Notepad",
      "La documentation qui n'existe pas",
      "Les hackathons GNDC qui durent 48h",
      "Refactorer du vieux code",
      "Les tests en production",
      "L'importance de la communauté GNDC",
      "Partager ses connaissances à GNDC",
      "Les meetups GNDC du weekend",
      "Débuter en programmation avec GNDC",
      "Les opportunités tech au Grand Nord",
      "Résoudre des problèmes locaux avec la tech",
    ];
  }

  private getRandomTopic(): string {
    const randomIndex = Math.floor(Math.random() * this.memeTopics.length);
    return this.memeTopics[randomIndex];
  }

  async createMeme(
    template: string,
    text0: string,
    text1: string
  ): Promise<MemeResult> {
    const templateId = this.memeTemplates[template];

    if (!templateId) {
      return { success: false, error: `Template '${template}' non trouvé` };
    }

    const params = new URLSearchParams({
      template_id: templateId,
      username: this.imgflipUsername,
      password: this.imgflipPassword,
      text0: text0,
      text1: text1,
    });

    try {
      const response = await fetch("https://api.imgflip.com/caption_image", {
        method: "POST",
        body: params,
      });

      const data = await response.json();

      if (data.success) {
        return {
          success: true,
          url: data.data.url,
          page_url: data.data.page_url,
        };
      } else {
        return {
          success: false,
          error: data.error_message || "Erreur lors de la création du mème",
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur API Imgflip : ${error.message}`,
      };
    }
  }

  async generateRandomMeme(useAITopic: boolean = false): Promise<MemeResult> {
    let randomTopic: string;
    let prompt: string;

    if (useAITopic) {
      console.log(`\n🤖 *L'IA génère son propre sujet...*\n`);

      prompt = `Tu es libre de choisir TON PROPRE SUJET de mème ! 

Invente un sujet drôle et original qui fera rire la communauté GNDC (développeurs du Grand Nord Cameroun).

Pense à :
- L'humour tech et geek
- Les situations absurdes du développement
- Les réalités locales camerounaises
- Les expériences partagées des développeurs
- Les trends actuelles en tech
- Les moments embarrassants ou drôles en programmation

Sois ULTRA créatif et hilarant ! Ton objectif : faire RIRE la communauté.

Crée maintenant un mème sur le sujet de ton choix.`;

      randomTopic = "Sujet généré par l'IA";
    } else {
      randomTopic = this.getRandomTopic();
      console.log(`\n🎲 *Sujet aléatoire choisi :* ${randomTopic}\n`);

      prompt = `Crée un mème drôle et original sur le sujet suivant pour la communauté GNDC : "${randomTopic}". 
      
Sois créatif et humoristique. Le mème doit résonner avec les développeurs du Grand Nord Cameroun.`;
    }
    console.log(prompt);
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: this.gndcContext,
      },
      {
        role: "user",
        content: prompt,
      },
    ];

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: messages,
        tools: this.tools,
        tool_choice: "auto",
      });

      const responseMessage = response.choices[0].message;
      const toolCalls = responseMessage.tool_calls;

      if (!toolCalls || toolCalls.length === 0) {
        return {
          success: false,
          error: "OpenAI n'a pas appelé la fonction create_meme",
          message: responseMessage.content || undefined,
        };
      }

      const toolCall = toolCalls[0];
      console.log(toolCalls);
      //@ts-ignore
      const functionArgs = JSON.parse(toolCall.function.arguments);

      console.log(`\n*Création du mème...*`);
      console.log(`Template : *${functionArgs.template}*`);
      console.log(`Texte haut : "${functionArgs.text0}"`);
      console.log(`Texte bas : "${functionArgs.text1}"\n`);

      const memeResult = await this.createMeme(
        functionArgs.template,
        functionArgs.text0,
        functionArgs.text1
      );

      if (memeResult.success) {
        console.log(`✅ *Mème créé avec succès !*`);
        console.log(`🔗 *Lien direct :* ${memeResult.url}`);
        console.log(`📱 *Page Imgflip :* ${memeResult.page_url}`);

        // messages.push(responseMessage);
        // messages.push({
        //   role: "tool",
        //   tool_call_id: toolCall.id,
        //   content: JSON.stringify(memeResult),
        // });

        // const finalResponse = await this.client.chat.completions.create({
        //   model: this.model,
        //   messages: messages,
        // });

        return {
          success: true,
          url: memeResult.url,
          page_url: memeResult.page_url,
          message: undefined,
          topic: randomTopic,
        };
      } else {
        return memeResult;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Erreur OpenAI : ${error.message}`,
      };
    }
  }

  async generateMultipleRandomMemes(count: number = 1): Promise<MemeResult[]> {
    const results: MemeResult[] = [];

    console.log(
      `\n🎨 *Génération de ${count} mème(s) aléatoire(s) pour GNDC...*\n`
    );

    for (let i = 0; i < count; i++) {
      console.log(`\n--- Mème ${i + 1}/${count} ---`);
      const result = await this.generateRandomMeme();
      results.push(result);

      // Petite pause entre chaque génération
      if (i < count - 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    return results;
  }

  formatResponse(result: MemeResult): string {
    if (!result.success) {
      return `❌ *Erreur* : ${result.error}`;
    }

    let response = `✅ *Mème GNDC créé avec succès !*\n\n`;

    if (result.topic) {
      response += `🎯 *Sujet :* ${result.topic}\n\n`;
    }

    if (result.message) {
      response += `${result.message}\n\n`;
    }

    response += `🔗 *Lien direct :*\n${result.url}\n\n`;
    response += `📱 *Page Imgflip :*\n${result.page_url}\n\n`;
    response += `---\n`;
    response += `💻 *GNDC - Grand Nord Developers Community*\n`;
    response += `Site : https://gndc.tech\n`;
    response += `Contact : contact@gndc.tech`;

    return response;
  }
}
