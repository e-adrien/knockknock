import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { AwakableDevice } from "../../models/index.js";

export const data = new SlashCommandBuilder().setName("devices").setDescription("List available devices");

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const awakableDevices = await AwakableDevice.listAwakableDevices();

  let msg = "Appareils :\n```\n";
  msg += awakableDevices.map((el) => el.nameAndStatus()).join("\n");
  msg += "\n```";

  await interaction.reply(msg);
}
