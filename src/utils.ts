/**
 * Utility functions for WhatsApp bot
 * Add helpers here for config, formatting, validation, etc.
 */
import fs from "fs";
import yaml from "js-yaml";
import path from "path";
import { BotConfig } from "./types";

let config: BotConfig = {};
try {
  // Try multiple possible locations for bot.yml
  const possiblePaths = [
    path.join(process.cwd(), "bot.yml"),
    path.join(__dirname, "..", "bot.yml"),
    path.join(__dirname, "..", "..", "bot.yml"), // For Netlify functions
  ];

  let configFile: string | null = null;
  for (const configPath of possiblePaths) {
    if (fs.existsSync(configPath)) {
      configFile = fs.readFileSync(configPath, "utf8");
      break;
    }
  }

  if (!configFile) {
    throw new Error("Could not find bot.yml in any of the expected locations");
  }

  config = yaml.load(configFile) as BotConfig;
} catch (e) {
  console.error("⚠️ Failed to load bot.yml:", e);
}

export default config;
export const exampleQuiz = {
  id: "quiz_1760069091103_saagw1i4d",
  titre: "Les bases de JavaScript",
  question: "Qu'est-ce qu'une constante en JavaScript ?",
  domaine: "Programmation JavaScript",
  difficulte: "debutant",
  options: [
    {
      id: "1",
      text: "Une variable dont la valeur peut être modifiée à tout moment.",
      isCorrect: false,
    },
    {
      id: "2",
      text: "Une fonction pré-définie en JavaScript.",
      isCorrect: false,
    },
    {
      id: "3",
      text: "Une variable dont la valeur ne peut pas être modifiée après sa déclaration.",
      isCorrect: true,
    },
    {
      id: "4",
      text: "Un script inclu dans un fichier HTML.",
      isCorrect: false,
    },
  ],
  explication:
    "Une constante en JavaScript est déclarée avec le mot-clé 'const'. Sa valeur est immuable après son initialisation. Elle est utile pour les valeurs qui ne doivent pas changer dans le programme.",
  points: 10,
};
