// import { GNDCMemeGenerator } from "./meme-ai.js";
// import { GNDCQuizGenerator } from "./quiz-ai";
import { GNDCRedisStorage } from "./storage.js";

async function main() {
  //const generator = new GNDCMemeGenerator("mohamedconsole", "imgflip123#");
  const storage = new GNDCRedisStorage();

  // Test de connexion

  //console.log("🎨 *Générateur de Mèmes Aléatoires GNDC*\n");
  //console.log("L'IA va choisir elle-même un sujet et créer un mème !\n");

  // Générer un seul mème aléatoire
  //const result = await generator.generate(true);
  // const formattedResponse = generator.formatResponse(result);
  //console.log(formattedResponse);

  //const quizGen = new GNDCQuizGenerator();

  //console.log("\n\n📚 *Génération de quiz...*");
  //const quizResult = await quizGen.generate();
  //   if (quizResult.success && quizResult.quiz) {
  //     console.log(quizGen.formatResponse(quizResult.quiz, false));

  //     console.log(quizResult.quiz);
  //     // Test de réponse
  //     const check = quizGen.checkAnswer(quizResult.quiz, "A");
  //     console.log(`\n${check.explanation}`);
  //   }
}

// Décommenter pour tester
main().catch(console.error);
