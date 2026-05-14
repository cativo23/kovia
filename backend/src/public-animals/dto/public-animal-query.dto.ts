/**
 * Re-export the existing AnimalQueryDto so the `GET /public/animals`
 * route reuses the same pagination + filter shape (page, limit, species,
 * size, ageMin/Max, energyLevel, organization, search). Per D-19 we make
 * no query-side changes in Phase 15 — refugio-side filters stay the same.
 */
export { AnimalQueryDto as PublicAnimalQueryDto } from '../../animals/dto/animal-query.dto';
