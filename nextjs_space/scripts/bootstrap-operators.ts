import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

type OperatorRole = 'superadmin' | 'admin' | 'team'

type OperatorSpec = {
  label: string
  primaryPrefix: string
  fallbackPrefixes?: string[]
  role: OperatorRole
}

type OperatorInput = {
  label: string
  email: string
  name: string | null
  password: string
  role: OperatorRole
}

const OPERATORS: OperatorSpec[] = [
  { label: 'Douglas SUPERADMIN operator', primaryPrefix: 'OPERATOR_DOUGLAS', fallbackPrefixes: ['OPERATOR_ADMIN'], role: 'superadmin' },
  { label: 'Ryan ADMIN operator', primaryPrefix: 'OPERATOR_RYAN', fallbackPrefixes: ['OPERATOR_FIELD'], role: 'admin' },
]

function clean(value: string | undefined): string {
  return value?.trim() ?? ''
}

function isPlaceholder(value: string): boolean {
  const normalized = value.toLowerCase()
  return normalized.includes('example') || normalized.includes('changeme') || normalized.includes('password')
}


function configuredPrefix(spec: OperatorSpec): string | null {
  for (const prefix of [spec.primaryPrefix, ...(spec.fallbackPrefixes ?? [])]) {
    const hasAnyValue = Boolean(
      clean(process.env[`${prefix}_EMAIL`]) ||
      clean(process.env[`${prefix}_PASSWORD`]) ||
      clean(process.env[`${prefix}_NAME`]),
    )
    if (hasAnyValue) return prefix
  }
  return null
}
function readOperator(spec: OperatorSpec): OperatorInput | null {
  const prefix = configuredPrefix(spec)
  if (!prefix) return null

  const email = clean(process.env[`${prefix}_EMAIL`]).toLowerCase()
  const password = process.env[`${prefix}_PASSWORD`] ?? ''
  const name = clean(process.env[`${prefix}_NAME`]) || null

  if (!email || !password) throw new Error(`${prefix}_EMAIL and ${prefix}_PASSWORD are both required for ${spec.label}`)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error(`${prefix}_EMAIL must be a valid email address`)
  if (password.length < 12) throw new Error(`${prefix}_PASSWORD must be at least 12 characters`)
  if (isPlaceholder(email) || isPlaceholder(password)) throw new Error(`${prefix} contains placeholder credentials`)

  return { label: spec.label, email, name, password, role: spec.role }
}

async function upsertOperator(input: OperatorInput) {
  const hashed = await bcrypt.hash(input.password, 10)
  const user = await prisma.user.upsert({
    where: { email: input.email },
    update: { name: input.name, password: hashed, role: input.role },
    create: { email: input.email, name: input.name, password: hashed, role: input.role },
    select: { id: true, email: true, role: true },
  })

  console.log(`Bootstrapped ${input.label}: ${user.email} (${user.role})`)
}

export async function bootstrapOperators() {
  const operators = OPERATORS.map(readOperator).filter((operator): operator is OperatorInput => operator !== null)
  if (operators.length === 0) {
    console.log('No operator bootstrap env vars configured; no users changed.')
    return
  }

  for (const operator of operators) {
    await upsertOperator(operator)
  }
}

bootstrapOperators()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
