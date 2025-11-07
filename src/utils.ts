/**
 * Utility functions for WhatsApp bot
 * Add helpers here for config, formatting, validation, etc.
 */
import fs from "fs";
import yaml from "js-yaml";
import { BotConfig } from "./types";
import dotenv from "dotenv";
dotenv.config();
let config: BotConfig = {};
try {
  const isOnNetlify = process.env.NETLIFY;
  const file = fs.readFileSync(
    isOnNetlify ? "../bot.yml" : "./bot.yml",
    "utf8"
  );
  config = yaml.load(file) as BotConfig;
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
