import OpenAI from "openai";
import { BaseResult, GNDCBaseGenerator } from "./ai.js";

interface QuizOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface Quiz {
  id: string;
  titre: string;
  question: string;
  domaine: string;
  difficulte: "debutant" | "intermediaire" | "avance";
  options: QuizOption[];
  explication: string;
  points: number;
}

export interface QuizGenerationResult extends BaseResult {
  quiz?: Quiz;
}
export class GNDCQuizGenerator extends GNDCBaseGenerator {
  private techDomains: string[];
  private tools: OpenAI.Chat.Completions.ChatCompletionTool[];

  constructor() {
    super();

    this.techDomains = [
      "Programmation Python",
      "Programmation JavaScript",
      "Développement Web",
      "Bases de données",
      "Réseaux informatiques",
      "Intelligence Artificielle",
      "DevOps et CI/CD",
      "Cloud Computing",
      "Git et Contrôle de version",
      "Sécurité informatique",
    ];

    this.tools = [
      {
        type: "function",
        function: {
          name: "create_quiz",
          description: "Crée un quiz éducatif en français pour GNDC.",
          parameters: {
            type: "object",
            properties: {
              titre: {
                type: "string",
                description: "Titre du quiz en français",
              },
              question: {
                type: "string",
                description: "La question du quiz",
              },
              domaine: {
                type: "string",
                description:
                  "Domaine technologique parmi : " +
                  this.techDomains.join(", "),
              },
              difficulte: {
                type: "string",
                enum: ["debutant", "intermediaire", "avance"],
              },
              options: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    text: { type: "string" },
                    isCorrect: { type: "boolean" },
                  },
                },
                minItems: 4,
                maxItems: 4,
              },
              explication: {
                type: "string",
                description: "Explication de la bonne réponse",
              },
              points: {
                type: "number",
                description: "Points (10-50)",
              },
            },
            required: [
              "titre",
              "question",
              "domaine",
              "difficulte",
              "options",
              "explication",
              "points",
            ],
          },
        },
      },
    ];
  }

  async generate(
    domaine?: string,
    difficulte?: "debutant" | "intermediaire" | "avance",
    sujetSpecifique?: string
  ): Promise<QuizGenerationResult> {
    const selectedDomain =
      domaine ||
      this.techDomains[Math.floor(Math.random() * this.techDomains.length)];
    const selectedDiffuculty =
      difficulte ||
      ["debutant", "intermediaire", "avance"][Math.floor(Math.random() * 3)];
    const prompt = sujetSpecifique
      ? `Crée un quiz sur : "${sujetSpecifique}" (Domaine: ${selectedDomain}, Difficulté: ${selectedDiffuculty})`
      : `Crée un quiz pertinent en ${selectedDomain} (Difficulté: ${selectedDiffuculty})`;

    this.log(
      `Génération quiz - Domaine: ${selectedDomain}, Difficulté: ${selectedDiffuculty}`,
      "info"
    );

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: this.gndcContext },
      { role: "user", content: prompt },
    ];

    try {
      const response = await this.callOpenAI(messages, this.tools, "auto");

      const validation = this.validateToolCall(response, "create_quiz");
      if (!validation.success) {
        return { success: false, error: validation.error };
      }

      const functionArgs = JSON.parse(validation.toolCall.function.arguments);

      // Valider qu'il n'y a qu'une seule bonne réponse
      const correctAnswers = functionArgs.options.filter(
        (opt: QuizOption) => opt.isCorrect
      );
      if (correctAnswers.length !== 1) {
        return {
          success: false,
          error: `${correctAnswers.length} réponses correctes au lieu de 1`,
        };
      }

      const quiz: Quiz = {
        id: this.generateId("quiz"),
        titre: functionArgs.titre,
        question: functionArgs.question,
        domaine: functionArgs.domaine,
        difficulte: functionArgs.difficulte,
        options: functionArgs.options,
        explication: functionArgs.explication,
        points: functionArgs.points,
      };

      this.log(`Quiz créé: ${quiz.titre}`, "success");

      return { success: true, quiz };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  formatResponse(quiz: Quiz, showAnswer: boolean = false): string {
    let message = `📚 *${quiz.titre}*\n\n`;
    message += `🎯 *Domaine :* ${quiz.domaine}\n`;
    message += `📊 *Difficulté :* ${quiz.difficulte}\n`;
    message += `⭐ *Points :* ${quiz.points}\n\n`;
    message += `❓ *Question :*\n${quiz.question}\n\n`;
    message += `*Options :*\n`;

    quiz.options.forEach((opt) => {
      message += `${opt.id}. ${opt.text}\n`;
    });

    if (showAnswer) {
      const correct = quiz.options.find((opt) => opt.isCorrect);
      message += `\n✅ *Bonne réponse :* ${correct?.id}\n`;
      message += `\n💡 *Explication :*\n${quiz.explication}`;
    }

    return this.addGNDCFooter(message);
  }

  checkAnswer(
    quiz: Quiz,
    answerId: string
  ): { correct: boolean; explanation: string } {
    const selected = quiz.options.find((opt) => opt.id === answerId);
    const correct = quiz.options.find((opt) => opt.isCorrect);

    if (!selected) {
      return { correct: false, explanation: "Option invalide" };
    }

    if (selected.isCorrect) {
      return {
        correct: true,
        explanation: `✅ *Correct !* +${quiz.points} points\n\n💡 ${quiz.explication}`,
      };
    }

    return {
      correct: false,
      explanation: `❌ *Incorrect !*\n\nBonne réponse : *${correct?.id}*\n\n💡 ${quiz.explication}`,
    };
  }
}
