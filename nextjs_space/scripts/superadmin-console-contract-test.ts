import { readFileSync } from 'node:fs'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function read(path: string): string {
  return readFileSync(path, 'utf8')
}

function main() {
  const page = read('app/app/superadmin/page.tsx')
  const createRoute = read('app/api/superadmin/users/route.ts')
  const updateRoute = read('app/api/superadmin/users/[id]/route.ts')
  const consoleUi = read('app/app/superadmin/_components/superadmin-console.tsx')
  const auth = read('lib/auth.ts')
  const shell = read('app/app/_components/team-shell.tsx')

  assert(page.includes('isSuperAdminRole'), 'superadmin page must enforce the role on the server')
  assert(createRoute.includes('requireSuperAdminUser()'), 'account creation must require superadmin')
  assert(updateRoute.includes('requireSuperAdminUser()'), 'account updates must require superadmin')
  assert(createRoute.includes('bcrypt.hash(password, 12)'), 'new account passwords must be hashed')
  assert(updateRoute.includes('bcrypt.hash(password, 12)'), 'reset passwords must be hashed')
  assert(updateRoute.includes('last active superadmin'), 'last-superadmin lockout protection must remain present')
  assert(updateRoute.includes('cannot change or disable your own role'), 'self-lockout protection must remain present')
  assert(auth.includes("reason: 'account_disabled'"), 'disabled accounts must be rejected during authentication')
  assert(auth.includes("where: { id: token.id as string }"), 'JWT sessions must refresh the current database role')
  assert(shell.includes("href: '/app/superadmin'"), 'superadmin navigation entry must be present')
  assert(consoleUi.includes('Passwords are accepted only for hashing and are never displayed or returned.'), 'console must explain password handling')
  assert(consoleUi.includes('Open Runtime Control'), 'console must expose runtime control entry')
  assert(!createRoute.includes('password: user.password'), 'account API must not return password hashes')

  console.log('superadmin-console-contract-test: PASS')
}

main()
