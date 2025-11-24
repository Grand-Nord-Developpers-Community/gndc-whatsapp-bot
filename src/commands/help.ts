import { proto, WASocket } from "@whiskeysockets/baileys";
import config, { resolveTargetGroups } from "../utils.js";
import { ask, help } from "./index.js";

/**
 * Lists all available commands and their descriptions.
 * Usage: !help
 */
const helpText = `Available commands:
> > *hi*     - Say hello
> > *time*   - Show current time
> > *image*  - Send an image
> > *poll*   - Create a poll
> > *ping*   - Check bot response time
> > *groups* - List all groups you are in
> > *ask*    - Posez une question au chatbot ou naviguez sur le web
`;

const inboxHelp = `
Available commands:
> > *hi*     - Say hello
> > *help*    - Posez une question au chatbot ou naviguez sur le web
`;

const groupHelp = `
commands GNDC :
> > *hi*     - salutation
> > *ask*    - demander une information
> > *news*   - 5 dernieres publications 
> > *forums* - consultez les questions sur la plateformes
> > *events* - la liste des prochaines évènement
> > *leaderboard* - Top 5 utilisateurs GNDC
`;

//map of command name to description
const commandDescriptions: { [key: string]: string } = {
  hi: "Salutation",
  ask: "Posez une question au chatbot ou naviguez sur le web",
  news: "5 dernieres publications",
  forums: "consultez les questions sur la plateformes",
  events: "la liste des prochaines évènement",
  leaderboard: "Top 5 utilisateurs GNDC",
  help: "liste des commandes disponibles.",
};
function formatCommandList(commands: { [key: string]: string }): string {
  let message = "Commande disponible:\n\n";
  for (const [command, description] of Object.entries(commands)) {
    message += `> > *${command}* - ${description}\n`;
  }
  return message;
}

export const name = "help";
export const description = "List available commands.";

/**
 * Sends a help message listing all commands.
 * @param {WASocket} sock - WhatsApp socket instance
 * @param {string} from - Sender JID
 * @param {Array<string>} args - Command arguments
 */
export async function execute(
  sock: WASocket,
  from: string,
  msg: proto.IMessageKey & {
    remoteJidAlt?: string;
    participantAlt?: string;
    server_id?: string;
    addressingMode?: string;
    isViewOnce?: boolean;
  },
  args: string[]
): Promise<void> {
  const ids = await resolveTargetGroups("allowedcommand", "help");
  const isAllowed = ids.some((t) => t.id === from);
  if (!isAllowed && from.endsWith("@g.us")) {
    return;
  }
  const isAllowedInbox = ids[0].allow_inbox?.includes("help");
  if (!isAllowedInbox) {
    return;
  }
  const listCommands = ids.find((t) => t.id === from)?.allow_inbox;
  //map each command to its description
  const cmd: { [key: string]: string } = {};
  if (listCommands) {
    for (const command of listCommands) {
      cmd[command] = commandDescriptions[command];
    }
  }
  const formattedCommands = formatCommandList(cmd);
  let helpText = `${formattedCommands}`;
  if (!listCommands) {
    const allowed_commands = ids[0].allow_inbox;
    if (allowed_commands && allowed_commands.length > 0) {
      //map each command to its description
      const cmd: { [key: string]: string } = {};
      for (const command of allowed_commands) {
        cmd[command] = commandDescriptions[command];
      }
      helpText = formatCommandList(cmd);
    } else {
      helpText = `Aucune commande disponible pour vous.`;
    }
  }
  await sock.sendMessage(from, { text: helpText, mentions: [from] });
}
