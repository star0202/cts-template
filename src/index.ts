import { config } from './config'
import { CustomClient } from './structures'

const cts = new CustomClient()

;(async () => {
  await cts.setup()

  await cts.discord.login(config.token)

  await cts.getApplicationCommandsExtension()?.sync()
})()
