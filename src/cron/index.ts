import cron from "node-cron";
import * as dotenv from "dotenv";
dotenv.config();
import { GNDCRedisStorage } from "../storage.js";
import { proto, WASocket } from "@whiskeysockets/baileys";
import { Logger } from "pino";
import { GNDCMemeGenerator } from "../meme-ai.js";
import { getBotConfig, resolveTargetGroups, stripHtml } from "../utils.js";
import { GNDCQuizGenerator, Quiz } from "../quiz-ai.js";
import axios from "axios";
import { parseStringPromise } from "xml2js";
import { Article, Quote, RSSItem, ShortenedUrl } from "../types/index.js";
const storage = new GNDCRedisStorage();
const RSS_URL = "https://feeds.arstechnica.com/arstechnica/technology-lab";
async function shortenUrl(url: string): Promise<string> {
  try {
    const response = await axios.get(
      "https://ulvis.net/api.php?url=" + encodeURIComponent(url)
    );
    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      console.error("Erreur lors du raccourcissement de l'URL:", error.message);
    }
    return url; // Retourner l'URL originale en cas d'erreur
  }
}
async function formatNewsForWhatsApp(news: Article[]): Promise<string> {
  let message = "📰 *Actualités Technologiques (TOP 5)*\n\n";
  // message += "═══════════════════\n\n";

  for (const article of news) {
    const date = new Date(article.pubDate).toLocaleDateString("fr-FR");
    const shortLink = await shortenUrl(article.link);
    message += `*${article.number}.* ${article.title}\n`;
    // message += `👤 Par: ${article.creator}\n`;
    // message += `📅 ${date}\n`;
    // message += `📝 ${article.description}\n`;
    message += `*Lien : ${shortLink}*\n\n`;
    // message += "\n───────────────────────────────────────────\n\n";
  }

  // const updatedDate = new Date().toLocaleString("fr-FR");
  // message += "\n\n_Mise à jour: " + updatedDate + "_";
  return (
    message +
    "💻 *GNDC - Grand Nord Developers Community*\nSite : https://gndc.tech\nContact : contact@gndc.tech"
  );
}

function formatQuoteForWhatsApp(quote: Quote): string {
  let message = "";
  message += "✨ *Citation du jour* ✨\n\n";
  // message += "─────────────\n\n";
  message += `"_${quote.quote}_"\n\n`;
  message += `— *${quote.author}*`;

  return message;
}
async function fetchRSSFeed() {
  try {
    const response = await axios.get(RSS_URL);
    const parsed = await parseStringPromise(response.data);
    const items = (parsed.rss.channel[0].item || []) as RSSItem[];

    // Return top 5 items
    return items.slice(0, 5).map((item, idx) => ({
      number: idx + 1,
      title: item.title?.[0] || "No title",
      link: item.link?.[0] || "#",
      description: stripHtml(item.description?.[0] || ""),
      pubDate: item.pubDate?.[0] || "",
      creator: item["dc:creator"]?.[0]?._?.trim() || "Ars Technica",
    }));
  } catch (error) {
    console.error(
      "Error fetching RSS feed:",
      error instanceof Error ? error.message : String(error)
    );
    return [];
  }
}
async function fetchDailyQuote(): Promise<Quote | null> {
  try {
    const response = await axios.get(
      "https://quotes-api-self.vercel.app/quote"
    );
    return response.data as Quote;
  } catch (error) {
    if (error instanceof Error) {
      console.error(
        "Erreur lors de la récupération de la citation:",
        error.message
      );
    }
    return null;
  }
}
/**
 * Initialize the Express API server
 * @param sock - WhatsApp socket instance
 * @param logger - Logger instance
 * @returns Express app instance
 */
