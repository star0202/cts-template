import { inspect as nodeInspect } from 'node:util'

export const inspect = <T>(obj: T, ignore?: (keyof T)[]): string => {
  let cur = obj
  if (ignore) {
    try {
      cur = structuredClone(obj)
    } catch (e) {
      console.error(e)
    }

    for (const key of ignore) delete cur[key]
  }

  return nodeInspect(cur, {
    maxArrayLength: 200,
    depth: 2,
  })
}
