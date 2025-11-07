import serverless from "serverless-http";
import { Handler } from "@netlify/functions";
import { createApp } from "../../src/api";
import { globalState } from "../../src/types";

let wrapped: any;

export const handler: Handler = async (event, context) => {
  // Ensure the bot/socket is available
  if (!globalState.sock) {
    return {
      statusCode: 503,
      body: JSON.stringify({
        success: false,
        message: "Bot not connected yet",
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
