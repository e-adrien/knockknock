import {
  ChatInputCommandInteraction,
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  SlashCommandBuilder,
} from "discord.js";
import { readdirSync } from "fs";
import { join } from "path";

type SlashCommand = {
  data: SlashCommandBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
};

declare module "discord.js" {
  interface Client {
    commands: Collection<string, SlashCommand>;
  }
}

export type DiscordBotOptions = {
  token: string;
  clientId: string;
  guildId: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function loadDiscordBotOptions(opts: any): DiscordBotOptions | null {
  if (opts === null || typeof opts !== "object") {
    return null;
  }
  if (typeof opts.token !== "string" || typeof opts.clientId !== "string" || typeof opts.guildId !== "string") {
    return null;
  }

  return {
    token: opts.token,
    clientId: opts.clientId,
    guildId: opts.guildId,
  };
}

export async function createDiscordBot(serverRootPath: string, options: DiscordBotOptions) {
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  client.commands = new Collection();
  const commandsPath = join(serverRootPath, "discord/commands");
  const commandFiles = readdirSync(commandsPath).filter((file) => file.endsWith(".js") || file.endsWith(".ts"));
  for (const file of commandFiles) {
    const filePath = join(commandsPath, file);
    const command = await import(filePath);
    if ("data" in command && "execute" in command) {
      client.commands.set(command.data.name, command);
    } else {
      console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
  }

  client.once(Events.ClientReady, (readyClient) => {
    console.log(`Discord logged in as ${readyClient.user.tag}`);
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) {
      return;
    }

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
      console.error(`No command matching ${interaction.commandName} was found.`);
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: "There was an error while executing this command!", ephemeral: true });
      } else {
        await interaction.reply({ content: "There was an error while executing this command!", ephemeral: true });
      }
    }
  });

  client.login(options.token);
}
