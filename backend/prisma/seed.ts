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

  // 7. Phase 16: Seed ExtrasTemplate rows for DameTuPataSV — one per AdoptionCategory.
  //    Each template uses behavioral-specificity framing (APPLY-04): observable past behavior
  //    or concrete resource constraints, NOT self-evaluation ("¿Sos activo?").
  //    criticality field ('CRITICA'|'IMPORTANTE'|'OPCIONAL') is stored in DB but stripped
  //    from adopter-facing API responses by the DTO layer (APPLY-05 / D-09).
  //    Upsert is idempotent: empty update clause means re-running seed is a no-op.
  const dametupatasv = await prisma.organization.findFirst({ where: { slug: 'dametupatasv' } });
  if (!dametupatasv) {
    throw new Error('[seed] DameTuPataSV organization not found — seed must run after step 3');
  }

  const extrasTemplates = [
    {
      adoptionCategory: 'SALUDABLE_ADULTO' as const,
      questions: [
        {
          id: 'sa-q1',
          text: '¿Cuántas caminatas de más de 20 minutos hiciste con un perro la semana pasada?',
          type: 'number',
          criticality: 'CRITICA',
          required: true,
          placeholder: 'Ej: 7',
        },
        {
          id: 'sa-q2',
          text: '¿Cuántas horas al día permanece la vivienda sola (sin personas adultas presentes)?',
          type: 'number',
          criticality: 'CRITICA',
          required: true,
          placeholder: 'Ej: 8',
        },
        {
          id: 'sa-q3',
          text: '¿Tenés patio, jardín u otro espacio exterior al que el perro pueda acceder sin supervisión constante?',
          type: 'boolean',
          criticality: 'IMPORTANTE',
          required: true,
        },
        {
          id: 'sa-q4',
          text: '¿Con qué frecuencia realizás actividades físicas al aire libre (correr, caminar, senderismo) en una semana típica?',
          type: 'select',
          options: ['Todos los días', '4–6 veces por semana', '1–3 veces por semana', 'Menos de una vez por semana'],
          criticality: 'IMPORTANTE',
          required: true,
        },
        {
          id: 'sa-q5',
          text: '¿Hay alguna restricción en tu vivienda (contrato de alquiler, reglamento de condominio) que limite tener mascotas?',
          type: 'text',
          criticality: 'OPCIONAL',
          required: false,
          placeholder: 'Describí la restricción si aplica, o escribí "Ninguna"',
        },
      ],
    },
    {
      adoptionCategory: 'SENIOR' as const,
      questions: [
        {
          id: 'sr-q1',
          text: '¿Tenés acceso regular a un veterinario de confianza? ¿Con qué frecuencia llevás o has llevado una mascota al veterinario en el último año?',
          type: 'text',
          criticality: 'CRITICA',
          required: true,
          placeholder: 'Ej: Clínica X en Santa Tecla, visitas cada 3 meses',
        },
        {
          id: 'sr-q2',
          text: '¿Cuántas horas al día hay al menos una persona adulta presente en la vivienda?',
          type: 'number',
          criticality: 'CRITICA',
          required: true,
          placeholder: 'Ej: 16',
        },
        {
          id: 'sr-q3',
          text: '¿Tu vivienda tiene acceso sin gradas o con rampa para un perro con movilidad reducida?',
          type: 'boolean',
          criticality: 'CRITICA',
          required: true,
        },
        {
          id: 'sr-q4',
          text: '¿Alguna vez cuidaste a una mascota de edad avanzada (más de 8 años)? Describí brevemente esa experiencia.',
          type: 'text',
          criticality: 'IMPORTANTE',
          required: false,
          placeholder: 'Ej: Tuve un perro de 12 años durante sus últimos dos años de vida...',
        },
        {
          id: 'sr-q5',
          text: '¿Cuánto presupuesto mensual estimás poder destinar a cuidados veterinarios de rutina y emergencias?',
          type: 'select',
          options: ['Menos de $30', '$30–$60', '$60–$120', 'Más de $120'],
          criticality: 'OPCIONAL',
          required: false,
        },
      ],
    },
    {
      adoptionCategory: 'MEDICO_CRONICO' as const,
      questions: [
        {
          id: 'mc-q1',
          text: '¿Podés comprometerte a visitas veterinarias mensuales? ¿Tenés acceso a un veterinario de confianza?',
          type: 'text',
          criticality: 'CRITICA',
          required: true,
          placeholder: 'Ej: Sí, tengo veterinario en San Salvador y puedo ir mensualmente',
        },
        {
          id: 'mc-q2',
          text: '¿Cuánto presupuesto mensual podés destinar a medicamentos y cuidados crónicos (aparte de alimentación)?',
          type: 'select',
          options: ['Menos de $30', '$30–$60', '$60–$120', 'Más de $120'],
          criticality: 'CRITICA',
          required: true,
        },
        {
          id: 'mc-q3',
          text: '¿Alguna vez administraste medicación oral o inyectable a una mascota? Describí cuánto tiempo lo hiciste y con qué frecuencia.',
          type: 'text',
          criticality: 'IMPORTANTE',
          required: false,
          placeholder: 'Ej: Le di pastillas diarias a mi gato durante 6 meses por una infección crónica de riñón',
        },
        {
          id: 'mc-q4',
          text: '¿Cuántas horas por semana podés dedicar a cuidados especiales (medicación, dieta terapéutica, chequeos)?',
          type: 'number',
          criticality: 'IMPORTANTE',
          required: true,
          placeholder: 'Ej: 5',
        },
        {
          id: 'mc-q5',
          text: '¿Contás con apoyo familiar o de convivientes para los cuidados si estás fuera o enfermás?',
          type: 'text',
          criticality: 'OPCIONAL',
          required: false,
          placeholder: 'Describí brevemente quién puede apoyar',
        },
      ],
    },
    {
      adoptionCategory: 'REACTIVO' as const,
      questions: [
        {
          id: 'rx-q1',
          text: '¿Alguna vez viviste con un perro que reaccionó fuerte a otros perros? Describí cómo lo manejaste.',
          type: 'text',
          criticality: 'CRITICA',
          required: true,
          placeholder: 'Ej: Usábamos correa corta y cruzábamos a la acera contraria; fue manejable después de entrenamiento',
        },
        {
          id: 'rx-q2',
          text: '¿Cuántas personas adultas y niños menores de 12 años viven en el hogar?',
          type: 'text',
          criticality: 'CRITICA',
          required: true,
          placeholder: 'Ej: 2 adultos, 0 niños',
        },
        {
          id: 'rx-q3',
          text: '¿Cuántas sesiones de entrenamiento formal (con instructor o con libro/video estructurado) hiciste con un perro en los últimos 2 años?',
          type: 'number',
          criticality: 'IMPORTANTE',
          required: false,
          placeholder: 'Ej: 8 sesiones con instructor en 2024',
        },
        {
          id: 'rx-q4',
          text: '¿Tu vivienda tiene vallas o cercas que contengan al perro en el exterior sin supervisión?',
          type: 'boolean',
          criticality: 'IMPORTANTE',
          required: true,
        },
        {
          id: 'rx-q5',
          text: '¿Qué detonantes o situaciones sabés que pueden causar reactividad en perros (ruidos, visitas, otros animales)? ¿Cómo planificás manejar esas situaciones?',
          type: 'text',
          criticality: 'OPCIONAL',
          required: false,
          placeholder: 'Describí tu plan de manejo',
        },
      ],
    },
    {
      adoptionCategory: 'ESPECIAL' as const,
      questions: [
        {
          id: 'esp-q1',
          text: '¿Cuántas horas a la semana podés dedicar a entrenamiento o cuidado especializado (fisioterapia, estimulación sensorial, adaptaciones del entorno)?',
          type: 'number',
          criticality: 'CRITICA',
          required: true,
          placeholder: 'Ej: 7',
        },
        {
          id: 'esp-q2',
          text: '¿Tu vivienda tiene o podés adaptar: pisos antideslizantes, acceso sin gradas, rampas o espacios seguros para un animal con movilidad, visión o audición limitada?',
          type: 'text',
          criticality: 'CRITICA',
          required: true,
          placeholder: 'Describí las adaptaciones actuales o que podés hacer',
        },
        {
          id: 'esp-q3',
          text: '¿Cuánto presupuesto mensual estimás poder destinar a cuidados especiales (equipo ortopédico, fisioterapia, suplementos, veterinario especialista)?',
          type: 'select',
          options: ['Menos de $50', '$50–$100', '$100–$200', 'Más de $200'],
          criticality: 'IMPORTANTE',
          required: true,
        },
        {
          id: 'esp-q4',
          text: '¿Alguna vez cuidaste a una mascota o persona con discapacidad motriz, visual o auditiva? Describí cuánto tiempo y qué implicó.',
          type: 'text',
          criticality: 'IMPORTANTE',
          required: false,
          placeholder: 'Ej: Cuidé a mi perro después de una cirugía de rodilla durante 3 meses, rehabilitación diaria',
        },
        {
          id: 'esp-q5',
          text: '¿Tenés vehículo propio o acceso confiable a transporte para llevar al animal al veterinario en caso de emergencia?',
          type: 'boolean',
          criticality: 'OPCIONAL',
          required: false,
        },
      ],
    },
  ];

  for (const template of extrasTemplates) {
    await prisma.extrasTemplate.upsert({
      where: {
        organizationId_adoptionCategory: {
          organizationId: dametupatasv.id,
          adoptionCategory: template.adoptionCategory,
        },
      },
      update: {},
      create: {
        organizationId: dametupatasv.id,
        adoptionCategory: template.adoptionCategory,
        questions: template.questions,
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log('[seed] Phase 16: 5 ExtrasTemplate rows seeded for DameTuPataSV.');

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
