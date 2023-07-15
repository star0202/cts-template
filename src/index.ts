import { config } from './config'
import Client from './structures/Client'
import { getLogger } from './utils'

const client = new Client(getLogger('Client'))

;(async () => {
  await client.setup()

  await client.discord.login(config.token)

  await client.getApplicationCommandsExtension()?.sync()
})()
