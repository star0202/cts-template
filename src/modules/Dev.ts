import {
  Extension,
  applicationCommand,
  listener,
  option,
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
  Guild,
  GuildBasedChannel,
  GuildMember,
  Interaction,
  Message,
  MessageCreateOptions,
} from 'discord.js'
import { ownerOnly } from '../checks/owner'
import { Emojis } from '../constants'
import { Eval, Info, Notice, Reload, Sync } from '../embeds/Dev'
import type CustomClient from '../structures/Client'
import KnownError from '../structures/Error'
import { inspect } from '../utils/object'

export type NoticeResult = {
  guild: Guild
  owner: GuildMember
}

const commandLog = (data: CommandInteractionOption, indents = 0) =>
  `\n${' '.repeat(indents * 2)}- ${green(data.name)}: ${blue(
    data.value,
  )} (${yellow(ApplicationCommandOptionType[data.type])})`

class Dev extends Extension<CustomClient> {
  @listener({ event: 'applicationCommandInvokeError', emitter: 'cts' })
  async errorLogger(err: Error) {
    if (err instanceof KnownError) return this.logger.warn(err.message)

    this.logger.error(err.stack)
  }

  @listener({ event: 'interactionCreate' })
  async commandLogger(i: Interaction) {
    if (!i.isChatInputCommand()) return

    const options = i.options.data.map((data) =>
      data.type !== ApplicationCommandOptionType.Subcommand
        ? commandLog(data)
        : `\n- ${green(data.name)}: (${yellow('Subcommand')})${data.options?.map((x) => commandLog(x, 1))}`,
    )

    const guild = i.guild
      ? `${green(`#${(i.channel as GuildBasedChannel).name}`)}(${blue(
          i.channelId,
        )}) at ${green(i.guild.name)}(${blue(i.guild.id)})`
      : 'DM'

    const msg = `${green(i.user.tag)}(${blue(
      i.user.id,
    )}) in ${guild}: ${yellow.bold(`/${i.commandName}`)}${options}`

    this.logger.info(msg)
  }

  @listener({
    event: 'messageCreate',
  })
  async dmForwarder(msg: Message) {
    if (!msg.channel.isDMBased()) return

    if (msg.author.bot) return

    if (await this.commandClient.isOwner(msg.author)) return

    const { content: _content, attachments } = msg
    const files = attachments.map((x) => x.url)
    const content = `From: **${msg.author.tag}**(${msg.author.id})\n\n${_content}`

    for (const owner of this.commandClient.owners) {
      const user = await this.client.users.fetch(owner)

      await user.send({
        files,
        content,
      })
    }
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

    i.editReply({
      embeds: [Reload.result(modules)],
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
      embeds: [Sync.success()],
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

    // biome-ignore lint/suspicious/noExplicitAny: return type of eval() is any
    let res: any
    try {
      const { cts, client } = {
        cts: this.commandClient,
        client: this.client,
      }

      // biome-ignore lint/security/noGlobalEval: eval is used for debugging
      res = await eval(code)
    } catch (e) {
      await msg.react(Emojis.Fail)

      if (!(e instanceof Error)) throw e

      msg.reply({
        embeds: [Eval.error(code, e)],
        allowedMentions: { repliedUser: false },
      })

      return
    }

    await msg.react(Emojis.Success)
    const output = typeof res === 'string' ? res : inspect(res)
    msg.reply({
      embeds: [Eval.success(code, output)],
      allowedMentions: { repliedUser: false },
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setStyle(ButtonStyle.Link)
            .setLabel('Jump to message')
            .setURL(msg.url),
        ),
      ],
    })
  }

  @ownerOnly
  @applicationCommand({
    name: 'notice',
    type: ApplicationCommandType.ChatInput,
    description: "[OWNER] Send a notice to all guild's owner",
  })
  async notice(
    i: ChatInputCommandInteraction,
    @option({
      name: 'url',
      description: 'discohook URL',
      type: ApplicationCommandOptionType.String,
      required: true,
    })
    msgURL: string,
  ) {
    await i.deferReply({
      ephemeral: true,
    })

    let payload: MessageCreateOptions
    try {
      const payloads = JSON.parse(
        Buffer.from(
          // biome-ignore lint/style/noNonNullAssertion: param data is always exist
          new URL(msgURL).searchParams.get('data')!,
          'base64',
        ).toString(),
      ).messages.map((msg: { data: MessageCreateOptions }) => msg.data)

      if (payloads.length > 1)
        return i.editReply({
          embeds: [Notice.tooMany()],
        })

      payload = payloads[0]
    } catch (e) {
      return i.editReply({
        embeds: [Notice.invalidURL()],
      })
    }

    const success: NoticeResult[] = []
    const fail: NoticeResult[] = []

    await Promise.all(
      this.client.guilds.cache.map(async (guild) => {
        const owner = await guild.fetchOwner()

        try {
          await owner.send({
            ...payload,
            content: `**From**: **${i.user.globalName} (Dev)**\n**To**: owner of **${guild.name}**\n\n${payload.content}`,
          })

          success.push({ guild, owner })
        } catch {
          fail.push({ guild, owner })
        }
      }),
    )

    i.editReply({
      embeds: [Notice.result(success, fail)],
    })
  }

  @ownerOnly
  @applicationCommand({
    name: 'info',
    type: ApplicationCommandType.ChatInput,
    description: '[OWNER] Get bot info including latency',
  })
  async info(i: ChatInputCommandInteraction) {
    await i.deferReply({
      ephemeral: true,
    })

    const latency = Date.now() - i.createdTimestamp

    i.editReply({
      embeds: [Info.default(this.commandClient.startedAt, latency, process)],
    })
  }
}

export const setup = async () => new Dev()
