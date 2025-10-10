import { GNDCMemeGenerator } from "./meme-ai";

async function main() {
  const generator = new GNDCMemeGenerator("mohamedconsole", "imgflip123#");

  console.log("🎨 *Générateur de Mèmes Aléatoires GNDC*\n");
  console.log("L'IA va choisir elle-même un sujet et créer un mème !\n");

  // Générer un seul mème aléatoire
  const result = await generator.generateRandomMeme(true);
  const formattedResponse = generator.formatResponse(result);
  console.log(formattedResponse);

  // Pour générer plusieurs mèmes d'un coup :
  // const results = await generator.generateMultipleRandomMemes(3);
  // results.forEach((result, index) => {
  //   console.log(`\n\n=== MÈME ${index + 1} ===`);
  //   console.log(generator.formatResponse(result));
  // });
}

// Décommenter pour tester
main().catch(console.error);
