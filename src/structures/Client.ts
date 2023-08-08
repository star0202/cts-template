import { config } from '../config'
import { VERSION } from '../constants'
import { CommandClient } from '@pikokr/command.ts'
import { green } from 'chalk'
import { exec } from 'child_process'
import { ActivityType, Client } from 'discord.js'
import { Jejudo } from 'jejudo'
import { join } from 'path'
import { Logger } from 'tslog'

export default class CustomClient extends CommandClient {
  private jejudo: Jejudo | null = null

  constructor(logger: Logger<unknown>) {
    super(
      new Client({
        intents: ['GuildMessages', 'Guilds', 'MessageContent'],
      }),
      logger
    )

    this.discord.once('ready', (client) => this.onReady(client))

    this.discord.on('debug', (msg) => {
      this.logger.debug(msg)
    })
  }

  async setup() {
    await this.enableApplicationCommandsExtension({ guilds: config.guilds })

    await this.registry.loadAllModulesInDirectory(
      join(__dirname, '..', 'modules')
    )
  }

  async onReady(client: Client<true>) {
    this.jejudo = new Jejudo(client, {
      isOwner: (user) => this.owners.has(user.id),
      prefix: `<@${client.user.id}> `,
      noPermission: (i) => i.reply('Permission denied'),
    })

    client.on('messageCreate', (msg) => this.jejudo?.handleMessage(msg))

    client.on('interactionCreate', (i) => {
      this.jejudo?.handleInteraction(i)
    })

    client.user.setPresence({
      activities: [
        {
          name: `${VERSION} (${
            exec('git rev-parse --short HEAD').stdout ?? 'N/A'
          })`,
          type: ActivityType.Playing,
        },
      ],
    })

    this.logger.info(`Logged in as: ${green(client.user.tag)}`)

    await this.fetchOwners()
  }

  async start() {
    await this.setup()

    await this.discord.login(config.token)

    await this.getApplicationCommandsExtension()?.sync()
  }
}
