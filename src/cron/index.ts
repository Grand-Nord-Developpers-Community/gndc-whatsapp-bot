import cron from "node-cron";
import * as dotenv from "dotenv";
dotenv.config();
import { GNDCRedisStorage } from "../storage.js";
import { proto, WASocket } from "@whiskeysockets/baileys";
import { Logger } from "pino";
import { GNDCMemeGenerator } from "../meme-ai.js";
import config from "../utils.js";
import { GNDCQuizGenerator, Quiz } from "../quiz-ai.js";
const storage = new GNDCRedisStorage();
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
  //every day at 12 AM
  const quizAnswerTask = cron.schedule(
    "0 12 * * *",
    async () => {
      await sendQuizAnswers(sock);
    },
    { timezone: "Africa/Douala" }
  );
  console.log("memeTask status:", memeTask.getNextRun());
  console.log("quizTask status:", quizTask.getNextRun());
  console.log("quizAnswerTask status:", quizAnswerTask.getNextRun());

  async function sendMeme(sock: WASocket) {
    const generator = new GNDCMemeGenerator("mohamedconsole", "imgflip123#");
    const result = await generator.generate(true);
    const formattedResponse = generator.formatResponse(result);
    logger.info("response", formattedResponse);

    if (formattedResponse) {
      await sock.sendMessage(
        process.env.TEST_GROUP_ID || config.bot?.group_target || "",
        {
          image: { url: formattedResponse.url! },
          caption: generator.addGNDCFooter(),
        }
      );
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
      const msg = await sock.sendMessage(
        process.env.TEST_GROUP_ID || config.bot?.group_target || "",
        {
          poll: {
            name: message,
            values: quizResult.quiz.options.map((o) => o.text),
            selectableCount: 1,
            toAnnouncementGroup: false, // or true
          },
        }
      );

      if (msg) {
        await sock.sendMessage(
          process.env.TEST_GROUP_ID || config.bot?.group_target || "",
          {
            pin: msg.key,
            type: 1,
            time: 86400,
          }
        );
      }

      await storage.save(`quiz:${quiz.id}`, "quiz", quiz, 259196);
      await storage.save(`message:${quiz.id}`, "custom", msg, 259196);
      await storage.save(`quiz-id`, "custom", quiz.id);
    }
  }

  async function sendQuizAnswers(sock: WASocket) {
    const quizId = await storage.get("quiz-id");
    console.log(quizId);
    if (!quizId) return;
    const quiz: Quiz | undefined = await storage.getQuiz(quizId);
    console.log(quiz);
    if (quiz) {
      const msg: proto.WebMessageInfo | null | undefined = await storage.get(
        `message:${quizId}`
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
          process.env.TEST_GROUP_ID || config.bot?.group_target || "",
          {
            text: `*Réponse :* ${response}\n*Explication :* ${explication}`,
          }
          // { quoted: { key: msg } }
        );
        await sock.sendMessage(
          process.env.TEST_GROUP_ID || config.bot?.group_target || "",
          {
            pin: msg.key!,
            type: 0,
          }
        );
        setTimeout(async () => {
          await storage.delete(`quiz:${quizId}`);
          await storage.delete(`message:${quizId}`);
          await storage.delete(`quiz-id`);
        }, 3000);
      }
    }
  }
}
