import z from 'zod'

const Config = z.object({
  token: z.string().regex(/[A-Za-z\d]{23}\.[\w-]{6}\.[\w-]{27}/g),
  guilds: z.array(z.string()).optional(),
})

// eslint-disable-next-line @typescript-eslint/no-var-requires
const configRaw = require('../config.json')
if (configRaw.guilds.length === 0) {
  delete configRaw.guilds
}

export const config = Config.parse(configRaw)
