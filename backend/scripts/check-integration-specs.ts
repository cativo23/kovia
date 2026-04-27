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

const violations: string[] = [];

for (const sourceFile of project.getSourceFiles()) {
  // Import-level detection: PRISMA_RLS token + PublicPrismaService both present.
  // NOTE: Do NOT check for 'PrismaService' — animals.service.ts and organizations.service.ts
  // use PRISMA_RLS without importing PrismaService directly.
  const importNames = sourceFile
    .getImportDeclarations()
    .flatMap((i) => i.getNamedImports().map((n) => n.getName()));

  const usesPrismaRls = importNames.includes('PRISMA_RLS');
  const usesBypassClient = importNames.includes('PublicPrismaService');

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
