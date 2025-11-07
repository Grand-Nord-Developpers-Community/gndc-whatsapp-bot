/**
 * WhatsApp Bot Entry Point
 * Loads config, commands, events, and starts the bot.
 */
import {
  default as makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";
import fs from "fs";
import path from "path";
import pino from "pino";
import config from "./utils";
import { Command, EventHandler, ExtendedWASocket } from "./types";
import { initializeApi } from "./api";
import NodeCache from "node-cache";
import { initializeCron } from "./cron";

// Logging helper: create a logger at runtime so importing this module
// (for example by Netlify Functions) doesn't attempt to write to disk.
function createLogger() {
  const level = config.logging?.level || "info";

  // In a serverless / Netlify Functions environment the filesystem may be read-only.
  // Avoid creating log directories or writing files there; log to stdout instead.
  if (process.env.NETLIFY) {
    return pino({ level, transport: { target: "pino-pretty" } });
  }

  const logDir = path.join(__dirname, "..", "logs");
  try {
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    const logFile = path.join(
      logDir,
      `${new Date().toISOString().slice(0, 10)}.log`
    );
    return pino(
      { level, transport: { target: "pino-pretty" } },
      pino.destination(logFile)
    );
  } catch (e) {
    // If writing to disk fails for any reason, fall back to stdout.
    // Do not rethrow — we don't want the module import to crash.
    // eslint-disable-next-line no-console
    console.error("Could not create log directory, falling back to stdout:", e);
    return pino({ level, transport: { target: "pino-pretty" } });
  }
}

/**
 * Loads all command modules from the commands directory.
 * @returns {Map<string, Command>}
 */
const commands = new Map<string, Command>();
const commandsDir = path.join(__dirname, "commands");
if (fs.existsSync(commandsDir)) {
  fs.readdirSync(commandsDir).forEach((file) => {
    if (file.endsWith(".ts") || file.endsWith(".js")) {
      const cmd = require(`./commands/${file}`);
      commands.set(cmd.name, cmd);
    }
  });
}

/**
 * Loads all event handler modules from the events directory.
 * @returns {Array<EventHandler>}
 */
const eventsDir = path.join(__dirname, "events");
const eventHandlers: EventHandler[] = [];
if (fs.existsSync(eventsDir)) {
  const eventFiles = fs
    .readdirSync(eventsDir)
    .filter((f) => f.endsWith(".ts") || f.endsWith(".js"));
  for (const file of eventFiles) {
    const eventModule = require(`./events/${file}`);
    if (eventModule.eventName && typeof eventModule.handler === "function") {
      eventHandlers.push(eventModule);
    }
  }
}

/**
 * Starts the WhatsApp bot and registers event handlers.
 */
export const groupCache = new NodeCache({ stdTTL: 5 * 60, useClones: false });
export const gloBalCache = new NodeCache({ stdTTL: 5 * 60, useClones: false });
export async function startBot(): Promise<void> {
  const logger = createLogger();
  const { state, saveCreds } = await useMultiFileAuthState("auth_info");
  const { version, isLatest } = await fetchLatestBaileysVersion();
  logger.info(`Using Baileys v${version.join(".")}, Latest: ${isLatest}`);
  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: "silent" }),
    browser: ["NexosBot", "Opera GX", "120.0.5543.204"],
    generateHighQualityLinkPreview: true,
    markOnlineOnConnect: config.bot?.online || true,
    syncFullHistory: config.bot?.history || false,
    shouldSyncHistoryMessage: () => config.bot?.history || false,
    cachedGroupMetadata: async (jid) => groupCache.get(jid),
  }) as ExtendedWASocket;

  // Save login credentials on update
  sock.ev.on("creds.update", saveCreds);

  // Register all event handlers
  for (const { eventName, handler } of eventHandlers) {
    // Pass only the dependencies that the handler expects
    if (eventName === "connection.update") {
      sock.ev.on(eventName, handler(sock, logger, saveCreds, startBot));
    } else if (eventName === "messages.upsert") {
      sock.ev.on(eventName, handler(sock, logger, commands));
    } else {
      // For future extensibility, just pass sock and logger
      //@ts-ignore
      sock.ev.on(eventName, handler(sock, logger));
    }
  }

  // Initialize Express API server when running in a non-serverless/dev environment.
  // When deployed to Netlify Functions the Express app will be served via the function
  // and the long-running bot will expose the socket on `globalState` for the function to use.
  import("./types").then(({ globalState }) => {
    globalState.sock = sock;
    globalState.logger = logger;
  });
  if (!process.env.NETLIFY) {
    initializeApi(sock, logger);
  }
  initializeCron(sock, logger);
}

// Only auto-start the bot when this file is run directly (e.g., `node src/index.js` or ts-node).
// When imported by Netlify Functions we don't auto-start; the function will call `startBot()`.
if (require.main === module) {
  startBot().catch((err) => {
    // eslint-disable-next-line no-console
    console.error("Failed to start bot:", err);
    process.exit(1);
  });
}
