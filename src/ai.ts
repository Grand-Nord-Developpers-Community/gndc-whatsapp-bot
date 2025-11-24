import dotenv from "dotenv";
dotenv.config();
import OpenAI from "openai";

export abstract class GNDCBaseGenerator {
  protected client: OpenAI;
  protected gndcContext: string;
  protected model: string;

  constructor({ model, context }: { model?: string; context?: string }) {
    const apiKey = process.env.OPENAI_KEY;
    const endpoint = "https://models.inference.ai.azure.com";
    this.model = model || "gpt-4o";
    this.client = new OpenAI({
      apiKey: apiKey,
      baseURL: endpoint,
    });
    this.gndcContext =
      context ||
      `Tu es un assistant créatif pour GNDC (Grand Nord Developers Community), une communauté de développeurs du Grand Nord Cameroun.
GNDC vise à :
- Promouvoir l'innovation technologique
- Partager des compétences en développement
- Résoudre des défis locaux via des solutions collaboratives
- Organiser des événements, hackathons, et ateliers pratiques

Contact : contact@gndc.tech
Site : https://gndc.tech

Tu dois créer du contenu en FRANÇAIS qui résonne avec :
- Les développeurs camerounais du Grand Nord
- La culture tech et geek
- Les défis et réussites de la communauté GNDC
- Les réalités locales

Sois créatif, pertinent et engageant pour l'audience GNDC !`;
  }

  protected generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  protected async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  protected formatWhatsAppMessage(content: string): string {
    return content;
  }

  addGNDCFooter(message?: string): string {
    return `${
      message ? message + "\n\n---\n" : ""
    }💻 *GNDC - Grand Nord Developers Community*\nSite : https://gndc.tech\nContact : contact@gndc.tech`;
  }

  //generate answer from a prompt
  async output(prompt: string): Promise<string> {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: this.gndcContext },
      { role: "user", content: prompt },
    ];
    try {
      const response = await this.callOpenAI(messages);
      return response.choices[0].message?.content || "";
    } catch (error: any) {
      return this.handleOpenAIError(error);
    }
  }

  protected handleOpenAIError(error: any): string {
    if (error.response) {
      return `Erreur OpenAI (${error.response.status}): ${
        error.response.data?.error?.message || "Erreur inconnue"
      }`;
    }
    return `Erreur OpenAI : ${error.message}`;
  }

  protected async callOpenAI(
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    tools?: OpenAI.Chat.Completions.ChatCompletionTool[],
    toolChoice?: any
  ): Promise<OpenAI.Chat.Completions.ChatCompletion> {
    try {
      return await this.client.chat.completions.create({
        model: this.model,
        messages: messages,
        tools: tools,
        tool_choice: toolChoice,
      });
    } catch (error: any) {
      throw new Error(this.handleOpenAIError(error));
    }
  }

  protected validateToolCall(
    response: OpenAI.Chat.Completions.ChatCompletion,
    expectedToolName: string
  ): { success: boolean; toolCall?: any; error?: string } {
    const responseMessage = response.choices[0].message;
    const toolCalls = responseMessage.tool_calls;

    if (!toolCalls || toolCalls.length === 0) {
      return {
        success: false,
        error: `OpenAI n'a pas appelé la fonction ${expectedToolName}`,
      };
    }

    const toolCall = toolCalls[0];
    //@ts-ignore
    if (toolCall.function.name !== expectedToolName) {
      return {
        success: false,
        //@ts-ignore
        error: `Fonction incorrecte appelée: ${toolCall.function.name} au lieu de ${expectedToolName}`,
      };
    }

    return { success: true, toolCall };
  }

  protected log(
    message: string,
    type: "info" | "success" | "error" | "warning" = "info"
  ): void {
    const icons = {
      info: "ℹ️",
      success: "✅",
      error: "❌",
      warning: "⚠️",
    };
    console.log(`${icons[type]} ${message}`);
  }

  abstract generate(...args: any[]): Promise<any>;
}
export interface BaseResult {
  success: boolean;
  error?: string;
  message?: string;
}
