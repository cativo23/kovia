// backend/scripts/check-integration-specs.ts
// Run: npx tsx scripts/check-integration-specs.ts  (from backend/)
// Purpose: PATTERN-03 enforcement — any service that injects both PRISMA_RLS and
// PublicPrismaService must have a sibling *.integration.spec.ts file.

import { Project } from 'ts-morph';
import { readdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';

const project = new Project({
  tsConfigFilePath: join(process.cwd(), 'tsconfig.json'),
  skipAddingFilesFromTsConfig: true,
});

project.addSourceFilesAtPaths([
  'src/**/*.service.ts',
  'src/**/*.processor.ts',
  '!src/**/*.spec.ts',
  '!src/generated/**',
]);

const scannedFiles = project.getSourceFiles();
if (scannedFiles.length === 0) {
  console.error(
    '::error::PATTERN-03 check found 0 source files. ' +
    'Run from backend/ and verify tsconfig.json exists.',
  );
  process.exit(1);
}

const violations: string[] = [];

for (const sourceFile of scannedFiles) {
  // Import-level detection: PRISMA_RLS token + bypass client both present.
  // Bypass client may be PublicPrismaService (class import) OR PRISMA_PUBLIC (token injection).
  // AdoptersService uses @Inject(PRISMA_PUBLIC) instead of PublicPrismaService class import.
  const importNames = sourceFile
    .getImportDeclarations()
    .flatMap((i) => i.getNamedImports().map((n) => n.getName()));

  const usesPrismaRls = importNames.includes('PRISMA_RLS');
  const usesBypassClient =
    importNames.includes('PublicPrismaService') ||
    importNames.includes('PRISMA_PUBLIC');

  if (!(usesPrismaRls && usesBypassClient)) continue;

  const filePath = sourceFile.getFilePath();
  const dir = dirname(filePath);
  // e.g. "animals.service" from "animals.service.ts"
  const base = basename(filePath, '.ts');

  // Accept any *.integration.spec.ts that starts with the service base name.
  // This matches:
  //   animals.service.integration.spec.ts
  //   animals.service.rls.integration.spec.ts
  //   applications.service.rls.integration.spec.ts  (existing pattern)
  const hasSpec = readdirSync(dir).some(
    (f) => f.startsWith(base) && f.endsWith('.integration.spec.ts'),
  );

  if (!hasSpec) {
    violations.push(filePath);
  }
}

if (violations.length > 0) {
  console.error(
    '\n::error::PATTERN-03 violation — the following services inject both ' +
      'PRISMA_RLS and PublicPrismaService but have no sibling *.integration.spec.ts:\n',
  );
  violations.forEach((v) => console.error(`  ✗ ${v}`));
  process.exit(1);
}

console.log(
  'PATTERN-03 check passed — all dual-injection services have integration specs.',
);
