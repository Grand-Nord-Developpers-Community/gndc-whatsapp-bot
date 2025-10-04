/**
 * Utility functions for WhatsApp bot
 * Add helpers here for config, formatting, validation, etc.
 */
import fs from 'fs';
import yaml from 'js-yaml';
import { BotConfig } from './types';

let config: BotConfig = {};
try {
  const file = fs.readFileSync("./bot.yml", "utf8");
  config = yaml.load(file) as BotConfig;
} catch (e) {
  console.error("⚠️ Failed to load bot.yml:", e);
}

export default config;