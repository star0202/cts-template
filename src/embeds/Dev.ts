import { basename } from 'node:path'
import { codeBlock } from 'discord.js'
import { Emojis } from '../constants'
import type { NoticeResult } from '../modules/Dev'
import CustomEmbed from '../structures/Embed'

export const Eval = {
  default: (code: string) =>
    new CustomEmbed().addChunkedFields({
      name: 'Input',
      value: code,
      valueF: (x) => codeBlock('ts', x),
    }),

  success: (code: string, output: string) =>
    Eval.default(code)
      .setTitle('Successfully executed')
      .setColor('Green')
      .addChunkedFields({
        name: 'Output',
        value: output,
        valueF: (x) => codeBlock('ts', x),
      }),

  error: (code: string, e: Error) =>
    Eval.default(code)
      .setTitle('Error occurred')
      .setColor('Red')
      .addChunkedFields({
        name: 'Stack trace',
        value: e.stack ?? 'N/A',
        valueF: (x) => codeBlock('ts', x),
      }),
}

export const Reload = {
  result: (
    modules: {
      file: string
      result: boolean
      error?: Error | undefined
      extensions?: object[] | undefined
    }[],
  ) => {
    const success = modules.filter((x) => x.result)
    const fail = modules.filter((x) => !x.result)

    const { Success, Fail } = Emojis

    return new CustomEmbed()
      .setTitle('Every module reloaded')
      .setDescription(`${Success} ${success.length} ${Fail} ${fail.length}`)
      .addFields(
        {
          name: 'Success',
          value: success.map((x) => basename(x.file)).join('\n') || '*None*',
        },
        {
          name: 'Fail',
          value: fail.map((x) => basename(x.file)).join('\n') || '*None*',
        },
      )
  },
}

export const Sync = {
  success: () =>
    new CustomEmbed()
      .setTitle('Commands synced')
      .setDescription(`${Emojis.Success} Done`),
}

export const Notice = {
  invalidURL: () =>
    new CustomEmbed()
      .setTitle('Invalid URL')
      .setColor('Red')
      .setDescription('Invalid discohook URL'),

  tooMany: () =>
    new CustomEmbed()
      .setTitle('Too many messages')
      .setColor('Red')
      .setDescription('You can only send 1 message at a time'),

  result: (success: NoticeResult[], fail: NoticeResult[]) =>
    new CustomEmbed()
      .setTitle('Notice result')
      .setDescription(
        `${Emojis.Success} ${success.length} ${Emojis.Fail} ${fail.length}`,
      )
      .addChunkedFields(
        {
          name: 'Success',
          value:
            success
              .map(
                (x) =>
                  `**${x.owner.user.tag}**(${x.owner.id}) of **${x.guild.name}**(${x.guild.id})`,
              )
              .join('\n') || '*None*',
        },
        {
          name: 'Fail',
          value:
            fail
              .map(
                (x) =>
                  `**${x.owner.user.tag}**(${x.owner.id}) of **${x.guild.name}**(${x.guild.id})`,
              )
              .join('\n') || '*None*',
        },
      ),
}
