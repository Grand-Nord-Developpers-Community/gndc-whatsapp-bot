import OpenAI from "openai";
import { GNDCBaseGenerator } from "./ai.js";

interface MemeTemplate {
  id: string;
  name: string;
  box_count: number;
  url: string;
}

interface MemeTemplates {
  [key: string]: MemeTemplate;
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

export class GNDCMemeGenerator extends GNDCBaseGenerator {
  private imgflipUsername: string;
  private imgflipPassword: string;
  private memeTemplates: MemeTemplates;
  private memeTopics: string[];

  constructor(imgflipUsername: string, imgflipPassword: string) {
    super();
    this.imgflipUsername = imgflipUsername;
    this.imgflipPassword = imgflipPassword;

    this.memeTemplates = {
      drake: {
        id: "181913649",
        name: "Drake Hotline Bling",
        box_count: 2,
        url: "",
      },
      distracted_boyfriend: {
        id: "112126428",
        name: "Distracted Boyfriend",
        box_count: 3,
        url: "",
      },
      two_buttons: {
        id: "87743020",
        name: "Two Buttons",
        box_count: 3,
        url: "",
      },
      expanding_brain: {
        id: "93895088",
        name: "Expanding Brain",
        box_count: 4,
        url: "",
      },
      change_my_mind: {
        id: "129242436",
        name: "Change My Mind",
        box_count: 1,
        url: "",
      },
      success_kid: { id: "61544", name: "Success Kid", box_count: 2, url: "" },
      one_does_not_simply: {
        id: "61579",
        name: "One Does Not Simply",
        box_count: 2,
        url: "",
      },
      batman_slapping_robin: {
        id: "438680",
        name: "Batman Slapping Robin",
        box_count: 2,
        url: "",
      },
      is_this: {
        id: "100777631",
        name: "Is This A Pigeon",
        box_count: 3,
        url: "",
      },
      surprised_pikachu: {
        id: "155067746",
        name: "Surprised Pikachu",
        box_count: 1,
        url: "",
      },
      disaster_girl: {
        id: "97984",
        name: "Disaster Girl",
        box_count: 2,
        url: "",
      },
      hide_the_pain_harold: {
        id: "27813981",
        name: "Hide The Pain Harold",
        box_count: 2,
        url: "",
      },
      woman_yelling_at_cat: {
        id: "188390779",
        name: "Woman Yelling At Cat",
        box_count: 2,
        url: "",
      },
      mocking_spongebob: {
        id: "102156234",
        name: "Mocking Spongebob",
        box_count: 2,
        url: "",
      },
      evil_kermit: {
        id: "84341851",
        name: "Evil Kermit",
        box_count: 2,
        url: "",
      },
      first_world_problems: {
        id: "61539",
        name: "First World Problems",
        box_count: 2,
        url: "",
      },
      ancient_aliens: {
        id: "101470",
        name: "Ancient Aliens",
        box_count: 2,
        url: "",
      },
      bad_luck_brian: {
        id: "61585",
        name: "Bad Luck Brian",
        box_count: 2,
        url: "",
      },
      roll_safe: {
        id: "217743513",
        name: "Roll Safe Think About It",
        box_count: 2,
        url: "",
      },
      grandma_finds_internet: {
        id: "61556",
        name: "Grandma Finds The Internet",
        box_count: 2,
        url: "",
      },
      i_bet_thinking: {
        id: "110163934",
        name: "I Bet He's Thinking About Other Women",
        box_count: 2,
        url: "",
      },
      left_exit: {
        id: "124822590",
        name: "Left Exit 12 Off Ramp",
        box_count: 3,
        url: "",
      },
      me_and_boys: {
        id: "184801100",
        name: "Me And The Boys",
        box_count: 1,
        url: "",
      },
      monkey_puppet: {
        id: "148909805",
        name: "Monkey Puppet",
        box_count: 2,
        url: "",
      },
      oprah_you_get: {
        id: "28251713",
        name: "Oprah You Get A",
        box_count: 2,
        url: "",
      },
      same_picture: {
        id: "180190441",
        name: "They're The Same Picture",
        box_count: 3,
        url: "",
      },
      this_is_fine: {
        id: "55311130",
        name: "This Is Fine",
        box_count: 2,
        url: "",
      },
      trade_offer: {
        id: "309868304",
        name: "Trade Offer",
        box_count: 3,
        url: "",
      },
      waiting_skeleton: {
        id: "4087833",
        name: "Waiting Skeleton",
        box_count: 2,
        url: "",
      },
      who_killed_hannibal: {
        id: "135256802",
        name: "Who Killed Hannibal",
        box_count: 3,
        url: "",
      },
      x_all_the_y: { id: "61533", name: "X All The Y", box_count: 2, url: "" },
      grus_plan: { id: "131940431", name: "Gru's Plan", box_count: 4, url: "" },
      running_away_balloon: {
        id: "102156234",
        name: "Running Away Balloon",
        box_count: 2,
        url: "",
      },
      uno_draw_25: {
        id: "217743513",
        name: "UNO Draw 25 Cards",
        box_count: 2,
        url: "",
      },
    };

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
  private buildDynamicTool(
    selectedTemplate: MemeTemplate
  ): OpenAI.Chat.Completions.ChatCompletionTool {
    const properties: any = {
      template: {
        type: "string",
        const: selectedTemplate.id,
        description: `Template sélectionné: ${selectedTemplate.name} (${selectedTemplate.box_count} zones de texte)`,
      },
    };

    const required: string[] = ["template"];

    // Générer dynamiquement les champs text0, text1, text2, etc.
    for (let i = 0; i < selectedTemplate.box_count; i++) {
      const fieldName = `text${i}`;
      properties[fieldName] = {
        type: "string",
        description: `Texte pour la zone ${
          i + 1
        } du mème (en français, court et percutant)`,
      };
      required.push(fieldName);
    }

    return {
      type: "function",
      function: {
        name: "create_meme",
        description: `Crée un mème "${selectedTemplate.name}" avec ${selectedTemplate.box_count} zone(s) de texte pour GNDC. Génère des textes drôles et pertinents en français.`,
        parameters: {
          type: "object",
          properties: properties,
          required: required,
        },
      },
    };
  }

  private getRandomTopic(): string {
    const randomIndex = Math.floor(Math.random() * this.memeTopics.length);
    return this.memeTopics[randomIndex];
  }

  async createMeme(
    template: MemeTemplate,
    texts: string[]
  ): Promise<MemeResult> {
    if (texts.length !== template.box_count) {
      return {
        success: false,
        error: `Le template "${template.name}" nécessite ${template.box_count} texte(s), mais ${texts.length} ont été fournis`,
      };
    }

    const params = new URLSearchParams({
      template_id: template.id,
      username: this.imgflipUsername,
      password: this.imgflipPassword,
    });

    // Ajouter dynamiquement tous les textes
    texts.forEach((text, index) => {
      params.append(`boxes[${index}][text]`, text);
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

  async generate(useAITopic: boolean = false): Promise<MemeResult> {
    const templateKeys = Object.keys(this.memeTemplates);
    const randomTemplateKey =
      templateKeys[Math.floor(Math.random() * templateKeys.length)];
    const selectedTemplate = this.memeTemplates[randomTemplateKey];

    let randomTopic: string;
    let prompt: string;

    if (useAITopic) {
      console.log(`\n🤖 *L'IA génère son propre sujet...*\n`);

      prompt = `Tu es libre de choisir TON PROPRE SUJET de mème , par exemple : ${this.memeTopics.join(
        ", "
      )} ! 

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
    const dynamicTool = this.buildDynamicTool(selectedTemplate);
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content:
          this.gndcContext +
          "\n\nIMPORTANT: Chaque template a un nombre spécifique de zones de texte (boxes). Tu dois générer EXACTEMENT le bon nombre de textes pour chaque template et au bon autre dans le contexte du sujet choisi et du template choisis.",
      },
      {
        role: "user",
        content: prompt,
      },
    ];

    try {
      const response = await this.callOpenAI(messages, [dynamicTool], "auto");

      const validation = this.validateToolCall(response, "create_meme");
      if (!validation.success) {
        return { success: false, error: validation.error };
      }

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

      const texts: string[] = [];
      for (let i = 0; i < selectedTemplate.box_count; i++) {
        const text = functionArgs[`text${i}`] || "";
        texts.push(text);
      }

      console.log(`\n*Création du mème...*`);
      console.log(`Template : *${selectedTemplate.name}*`);
      texts.forEach((text, index) => {
        console.log(`Zone ${index + 1} : "${text}"`);
      });
      //console.log();

      const memeResult = await this.createMeme(selectedTemplate, texts);
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

  formatResponse(result: MemeResult) {
    if (!result.success) {
      return null;
    }

    return {
      subject: result.topic || "Sujet généré par l'IA",
      url: result.url,
      page_url: result.page_url,
    };
  }
}
