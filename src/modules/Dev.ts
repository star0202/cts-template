import { Emojis } from '../constants'
import CustomClient from '../structures/Client'
import CustomEmbed from '../structures/Embed'
import { toString } from '../utils/object'
import {
  Extension,
  applicationCommand,
  listener,
  ownerOnly,
} from '@pikokr/command.ts'
import { blue, green, yellow } from 'chalk'
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js'
import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ChatInputCommandInteraction,
} from 'discord.js'
import type {
  CommandInteractionOption,
  GuildBasedChannel,
  Interaction,
  Message,
} from 'discord.js'
import { basename } from 'path'

const commandLog = (data: CommandInteractionOption, indents = 0) =>
  `\n${' '.repeat(indents * 2)}- ${green(data.name)}: ${blue(
    data.value
  )} (${yellow(ApplicationCommandOptionType[data.type])})`

class Dev extends Extension<CustomClient> {
  @listener({ event: 'applicationCommandInvokeError', emitter: 'cts' })
  async errorLogger(err: Error) {
    this.logger.error(err.stack)
  }

  @listener({ event: 'interactionCreate' })
  async commandLogger(i: Interaction) {
    if (!i.isChatInputCommand()) return

    const options = i.options.data.map((data) =>
      data.type !== ApplicationCommandOptionType.Subcommand
        ? commandLog(data)
        : `\n- ${green(data.name)}: (${yellow('Subcommand')})` +
          data.options?.map((x) => commandLog(x, 1))
    )

    const guild = i.guild
      ? `${green(`#${(i.channel as GuildBasedChannel).name}`)}(${blue(
          i.channelId
        )}) at ${green(i.guild.name)}(${blue(i.guild.id)})`
      : 'DM'

    const msg = `${green(i.user.tag)}(${blue(
      i.user.id
    )}) in ${guild}: ${yellow.bold(`/${i.commandName}`)}${options}`

    this.logger.info(msg)
  }

  @ownerOnly
  @applicationCommand({
    type: ApplicationCommandType.ChatInput,
    name: 'reload',
    description: '[OWNER] Reload all modules',
  })
  async reload(i: ChatInputCommandInteraction) {
    await i.deferReply({
      ephemeral: true,
    })

    const modules = await this.commandClient.registry.reloadModules()
    const success = modules.filter((x) => x.result),
      fail = modules.filter((x) => !x.result)

    const { Success, Fail } = Emojis

    i.editReply({
      embeds: [
        new CustomEmbed()
          .setTitle('Every module reloaded')
          .setDescription(`${Success} ${success.length} ${Fail} ${fail.length}`)
          .addFields(
            {
              name: 'Success',
              value:
                success.map((x) => basename(x.file)).join('\n') || '*None*',
            },
            {
              name: 'Fail',
              value: fail.map((x) => basename(x.file)).join('\n') || '*None*',
            }
          ),
      ],
    })
  }

  @ownerOnly
  @applicationCommand({
    type: ApplicationCommandType.ChatInput,
    name: 'sync',
    description: '[OWNER] Sync commands',
  })
  async sync(i: ChatInputCommandInteraction) {
    await i.deferReply({
      ephemeral: true,
    })

    await this.commandClient.getApplicationCommandsExtension()?.sync()

    i.editReply({
      embeds: [
        new CustomEmbed()
          .setTitle('Commands synced')
          .setDescription(`${Emojis.Success} Done`),
      ],
    })
  }

  @listener({ event: 'messageCreate' })
  async eval(msg: Message) {
    if (!this.commandClient.owners.has(msg.author.id)) return

    if (!msg.content.startsWith(`<@${this.client.user?.id}> eval`)) return

    const code = msg.content
      .split(' ')
      .slice(2)
      .join(' ')
      .replace(/```(js|ts)?/g, '')
      .trim()

    let res
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { cts, client } = {
        cts: this.commandClient,
        client: this.client,
      }

      res = await eval(code)
    } catch (e) {
      await msg.react(Emojis.Fail)

      if (!(e instanceof Error)) throw e

      msg.reply({
        embeds: [
          new CustomEmbed()
            .setTitle('Error occurred')
            .setColor('Red')
            .addChunkedFields(
              {
                name: 'Input',
                value: code,
              },
              {
                name: 'Stack trace',
                value: e.stack ?? 'N/A',
              }
            ),
        ],
      })

      return
    }

    await msg.react(Emojis.Success)
    const output = typeof res === 'string' ? res : toString(res)
    msg.reply({
      embeds: [
        new CustomEmbed()
          .setTitle('Successfully executed')
          .setColor('Green')
          .addChunkedFields(
            {
              name: 'Input',
              value: code,
            },
            {
              name: 'Output',
              value: output,
            }
          ),
      ],
      allowedMentions: { repliedUser: false },
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setStyle(ButtonStyle.Link)
            .setLabel('Jump to message')
            .setURL(msg.url)
        ),
      ],
    })
  }
}

export const setup = async () => new Dev()
