import { REST, Routes } from "discord.js";
import { readdirSync } from "fs";
import nconf from "nconf";
import { join, resolve } from "path";
import { fileURLToPath } from "url";
import { loadDiscordBotOptions } from "./discord/index.js";

const serverRootPath = fileURLToPath(new URL(".", import.meta.url));

nconf.file({ file: resolve(serverRootPath, "../config/config.json") });

const discordOptions = loadDiscordBotOptions(nconf.get("discord"));
if (discordOptions === null) {
  console.error(`[WARNING] Missing Discord configuration`);
  process.exitCode = 1;
} else {
  const commands = [];
  const commandsPath = join(serverRootPath, "discord/commands");
  const commandFiles = readdirSync(commandsPath).filter((file) => file.endsWith(".js") || file.endsWith(".ts"));
  for (const file of commandFiles) {
    const filePath = join(commandsPath, file);
    const command = await import(filePath);
    if ("data" in command && "execute" in command) {
      commands.push(command.data.toJSON());
    } else {
      console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
  }

  // Construct and prepare an instance of the REST module
  const rest = new REST().setToken(discordOptions.token);

  // Deploy our commands
  try {
    console.log(`Started refreshing ${commands.length} application (/) commands.`);

    // The put method is used to fully refresh all commands in the guild with the current set
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await rest.put(Routes.applicationGuildCommands(discordOptions.clientId, discordOptions.guildId), {
      body: commands,
    });

    console.log(`Successfully reloaded ${data.length} application (/) commands.`);
  } catch (error) {
    console.error(error);
  }
}
