import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Device } from "../../models/index.js";

export const data = new SlashCommandBuilder()
  .setName("wakeup")
  .setDescription("Wake up a device")
  .addStringOption((option) => option.setName("device").setDescription("The device's name to wake").setRequired(true));

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const deviceName = interaction.options.getString("device");
  const devices = Device.list();

  const device = devices.find((el) => el.name === deviceName);
  if (device !== undefined) {
    await device.wakeup();
    await interaction.reply(`Message correctement envoyé.`);
  } else {
    await interaction.reply(`Appareil inconnu : ${deviceName}.`);
  }
}
