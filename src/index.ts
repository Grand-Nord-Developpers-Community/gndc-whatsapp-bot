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

// Logging via pino
const logDir = path.join(__dirname, "..", "logs");
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}
const logFile = path.join(
  logDir,
  `${new Date().toISOString().slice(0, 10)}.log`
);

const logger = pino(
  {
    level: config.logging?.level || "info",
    transport: { target: "pino-pretty" },
  },
  pino.destination(logFile)
);

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
async function startBot(): Promise<void> {
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

  // Initialize Express API server
  initializeApi(sock, logger);
  initializeCron(sock, logger);
}

startBot();
