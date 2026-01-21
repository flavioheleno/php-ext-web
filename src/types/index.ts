export interface OsVersionData {
  versions: string[]
  exclude?: Array<{ version: string; arch: string }>
}

export interface OsVersions {
  [os: string]: OsVersionData
}

export interface PhpVersionData {
  tag: string | null
  branch: string
  sha256?: string
}

export interface PhpVersions {
  [version: string]: PhpVersionData
}

export interface ExtensionDependencies {
  build: string[]
  runtime: string[]
}

export interface ExtensionMeta {
  dependencies: {
    alpine: ExtensionDependencies
    debian: ExtensionDependencies
  }
  pecl_name: string
  track_url: string
  type: string
  last_checked: string
  latest_version: string
}

export interface Extensions {
  base_image_registry: string
  architectures: string[]
  extensions: { [name: string]: ExtensionMeta }
}

export interface LatestExtension {
  path: string
  version: string
  updated_at: string
  pass: number
  fail: number
  total: number
}

export interface LatestData {
  [extension: string]: LatestExtension
}

export interface BuildResult {
  extension: string
  extension_version: string
  channel: string
  php_version: string
  platform: string
  platform_version: string
  arch: string
  status: 'success' | 'failure'
  started_at: string
  finished_at: string
  workflow_run_id: number
  run_attempt: number
  git_sha: string
  log_url: string
  asset_name: string
}

export interface ProcessedExtension {
  name: string
  version: string
  updated_at: string
  pass: number
  fail: number
  total: number
  successRate: number
  path: string
  builds?: BuildResult[]
}

export interface Filters {
  os: string[]
  phpVersion: string[]
  arch: string[]
  extension: string[]
  status: 'all' | 'success' | 'failure'
  search: string
}

export interface Metadata {
  osVersions: OsVersions
  phpVersions: PhpVersions
  architectures: string[]
  extensions: { [name: string]: ExtensionMeta }
}
