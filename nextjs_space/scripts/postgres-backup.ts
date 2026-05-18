import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

function usage() {
  console.log(`Usage:
  yarn db:backup
  yarn db:restore

Required:
  DATABASE_URL                  PostgreSQL connection URL

Backup options:
  POSTGRES_BACKUP_DIR           Output directory (default: .floyd/backups/postgres)

Restore options:
  POSTGRES_RESTORE_FILE         Dump file created by pg_dump --format=custom`)
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is required`)
  return value
}

function run(command: string, args: string[]) {
  const result = spawnSync(command, args, { stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}

function backup(databaseUrl: string) {
  const backupDir = resolve(process.cwd(), process.env.POSTGRES_BACKUP_DIR?.trim() || '.floyd/backups/postgres')
  mkdirSync(backupDir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const file = resolve(backupDir, `legacy-legion-${stamp}.dump`)
  run('pg_dump', ['--format=custom', '--no-owner', '--no-acl', '--file', file, databaseUrl])
  console.log(`Backup written: ${file}`)
}

function restore(databaseUrl: string) {
  const file = requireEnv('POSTGRES_RESTORE_FILE')
  run('pg_restore', ['--clean', '--if-exists', '--no-owner', '--no-acl', '--dbname', databaseUrl, file])
  console.log(`Restore applied from: ${file}`)
}

async function main() {
  const mode = process.argv[2] ?? 'backup'
  if (mode === '--help' || mode === '-h') {
    usage()
    return
  }

  const databaseUrl = requireEnv('DATABASE_URL')
  if (mode === 'backup') return backup(databaseUrl)
  if (mode === 'restore') return restore(databaseUrl)
  throw new Error(`Unknown mode: ${mode}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
