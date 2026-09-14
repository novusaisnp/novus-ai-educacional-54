// node scripts/check-enrollment-numero-documento.mjs [--apply]
// Default: aplica a migration num savepoint e confere o backfill, ROLLBACK no final.
import { readFile, writeFile, mkdtemp, rm, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const apply = process.argv.includes('--apply');
const ref = (await readFile('supabase/.temp/project-ref', 'utf8')).trim();
if (ref !== 'ixnpotaccbpcbritxlud') throw new Error('Projeto vinculado não é o Educacional');

const migrationSql = await readFile(
  'supabase/migrations/20260914140000_enrollment_contracts_numero_documento.sql',
  'utf8',
);

const checkSql = `
SELECT count(*) AS total, count(numero_documento) AS com_numero_documento
FROM public.enrollment_contracts;
`;

const historySql = `
INSERT INTO supabase_migrations.schema_migrations(version,name)
VALUES ('20260914140000','enrollment_contracts_numero_documento')
ON CONFLICT (version) DO NOTHING;
`;

const folder = await mkdtemp(join(tmpdir(), 'edu-enrollment-fix-'));
try {
  const file = join(folder, 'check.sql');
  await writeFile(
    file,
    `BEGIN; SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='60s';\n${migrationSql}\n${checkSql}\n${apply ? historySql : ''}\n${apply ? 'COMMIT' : 'ROLLBACK'}; SELECT '${apply ? 'applied' : 'checks_passed_rollback'}' AS resultado;`,
    'utf8',
  );
  const result = spawnSync(
    'supabase',
    ['db', 'query', '--linked', '--file', file, '--output-format', 'json'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );
  process.stdout.write(result.stdout ?? '');
  process.stderr.write(result.stderr ?? '');
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  await rm(join(folder, 'check.sql'), { force: true });
  await rmdir(folder);
}
