import type { PublicAnimalDto } from '../../public-animals/dto/public-animal.dto';

/**
 * Public landing-stats response shape (Phase 15-04, D-12 + D-15 + D-16).
 *
 * Returned by `GET /public/landing-stats` in a single round trip. The
 * backend evaluates the Day-1↔Year-2 threshold server-side per D-12 and
 * projects the adopter marquee to the privacy-safe `{ firstName, city,
 * animalName }` shape per D-15.
 *
 * Interfaces are response-shape only — no class-validator decorators
 * because the endpoint accepts no inbound body. Per D-16 the response
 * contract uses dedicated public DTOs that structurally lack any private
 * column (no `score`, `risks`, `flags`, etc).
 */
export interface PublicLandingStats {
  /** Animals with status=AVAILABLE AND dossierComplete=true (D-07 carry-over). */
  availableCount: number;
  /** Organizations with verifiedAt IS NOT NULL (D-14). */
  verifiedRefugiosCount: number;
  /** AdoptionApplication rows in status='ADOPTED' (Phase 17 D-02 English rename). */
  totalAdoptions: number;
  /** Day-1 vs Year-2 hero variant — computed server-side (D-12). */
  layoutVariant: 'day1' | 'year2';
  /** Most-recent AVAILABLE + dossierComplete animal, or null if none. */
  featuredAnimal: PublicAnimalDto | null;
  /** Up to 3 published adoption stories ordered by publishedAt DESC. */
  stories: AdoptionStoryPublic[];
  /** Up to 10 verified refugios ordered by verifiedAt DESC. */
  verifiedRefugios: VerifiedRefugio[];
  /** Up to 20 finalized adopters projected to firstName + city + animalName (D-15). */
  marqueeAdopters: MarqueeAdopter[];
}

export interface AdoptionStoryPublic {
  id: string;
  adopterFirstName: string;
  city: string;
  testimonial: string;
  photoUrl: string | null;
  /** ISO timestamp of when the story was published. */
  publishedAt: string;
}

export interface VerifiedRefugio {
  id: string;
  name: string;
  logoUrl: string | null;
  /** Reserved (not in current Organization schema — always null in v3.0). */
  foundedYear: number | null;
  /** ISO timestamp of when the platform admin verified the org. */
  verifiedAt: string;
}

/**
 * Privacy-safe adopter projection (D-15, T-15-04 mitigation).
 *
 * Exactly THREE keys — no last name, no exact dates, no application
 * identifier. The integration spec asserts
 * `Object.keys(adopter).sort() === ['animalName','city','firstName']`
 * at runtime so a future PR cannot widen the projection without tripping
 * the boundary spec.
 */
export interface MarqueeAdopter {
  firstName: string;
  city: string;
  animalName: string;
}
