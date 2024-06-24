import { config } from '../config'
import { VERSION } from '../constants'
import { CommandClient } from '@pikokr/command.ts'
import { green } from 'chalk'
import { ActivityType, Client, Events } from 'discord.js'
import type { GatewayIntentBits, Partials } from 'discord.js'
import { short } from 'git-rev-sync'
import { join } from 'node:path'
import { Logger } from 'tslog'

export default class CustomClient extends CommandClient {
  constructor(config: {
    logger: Logger<unknown>
    intents: GatewayIntentBits[]
    partials?: Partials[]
  }) {
    const { logger, intents, partials } = config

    super(
      new Client({
        intents,
        partials,
      }),
      logger
    )

    this.discord.once(Events.ClientReady, (client) => this.onReady(client))

    this.discord.on(Events.Debug, (msg) => this.logger.debug(msg))
  }

  async setup() {
    await this.enableApplicationCommandsExtension({ guilds: config.guilds })

    await this.registry.loadAllModulesInDirectory(
      join(__dirname, '..', 'modules')
    )
  }

  async onReady(client: Client<true>) {
    client.user.setPresence({
      activities: [
        {
          name: `${VERSION} (${short() ?? 'N/A'})`,
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
