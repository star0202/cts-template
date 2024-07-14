import z from 'zod'

const Config = z.object({
  token: z.string().regex(/[\w-]{24}\.[\w-]{6}\.[\w-]{27}/g),
  guilds: z.array(z.string()),
  debug: z.boolean(),
})

export const config = Config.parse(require('../config.json'))
