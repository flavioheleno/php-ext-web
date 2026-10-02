// @vitest-environment node
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'
import { processExtensionVersion } from '../../../scripts/generate-history.js'

describe('history generation', () => {
  it('uses report indexes and preserves every architecture without inventing failures', () => {
    const dataDir = mkdtempSync(join(tmpdir(), 'php-ext-history-test-'))
    try {
      mkdirSync(join(dataDir, 'reports/redis'), { recursive: true })
      mkdirSync(join(dataDir, 'history'), { recursive: true })
      writeFileSync(join(dataDir, 'reports/redis/6.3.0.json'), JSON.stringify({
        builds: { '2026': { '02': { '14': 'history/redis.json' } } },
      }))
      const build = { extension: 'redis', extension_version: '6.3.0', workflow_run_id: 1, php_version: '8.3', platform: 'alpine', platform_version: '3.22' }
      writeFileSync(join(dataDir, 'history/redis.json'), JSON.stringify([
        { ...build, arch: 'amd64', status: 'success' },
        { ...build, arch: 'arm32v7', status: 'failure' },
        { ...build, arch: 'arm64', status: 'success', extension_version: '6.2.0' },
      ]))
      expect(processExtensionVersion('redis', '6.3.0', dataDir)).toBe(true)
      const result = JSON.parse(readFileSync(join(dataDir, 'reports/redis/6.3.0-history.json'), 'utf8'))
      expect(result.snapshots[0].php_versions['8.3']).toEqual({ pass: 1, fail: 1, total: 2, success_rate: 50 })
      expect(result.snapshots[0].platforms['8.3'][0].architectures).toEqual({ amd64: 'success', arm32v7: 'failure' })
    } finally {
      rmSync(dataDir, { recursive: true })
    }
  })
})
