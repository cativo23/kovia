/**
 * Development seed script.
 *
 * SECURITY: The default credentials below are for local development ONLY.
 * They are intentionally weak and well-known. They MUST NOT be used in
 * staging or production. The script refuses to run when NODE_ENV=production
 * unless SEED_ALLOW_PRODUCTION=1 is explicitly set.
 *
 * Override via env vars:
 *   SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD
 *   SEED_ORG_ADMIN_EMAIL, SEED_ORG_ADMIN_PASSWORD
 */
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

// Use MIGRATION_DATABASE_URL (superuser) so RLS policies don't block seed inserts.
// The app_user (DATABASE_URL) is subject to RLS; the migration user bypasses it.
const adapter = new PrismaPg({
  connectionString: process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@kovia.local';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'admin123!';
const ORG_ADMIN_EMAIL = process.env.SEED_ORG_ADMIN_EMAIL ?? 'orgadmin@dametupatasv.local';
const ORG_ADMIN_PASSWORD = process.env.SEED_ORG_ADMIN_PASSWORD ?? 'orgadmin123!';
const ORG_SLUG = 'dametupatasv';

async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.SEED_ALLOW_PRODUCTION !== '1') {
    throw new Error('Refusing to run seed in NODE_ENV=production without SEED_ALLOW_PRODUCTION=1');
  }

  // eslint-disable-next-line no-console
  console.log('[seed] Starting seed...');
  // eslint-disable-next-line no-console
  console.warn('[seed] WARNING: dev credentials — do not use in staging/prod');

  // 1. Platform admin (upsert by email)
  const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},
    create: {
      email: ADMIN_EMAIL,
      passwordHash: adminHash,
      firstName: 'Platform',
      lastName: 'Admin',
      role: 'PLATFORM_ADMIN',
      emailVerified: true,
    },
  });

  // 2. Org admin user (upsert by email). The Organization->User link is established
  //    exclusively via Organization.adminId below; there is no back-reference to update.
  const orgAdminHash = await bcrypt.hash(ORG_ADMIN_PASSWORD, 10);
  const orgAdminUser = await prisma.user.upsert({
    where: { email: ORG_ADMIN_EMAIL },
    update: {},
    create: {
      email: ORG_ADMIN_EMAIL,
      passwordHash: orgAdminHash,
      firstName: 'Demo',
      lastName: 'OrgAdmin',
      role: 'ORG_ADMIN',
      emailVerified: true,
    },
  });

  // 3. Organization (upsert by slug, guarantees unique adminId relation)
  const org = await prisma.organization.upsert({
    where: { slug: ORG_SLUG },
    update: {},
    create: {
      slug: ORG_SLUG,
      name: 'DameTuPataSV',
      description: 'Rescate y adopción en El Salvador (demo seed)',
      adminId: orgAdminUser.id,
      status: 'ACTIVE',
    },
  });

  // Phase 15 D-14: mark DameTuPataSV verified at seed time (idempotent — re-runs overwrite verifiedAt
  // with a new timestamp, but the column stays non-null which is the launch-checklist requirement).
  await prisma.organization.update({
    where: { slug: ORG_SLUG },
    data: { verifiedAt: new Date() },
  });

  // 4. Default species (upsert by slug)
  const speciesDefs = [
    { slug: 'perros', name: 'Perros' },
    { slug: 'gatos', name: 'Gatos' },
  ];
  const speciesByKey: Record<string, { id: string }> = {};
  for (const s of speciesDefs) {
    const row = await prisma.species.upsert({
      where: { slug: s.slug },
      update: {},
      create: s,
    });
    speciesByKey[s.slug] = row;
  }

  // 5. Demo animals (idempotent via composite natural key {organizationId, name}).
  //    Prisma doesn't allow @@unique([organizationId, name]) unless declared in schema,
  //    so we use findFirst + create to keep idempotency without schema change.
  const animalsToSeed = [
    {
      name: 'Nova',
      description: 'Perrita cariñosa rescatada del centro de San Salvador',
      speciesSlug: 'perros',
      breed: 'Mestizo',
      gender: 'FEMALE' as const,
      ageMonths: 18,
      size: 'MEDIUM' as const,
      energyLevel: 'MEDIUM' as const,
      goodWithKids: true,
      goodWithDogs: true,
      goodWithCats: false,
      goodWithOtherPets: false,
      vaccinated: true,
      sterilized: true,
      status: 'AVAILABLE' as const,
    },
    {
      name: 'Milo',
      description: 'Gatito juguetón buscando hogar',
      speciesSlug: 'gatos',
      breed: 'Criollo',
      gender: 'MALE' as const,
      ageMonths: 6,
      size: 'SMALL' as const,
      energyLevel: 'HIGH' as const,
      goodWithKids: true,
      goodWithDogs: false,
      goodWithCats: true,
      goodWithOtherPets: false,
      vaccinated: true,
      sterilized: false,
      status: 'AVAILABLE' as const,
    },
  ];

  for (const a of animalsToSeed) {
    const existing = await prisma.animal.findFirst({
      where: { organizationId: org.id, name: a.name },
    });
    if (existing) continue;
    const { speciesSlug, ...rest } = a;
    await prisma.animal.create({
      data: {
        ...rest,
        organizationId: org.id,
        speciesId: speciesByKey[speciesSlug].id,
      },
    });
  }

  // 6. Phase 15 D-13: seed 3 AdoptionStory rows for DameTuPataSV (manually curated es-SV testimonials).
  //    photoUrl paths resolve under frontend/public/seed/stories/ at runtime (actual JPGs land in the
  //    launch-checklist task). animalId is left null because the seeded animals here don't have
  //    dossiers (D-07 fail-closed). publishedAt offsets create a deterministic sort order.
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const stories = [
    {
      adopterFirstName: 'Ana',
      city: 'San Salvador',
      testimonial:
        'Adoptar a nuestra perrita fue la mejor decisión. El proceso con DameTuPataSV fue claro y honesto; nos contaron todo lo que necesitábamos saber antes de comprometernos. Hoy es parte de la familia.',
      photoUrl: '/seed/stories/story-1.jpg',
      publishedAt: new Date(now - 7 * day),
    },
    {
      adopterFirstName: 'Carlos',
      city: 'Santa Tecla',
      testimonial:
        'Tenía dudas porque nunca había tenido un gato adulto, pero el dossier me ayudó a entender qué esperar. Después de tres meses ya tenemos rutina y mucho cariño. Gracias por el acompañamiento.',
      photoUrl: '/seed/stories/story-2.jpg',
      publishedAt: new Date(now - 14 * day),
    },
    {
      adopterFirstName: 'Sofía',
      city: 'La Libertad',
      testimonial:
        'Buscábamos un compañero senior y encontramos exactamente eso. La transparencia sobre su condición médica y costos mensuales nos permitió prepararnos. Es tranquilo, agradecido, y duerme mucho cerca de la ventana.',
      photoUrl: '/seed/stories/story-3.jpg',
      publishedAt: new Date(now - 30 * day),
    },
  ];

  for (const s of stories) {
    const exists = await prisma.adoptionStory.findFirst({
      where: {
        organizationId: org.id,
        adopterFirstName: s.adopterFirstName,
        city: s.city,
      },
    });
    if (exists) continue;
    await prisma.adoptionStory.create({
      data: {
        ...s,
        organizationId: org.id,
      },
    });
  }

  // Suppress unused variable warning for admin (used for context/logging only)
  void admin;

  // eslint-disable-next-line no-console
  console.log('[seed] Done.');
  // eslint-disable-next-line no-console
  console.log(`[seed] Platform admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  // eslint-disable-next-line no-console
  console.log(`[seed] Org admin:      ${ORG_ADMIN_EMAIL} / ${ORG_ADMIN_PASSWORD}`);
}

main()
  .catch(async (e) => {
    // eslint-disable-next-line no-console
    console.error('[seed] FAILED:', e);
    await prisma.$disconnect();
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
