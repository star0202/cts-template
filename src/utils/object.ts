import { inspect } from 'util'

export const toString = (obj: object, ignore?: string[]): string => {
  const copied = structuredClone(obj)

  if (ignore) {
    ignore.forEach((key) => {
      delete copied[key as keyof typeof copied]
    })
  }

  return inspect(copied, {
    maxArrayLength: 200,
    depth: 2,
  })
}
