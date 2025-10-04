import { WASocket } from "@whiskeysockets/baileys";
import config from "../utils";

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
> > *ask*    - Posez une question au chatbot ou naviguez sur le web
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
  args: string[]
): Promise<void> {
  if (from === config.bot?.group_target) {
    await sock.sendMessage(from, {
      text: groupHelp,
    });
    return;
  }
  if (from === config.bot?.author_jid) {
    await sock.sendMessage(from, {
      text: helpText,
    });
    return;
  }
  await sock.sendMessage(from, { text: inboxHelp });
}