export async function initializeCron(sock: WASocket, logger: Logger) {
  const memeTask = cron.schedule(
    "0 10 * * *",
    async () => {
      await sendMeme(sock);
    },
    { timezone: "Africa/Douala" }
  );
  const quizTask = cron.schedule(
    "0 21 * * *",
    async () => {
      console.log("🧩 Sending quiz at 9 PM...");
      await sendQuiz(sock);
    },
    { timezone: "Africa/Douala" }
  );
  //every day at 11 AM
  const quizAnswerTask = cron.schedule(
    "0 11 * * *",
    async () => {
      await sendQuizAnswers(sock);
    },
    { timezone: "Africa/Douala" }
  );

  const newsTask = cron.schedule(
    "0 16 * * *",
    async () => {
      await sendNewsToWhatsApp(sock);
    },
    { timezone: "Africa/Douala" }
  );

  const quoteTask = cron.schedule(
    "0 13 * * *",
    async () => {
      await sendQuoteToWhatsApp(sock);
    },
    { timezone: "Africa/Douala" }
  );
  console.log(await getBotConfig());
  console.log("memeTask status:", memeTask.getNextRun());
  console.log("quizTask status:", quizTask.getNextRun());
  console.log("newsTask status:", newsTask.getNextRun());
  console.log("quoteTask status:", quoteTask.getNextRun());
  console.log("quizAnswerTask status:", quizAnswerTask.getNextRun());

  async function sendMeme(sock: WASocket) {
    const generator = new GNDCMemeGenerator(
      process.env.IMGFLIP_USERNAME || "username",
      process.env.IMGFLIP_PASSWORD || "password"
    );
    const result = await generator.generate(true);
    const formattedResponse = generator.formatResponse(result);
    logger.info("response", formattedResponse);
    if (formattedResponse) {
      const targets = await resolveTargetGroups("allowedevent", "meme");
      for (const { id: groupId } of targets) {
        await sock.sendMessage(groupId, {
          image: { url: formattedResponse.url! },
          caption: generator.addGNDCFooter(),
        });
      }
    }
  }

  async function sendNewsToWhatsApp(sock: WASocket): Promise<void> {
    try {
      console.log("📡 Récupération du flux RSS...");
      const news = await fetchRSSFeed();

      if (news.length === 0) {
        console.log("❌ Aucun article trouvé");
        return;
      }

      const message = await formatNewsForWhatsApp(news);

      console.log("📤 Envoi du message à WhatsApp...");
      // await sock.sendMessage(
      //   process.env.TEST_GROUP_ID || config.bot?.group_target || "",
      //   { text: message }
      // );
      const targets = await resolveTargetGroups("allowedevent", "tech-news");
      for (const { id: groupId } of targets) {
        await sock.sendMessage(groupId, {
          text: message,
        });
      }
      console.log("✅ Message envoyé avec succès!");
    } catch (error) {
      if (error instanceof Error) {
        console.error("Erreur lors de l'envoi du message:", error.message);
      }
    }
  }
  async function sendQuoteToWhatsApp(sock: WASocket): Promise<void> {
    try {
      console.log("📡 Récupération du flux RSS...");
      const quote = await fetchDailyQuote();

      if (!quote) {
        console.log("❌ Aucun quote trouvé");
        return;
      }

      const message = formatQuoteForWhatsApp(quote);

      console.log("📤 Envoi du message à WhatsApp...");
      // await sock.sendMessage(
      //   process.env.TEST_GROUP_ID || config.bot?.group_target || "",
      //   { text: message }
      // );
      const targets = await resolveTargetGroups("allowedevent", "quote");
      for (const { id: groupId } of targets) {
        await sock.sendMessage(groupId, {
          text: message,
        });
      }

      console.log("✅ Message envoyé avec succès!");
    } catch (error) {
      if (error instanceof Error) {
        console.error("Erreur lors de l'envoi du message:", error.message);
      }
    }
  }
  async function sendQuiz(sock: WASocket) {
    const checkPendingQuiz = await storage.get("quiz-id");
    if (checkPendingQuiz) return;
    const quiz = new GNDCQuizGenerator();
    const quizResult = await quiz.generate();
    logger.info("quiz result : \n", quizResult);

    if (quizResult.success && quizResult.quiz) {
      const quiz = quizResult.quiz;
      let message = `*${quiz.titre}*\n`;
      //message += `*Domaine :* ${quiz.domaine}\n`;
      message += `*Difficulté :* ${quiz.difficulte}\n`;
      //message += `*Points :* ${quiz.points}\n\n`;
      message += `*Question :*\n${quiz.question}\n`;
      const targets = await resolveTargetGroups("allowedevent", "quiz");
      for (const { id: groupId } of targets) {
        const msg = await sock.sendMessage(groupId, {
          poll: {
            name: message,
            values: quizResult.quiz.options.map((o) => o.text),
            selectableCount: 1,
            toAnnouncementGroup: false, // or true
          },
        });

        if (msg) {
          await sock.sendMessage(groupId, {
            pin: msg.key,
            type: 1,
            time: 86400,
          });
          await storage.save(
            `message:${quiz.id}:${groupId}`,
            "custom",
            msg,
            259196
          );
        }
      }
      if (quiz) {
        await storage.save(`quiz:${quiz.id}`, "quiz", quiz, 259196);
        await storage.save(`quiz-id`, "custom", quiz.id);
      }
    }
  }

  async function sendQuizAnswers(sock: WASocket) {
    const quizId = await storage.get("quiz-id");
    console.log(quizId);
    if (!quizId) return;
    const quiz: Quiz | undefined = await storage.getQuiz(quizId);
    console.log(quiz);
    if (quiz) {
      const targets = await resolveTargetGroups("allowedevent", "quiz");
      for (const { id: groupId } of targets) {
        const msg: proto.WebMessageInfo | null | undefined = await storage.get(
          `message:${quizId}:${groupId}`
        );
        console.log(msg);

        const response = quiz.options.filter((v) => v.isCorrect)[0].text;
        const explication = quiz.explication;
        // const pollCreation: proto.IMessage = {};

        // const result = getAggregateVotesInPollMessage({ message: pollCreation });
        // console.log(result);
        // //const users=result.map((r)=>r.voters)
        if (msg) {
          await sock.sendMessage(
            groupId,
            {
              text: `*Réponse :* ${response}\n*Explication :* ${explication}`,
            }
            // { quoted: { key: msg } }
          );
          await sock.sendMessage(groupId, {
            pin: msg.key!,
            type: 0,
          });
          await storage.delete(`message:${quizId}:${groupId}`);
        }
      }
      setTimeout(async () => {
        await storage.delete(`quiz:${quizId}`);
        await storage.delete(`quiz-id`);
      }, 3000);
    }
  }
}
