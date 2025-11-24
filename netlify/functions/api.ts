import serverless from "serverless-http";
import { Handler } from "@netlify/functions";
import { createApp } from "../../src/api";
import { globalState } from "../../src/types";
import { startBot } from "../../src/index";

let wrapped: any;
let botStarting: Promise<void> | null = null;

export const handler: Handler = async (event, context) => {
  // Start the bot if it hasn't been started yet
  if (!botStarting) {
    botStarting = startBot().catch((error: Error) => {
      console.error("Failed to start bot:", error);
      throw error;
    });
  }

  try {
    // Wait for bot to start with a timeout
    await Promise.race([
      botStarting,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Bot startup timeout")), 10000)
      ),
    ]);
  } catch (error) {
    return {
      statusCode: 503,
      body: JSON.stringify({
        success: false,
        message:
          "Bot is starting or failed to start. Please try again in a few moments.",
        error: error instanceof Error ? error.message : String(error),
      }),
    };
  }

  // Ensure the bot/socket is available
  if (!globalState.sock) {
    return {
      statusCode: 503,
      body: JSON.stringify({
        success: false,
        message: "Bot not connected yet. Please try again in a few moments.",
      }),
    };
  }

  // Lazily wrap the Express app with serverless-http so the app is reused between invocations
  if (!wrapped) {
    const app = createApp(
      globalState.sock,
      globalState.logger ?? (console as any)
    );
    wrapped = serverless(app);
  }

  return wrapped(event, context);
};
