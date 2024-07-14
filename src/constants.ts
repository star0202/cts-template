import { Colors as DJSColors } from 'discord.js'

export const VERSION = require('../package.json').version as string

export const Colors = { ...DJSColors, Default: 0x2b2d31 as const }

export const Emojis = {
  Success: '✅',
  Fail: '❌',
} as const
