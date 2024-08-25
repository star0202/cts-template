import { join } from 'node:path'
import { CommandClient } from '@pikokr/command.ts'
import { green } from 'chalk'
import { ActivityType, Client, Events } from 'discord.js'
import type { GatewayIntentBits, Partials } from 'discord.js'
import type { Logger } from 'tslog'
import { config } from '../config'
import { VERSION } from '../constants'
import { getHeadRevision } from '../utils/git'

export default class CustomClient extends CommandClient {
  readonly startedAt = Date.now()

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
        presence: {
          activities: [
            {
              name: `${VERSION} (${getHeadRevision().slice(0, 7) ?? 'N/A'})`,
              type: ActivityType.Playing,
            },
          ],
        },
      }),
      logger,
    )

    this.discord.once(Events.ClientReady, (client) =>
      this.onClientReady(client),
    )

    this.discord.on(Events.Debug, (msg) => this.logger.debug(msg))
  }

  async setup() {
    await this.enableApplicationCommandsExtension({
      guilds: config.guilds.length > 0 ? config.guilds : undefined,
    })

    await this.registry.loadAllModulesInDirectory(
      join(__dirname, '..', 'modules'),
    )
  }

  async onClientReady(client: Client<true>) {
    this.logger.info(`Logged in as: ${green(client.user.tag)}`)

    await this.fetchOwners()
  }

  async start() {
    await this.setup()

    await this.discord.login(config.token)

    await this.getApplicationCommandsExtension()?.sync()
  }
}
