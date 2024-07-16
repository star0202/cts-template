export const formatMemory = (memory: NodeJS.MemoryUsage) =>
  `RSS: ${toMB(memory.rss)}MB (Heap ${toMB(memory.heapUsed)}/${toMB(memory.heapTotal)}MB, External ${toMB(memory.external)}MB)`
const toMB = (bytes: number) => (bytes / 1024 / 1024).toFixed(2)
