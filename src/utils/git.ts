import { execSync } from 'node:child_process'

export const getHeadRevision = () =>
  execSync('git rev-parse HEAD').toString().trim()
