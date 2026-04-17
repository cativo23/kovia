<!-- generated-by: gsd-doc-writer -->
# API Reference

Kovia is a NestJS REST API. No global path prefix is configured — all routes are mounted directly at the root.

The interactive Swagger UI is available at `http://localhost:3000/api/docs` when the backend is running.

## Authentication

The API uses a dual-token scheme:

- **Access token** — short-lived JWT sent as a `Bearer` token in the `Authorization` header.
- **Refresh token** — long-lived JWT stored in an `HttpOnly` cookie named `refresh_token` (7-day expiry). The cookie is `SameSite=Lax` in development and `SameSite=Strict; Secure` in production.

Include the access token on every protected request:

```http
Authorization: Bearer <accessToken>
```

Protected routes that require a specific role return `403 Forbidden` when the authenticated user's role does not match.

## Roles

| Role | Description |
|---|---|
| `ADOPTER` | Registered user seeking to adopt |
| `ORG_ADMIN` | Administrator of an adoption organization |
| `ORG_STAFF` | Staff member of an adoption organization |
| `PLATFORM_ADMIN` | Kovia platform super-administrator |

## Error Response Shape

All errors use the global `HttpExceptionFilter` and return:

```json
{
  "statusCode": 404,
  "message": "Animal with ID abc not found",
  "error": "Not Found"
}
```

Validation errors from the global `ValidationPipe` return `400 Bad Request` with an array of `message` strings.

---

## Endpoints Overview

| Method | Path | Auth | Role | Description |
|---|---|---|---|---|
| `GET` | `/` | Public | — | Health check / hello |
| **Auth** |||||
| `POST` | `/auth/register` | Public | — | Register new user |
| `POST` | `/auth/login` | Public | — | Login with email + password |
| `POST` | `/auth/verify-email` | Public | — | Verify email with magic-link token |
| `POST` | `/auth/forgot-password` | Public | — | Request password reset email |
| `POST` | `/auth/reset-password` | Public | — | Reset password with token |
| `POST` | `/auth/refresh` | Public | — | Rotate tokens using refresh cookie |
| `POST` | `/auth/resend-verification` | Public | — | Resend email verification |
| `POST` | `/auth/logout` | Public | — | Clear refresh cookie and revoke token |
| `GET` | `/auth/me` | Bearer | any | Get current user profile |
| `GET` | `/auth/google` | Public | — | Initiate Google OAuth flow |
| `GET` | `/auth/google/callback` | Public | — | Google OAuth callback |
| **Organizations** |||||
| `POST` | `/organizations/validate-invite` | Public | — | Validate an invite token |
| `POST` | `/organizations/claim-invite` | Bearer | any | Claim invite and become ORG_ADMIN |
| `POST` | `/organizations` | Bearer | ORG_ADMIN | Create organization profile |
| `PATCH` | `/organizations/:id` | Bearer | ORG_ADMIN | Update organization profile |
| `GET` | `/organizations/me` | Bearer | ORG_ADMIN | Get own organization |
| `GET` | `/organizations/:slug` | Public | — | Get organization public profile |
| **Animals** |||||
| `GET` | `/animals` | Public | — | Paginated public animal listing with filters |
| `GET` | `/animals/by-org/:slug` | Public | — | Animals by organization slug |
| `GET` | `/animals/org` | Bearer | ORG_ADMIN | List org's animals with filters |
| `GET` | `/animals/org/stats` | Bearer | ORG_ADMIN | Organization dashboard stats |
| `GET` | `/animals/org/:id` | Bearer | ORG_ADMIN | Get single animal for editing |
| `GET` | `/animals/:id` | Public | — | Public animal detail |
| `POST` | `/animals` | Bearer | ORG_ADMIN | Create a new animal |
| `PATCH` | `/animals/:id` | Bearer | ORG_ADMIN | Update animal profile |
| `PATCH` | `/animals/:id/status` | Bearer | ORG_ADMIN | Change animal status |
| `PATCH` | `/animals/:id/archive` | Bearer | ORG_ADMIN | Archive animal |
| `PATCH` | `/animals/:id/restore` | Bearer | ORG_ADMIN | Restore archived animal |
| `DELETE` | `/animals/:id` | Bearer | ORG_ADMIN | Hard delete animal and photos |
| `POST` | `/animals/:id/photos` | Bearer | ORG_ADMIN | Add photos to animal |
| `DELETE` | `/animals/:id/photos/:photoId` | Bearer | ORG_ADMIN | Remove a photo |
| `PATCH` | `/animals/:id/photos/cover` | Bearer | ORG_ADMIN | Set cover photo |
| `PATCH` | `/animals/:id/photos/reorder` | Bearer | ORG_ADMIN | Reorder photos |
| **Applications** |||||
| `POST` | `/applications` | Bearer | ADOPTER | Submit adoption application |
| `GET` | `/applications/check` | Bearer | any | Check if application exists for animal |
| `GET` | `/applications/my` | Bearer | any | List current user's applications |
| `GET` | `/applications/my/:id` | Bearer | any | Get single application (adopter view) |
| `PATCH` | `/applications/:id/retirar` | Bearer | ADOPTER | Withdraw an application |
| `GET` | `/applications/org` | Bearer | ORG_ADMIN | List org applications with filters |
| `GET` | `/applications/org/:id` | Bearer | ORG_ADMIN | Get single application (org view) |
| `PATCH` | `/applications/:id/status` | Bearer | ORG_ADMIN | Update application status |
| `POST` | `/applications/:id/rescore` | Bearer | ORG_ADMIN | Recalculate application score |
| **Application Notes** |||||
| `POST` | `/applications/:applicationId/notes` | Bearer | ORG_ADMIN, ORG_STAFF | Add internal note to application |
| `GET` | `/applications/:applicationId/notes` | Bearer | ORG_ADMIN, ORG_STAFF | List notes on application |
| **Adopters** |||||
| `GET` | `/adopters/:userId/history` | Bearer | ORG_ADMIN, ORG_STAFF | Adopter application history |
| `GET` | `/adopters/:userId/summary` | Bearer | ORG_ADMIN, ORG_STAFF | Adopter summary |
| **Species** |||||
| `GET` | `/species` | Public | — | List all species |
| `POST` | `/admin/species` | Bearer | PLATFORM_ADMIN | Create a species |
| `PATCH` | `/admin/species/:id` | Bearer | PLATFORM_ADMIN | Update a species |
| `DELETE` | `/admin/species/:id` | Bearer | PLATFORM_ADMIN | Delete a species |
| **Upload** |||||
| `POST` | `/upload/presigned-url` | Bearer | ORG_ADMIN, ADOPTER | Get S3 presigned upload URL |
| **Admin** |||||
| `POST` | `/admin/invites` | Bearer | PLATFORM_ADMIN | Create org invite |
| `GET` | `/admin/invites` | Bearer | PLATFORM_ADMIN | List all invites |
| `POST` | `/admin/invites/:id/resend` | Bearer | PLATFORM_ADMIN | Resend invite email |
| `DELETE` | `/admin/invites/:id` | Bearer | PLATFORM_ADMIN | Delete invite |
| `GET` | `/admin/orgs` | Bearer | PLATFORM_ADMIN | List all organizations |
| `PATCH` | `/admin/orgs/:id/status` | Bearer | PLATFORM_ADMIN | Update organization status |
| `GET` | `/admin/users` | Bearer | PLATFORM_ADMIN | List all users (paginated) |
| `PATCH` | `/admin/users/:id/status` | Bearer | PLATFORM_ADMIN | Activate or deactivate user |
| `DELETE` | `/admin/users/:id` | Bearer | PLATFORM_ADMIN | Permanently delete user |
| `GET` | `/admin/stats` | Bearer | PLATFORM_ADMIN | Platform statistics |
| `GET` | `/admin/audit` | Bearer | PLATFORM_ADMIN | Audit log (paginated) |

---

## Auth

### `POST /auth/register`

Register a new user account. A verification email is sent; the account cannot log in until the email is verified.

**Request body:**

```json
{
  "email": "usuario@ejemplo.com",
  "password": "MiPassword123!",
  "firstName": "Maria",
  "lastName": "Lopez"
}
```

Password rules: minimum 8 characters, maximum 128, must contain at least one uppercase letter, one lowercase letter, and one digit.

**Responses:** `201` Created · `409` Email already registered

---

### `POST /auth/login`

Authenticate with email and password. Returns an access token in the response body and sets the refresh token cookie.

**Request body:**

```json
{
  "email": "usuario@ejemplo.com",
  "password": "MiPassword123!"
}
```

**Response `200`:**

```json
{
  "accessToken": "<jwt>"
}
```

**Responses:** `200` OK · `401` Invalid credentials · `403` Email not verified or account deactivated

---

### `POST /auth/verify-email`

Verify the user's email address using the token from the magic-link email. Auto-logs the user in.

**Request body:**

```json
{
  "token": "<verification-token>"
}
```

**Response `200`:**

```json
{
  "accessToken": "<jwt>"
}
```

**Responses:** `200` OK · `401` Token invalid or expired

---

### `POST /auth/forgot-password`

Request a password reset email. Always returns `200` regardless of whether the email exists (prevents enumeration).

**Request body:**

```json
{
  "email": "usuario@ejemplo.com"
}
```

---

### `POST /auth/reset-password`

Reset the password using the token from the reset email. Auto-logs the user in on success.

**Request body:**

```json
{
  "token": "<reset-token>",
  "newPassword": "NuevaPassword123!"
}
```

**Response `200`:**

```json
{
  "accessToken": "<jwt>"
}
```

**Responses:** `200` OK · `401` Token invalid or expired

---

### `POST /auth/refresh`

Rotate the access token using the `refresh_token` HttpOnly cookie. Issues a new access token and rotates the refresh cookie.

**Responses:** `200` OK · `401` No or invalid refresh token

---

### `POST /auth/resend-verification`

Resend the email verification message.

**Request body:**

```json
{
  "email": "usuario@ejemplo.com"
}
```

---

### `POST /auth/logout`

Clears the `refresh_token` cookie and revokes the stored refresh token.

---

### `GET /auth/me`

Returns the profile of the currently authenticated user.

**Auth:** Bearer token required.

---

### `GET /auth/google` / `GET /auth/google/callback`

Initiates Google OAuth. The callback redirects to `{APP_URL}/auth/callback?token=<accessToken>` on success.

---

## Organizations

### `POST /organizations/validate-invite`

Validate an invite token before claiming it (public).

**Request body:**

```json
{
  "token": "<invite-token>"
}
```

---

### `POST /organizations/claim-invite`

Associate the authenticated user with the organization referenced by the invite token, elevating their role to `ORG_ADMIN`. Call `POST /auth/refresh` after this endpoint to receive updated tokens with the new role.

**Auth:** Bearer token required.

**Request body:**

```json
{
  "token": "<invite-token>"
}
```

---

### `POST /organizations`

Create the organization profile for the current `ORG_ADMIN`.

**Auth:** Bearer token · Role: `ORG_ADMIN`

**Request body:**

```json
{
  "name": "DameTuPataSV",
  "description": "Rescate y adopcion de mascotas en El Salvador",
  "logoUrl": "https://example.com/logo.png",
  "contactEmail": "contacto@dametupataSV.org",
  "phone": "+503 7890 1234",
  "instagram": "@dametupataSV",
  "facebook": "dametupataSV",
  "whatsapp": "+50378901234"
}
```

Required fields: `name`, `contactEmail`.

---

### `PATCH /organizations/:id`

Update an organization profile.

**Auth:** Bearer token · Role: `ORG_ADMIN`

**Request body:** Same shape as `POST /organizations` (all fields optional).

---

### `GET /organizations/me`

Get the organization associated with the authenticated `ORG_ADMIN`.

**Auth:** Bearer token · Role: `ORG_ADMIN`

---

### `GET /organizations/:slug`

Get a public organization profile by its URL slug.

---

## Animals

### `GET /animals`

Paginated public listing of available animals. All query parameters are optional.

**Query parameters:**

| Parameter | Type | Description |
|---|---|---|
| `page` | integer (≥1, default 1) | Page number |
| `limit` | integer (1–50, default 12) | Results per page |
| `species` | string | Filter by species name |
| `size` | `SMALL` \| `MEDIUM` \| `LARGE` \| `EXTRA_LARGE` | Filter by size |
| `ageMin` | integer (months) | Minimum age |
| `ageMax` | integer (months, ≤360) | Maximum age |
| `energyLevel` | `LOW` \| `MEDIUM` \| `HIGH` | Filter by energy level |
| `organization` | string | Filter by organization |
| `search` | string (≥2 chars) | Full-text search |
| `status` | `AVAILABLE` \| `IN_PROCESS` \| `ADOPTED` \| `ARCHIVED` | Filter by status |

---

### `GET /animals/by-org/:slug`

Public listing of animals belonging to a specific organization, accepts the same query parameters as `GET /animals`.

---

### `GET /animals/org`

Org-scoped animal listing for the dashboard. Accepts the same query parameters as `GET /animals`.

**Auth:** Bearer token · Role: `ORG_ADMIN`

---

### `GET /animals/org/stats`

Returns aggregate statistics for the authenticated organization's animals.

**Auth:** Bearer token · Role: `ORG_ADMIN`

---

### `GET /animals/org/:id`

Fetch full animal details for editing (includes non-public fields).

**Auth:** Bearer token · Role: `ORG_ADMIN`

---

### `GET /animals/:id`

Public animal detail page data.

---

### `POST /animals`

Create a new animal under the authenticated org admin's organization.

**Auth:** Bearer token · Role: `ORG_ADMIN`

**Request body:**

```json
{
  "name": "Luna",
  "speciesId": "<uuid>",
  "description": "Perrita cariñosa de 2 años.",
  "breed": "Mestiza",
  "gender": "FEMALE",
  "ageMonths": 24,
  "size": "MEDIUM",
  "energyLevel": "HIGH",
  "goodWithKids": true,
  "goodWithDogs": false,
  "goodWithCats": true,
  "goodWithOtherPets": true,
  "specialNeeds": null,
  "vaccinated": true,
  "sterilized": true,
  "trained": false
}
```

Required: `name` (2–100 chars), `speciesId` (UUID). All other fields are optional.

---

### `PATCH /animals/:id`

Update an existing animal's profile. All fields optional (same shape as `POST /animals`).

**Auth:** Bearer token · Role: `ORG_ADMIN`

---

### `PATCH /animals/:id/status`

Change the animal's adoption status.

**Auth:** Bearer token · Role: `ORG_ADMIN`

**Request body:**

```json
{
  "status": "IN_PROCESS"
}
```

Allowed values: `AVAILABLE`, `IN_PROCESS`, `ADOPTED`. Use `PATCH /animals/:id/archive` for the `ARCHIVED` status.

---

### `PATCH /animals/:id/archive`

Soft-archive an animal (status becomes `ARCHIVED`).

**Auth:** Bearer token · Role: `ORG_ADMIN`

---

### `PATCH /animals/:id/restore`

Restore an archived animal to `AVAILABLE`.

**Auth:** Bearer token · Role: `ORG_ADMIN`

---

### `DELETE /animals/:id`

Permanently delete an animal and all associated photos from storage.

**Auth:** Bearer token · Role: `ORG_ADMIN`

---

### `POST /animals/:id/photos`

Attach one or more already-uploaded photos to an animal. Upload photos first using `POST /upload/presigned-url`, then register the resulting keys here.

**Auth:** Bearer token · Role: `ORG_ADMIN`

**Request body:**

```json
{
  "photos": [
    { "url": "https://cdn.example.com/photo.jpg", "key": "animals/uuid/photo.jpg", "caption": "Jugando en el parque" }
  ]
}
```

---

### `DELETE /animals/:id/photos/:photoId`

Remove a specific photo from an animal.

**Auth:** Bearer token · Role: `ORG_ADMIN`

---

### `PATCH /animals/:id/photos/cover`

Set a photo as the cover image.

**Auth:** Bearer token · Role: `ORG_ADMIN`

**Request body:**

```json
{
  "photoId": "<uuid>"
}
```

---

### `PATCH /animals/:id/photos/reorder`

Reorder photos by supplying an ordered list of photo IDs.

**Auth:** Bearer token · Role: `ORG_ADMIN`

**Request body:**

```json
{
  "photoIds": ["<uuid1>", "<uuid2>", "<uuid3>"]
}
```

---

## Applications

### `POST /applications`

Submit an adoption application for an animal.

**Auth:** Bearer token · Role: `ADOPTER`

**Request body:**

```json
{
  "animalId": "<uuid>",
  "personalInfo": { "...": "form section data" },
  "housing": { "...": "form section data" },
  "lifestyle": { "...": "form section data" },
  "socialMedia": "@handle",
  "additionalContext": "Free text.",
  "photos": [
    { "url": "https://cdn.example.com/photo.jpg", "key": "applications/uuid/photo.jpg", "position": 0 }
  ]
}
```

Required: `animalId`, `personalInfo`, `housing`, `lifestyle`. Returns `404` if animal is not found, `400` if the animal is not available for adoption, `409` if an open application already exists for this animal.

---

### `GET /applications/check?animalId=<uuid>`

Check whether the authenticated user already has an open application for the given animal.

**Auth:** Bearer token

---

### `GET /applications/my`

List the authenticated adopter's applications. Accepts `ApplicationQueryDto` query parameters.

**Auth:** Bearer token

**Query parameters:** `page`, `limit`, `animalId`, `status`, `dateFrom`, `dateTo`

---

### `GET /applications/my/:id`

Fetch a single application belonging to the authenticated user.

**Auth:** Bearer token

---

### `PATCH /applications/:id/retirar`

Withdraw an open application. Only the submitting adopter may withdraw; applications with status `ADOPTADA` cannot be withdrawn.

**Auth:** Bearer token · Role: `ADOPTER`

---

### `GET /applications/org`

List all applications received by the authenticated admin's organization.

**Auth:** Bearer token · Role: `ORG_ADMIN`

**Query parameters:** `page`, `limit`, `animalId`, `status`, `dateFrom`, `dateTo`

Application status values: `ENVIADA`, `REVISANDO`, `APROBADA`, `RECHAZADA`, `SEGUIMIENTO`, `ADOPTADA`, `RETIRADA`

---

### `GET /applications/org/:id`

Fetch full application details (org view, includes scoring).

**Auth:** Bearer token · Role: `ORG_ADMIN`

---

### `PATCH /applications/:id/status`

Update the status of an application.

**Auth:** Bearer token · Role: `ORG_ADMIN`

**Request body:**

```json
{
  "status": "APROBADA"
}
```

Allowed values: `REVISANDO`, `APROBADA`, `RECHAZADA`, `SEGUIMIENTO`, `ADOPTADA`, `RETIRADA`

---

### `POST /applications/:id/rescore`

Recalculate the scoring algorithm result for an application.

**Auth:** Bearer token · Role: `ORG_ADMIN`

**Response:**

```json
{
  "score": 82,
  "scoreDetails": { "...": "scoring breakdown" }
}
```

---

## Application Notes

Internal-only notes visible to org staff. Not exposed to adopters.

### `POST /applications/:applicationId/notes`

Add a note to an application.

**Auth:** Bearer token · Role: `ORG_ADMIN` or `ORG_STAFF`

**Request body:**

```json
{
  "body": "Candidate confirmed home visit for Saturday."
}
```

Maximum 2000 characters.

---

### `GET /applications/:applicationId/notes`

List all notes on an application.

**Auth:** Bearer token · Role: `ORG_ADMIN` or `ORG_STAFF`

---

## Adopters

### `GET /adopters/:userId/history`

Full application history for an adopter.

**Auth:** Bearer token · Role: `ORG_ADMIN` or `ORG_STAFF`

---

### `GET /adopters/:userId/summary`

Summary statistics for an adopter (number of applications, outcomes).

**Auth:** Bearer token · Role: `ORG_ADMIN` or `ORG_STAFF`

---

## Species

### `GET /species`

Public list of all animal species configured in the platform.

---

### `POST /admin/species`

Create a new species.

**Auth:** Bearer token · Role: `PLATFORM_ADMIN`

**Request body:**

```json
{
  "name": "Conejo"
}
```

**Responses:** `201` Created · `409` Name already exists

---

### `PATCH /admin/species/:id`

Update a species name.

**Auth:** Bearer token · Role: `PLATFORM_ADMIN`

**Request body:**

```json
{
  "name": "Conejo Doméstico"
}
```

---

### `DELETE /admin/species/:id`

Delete a species. Returns `409` if animals are still associated with it.

**Auth:** Bearer token · Role: `PLATFORM_ADMIN`

---

## Upload

### `POST /upload/presigned-url`

Generate a presigned S3 URL for direct browser upload. After the client uploads the file directly to S3, the returned `key` and `publicUrl` should be registered via the relevant resource endpoint (e.g., `POST /animals/:id/photos`).

**Auth:** Bearer token · Role: `ORG_ADMIN` or `ADOPTER`

**Request body:**

```json
{
  "filename": "luna-park.jpg",
  "contentType": "image/jpeg",
  "folder": "animals"
}
```

`contentType` must be one of: `image/jpeg`, `image/png`, `image/webp`.
`filename` must be ≤ 255 characters.
`folder` is optional; defaults to `"animals"` if omitted; use `"applications"` for application photos.

**Response:**

```json
{
  "url": "<!-- VERIFY: presigned S3 URL format -->",
  "key": "animals/<uuid>/luna-park.jpg",
  "publicUrl": "<!-- VERIFY: CDN/S3 public URL base -->"
}
```

---

## Admin

All `/admin/*` routes require `PLATFORM_ADMIN` role and Bearer authentication.

### `POST /admin/invites`

Create an invite for a new organization admin. Sends an invitation email.

**Request body:**

```json
{
  "email": "org@example.com",
  "orgName": "DameTuPataSV"
}
```

---

### `GET /admin/invites`

List all existing invites with their status.

---

### `POST /admin/invites/:id/resend`

Resend the invitation email for an existing invite.

---

### `DELETE /admin/invites/:id`

Delete an invite.

---

### `GET /admin/orgs`

List all organizations on the platform.

---

### `PATCH /admin/orgs/:id/status`

Activate or deactivate an organization.

**Request body:**

```json
{
  "status": "DEACTIVATED"
}
```

Allowed values: `ACTIVE`, `DEACTIVATED`

---

### `GET /admin/users?page=1&limit=20`

List all users, paginated. Defaults: `page=1`, `limit=20`.

---

### `PATCH /admin/users/:id/status`

Activate or deactivate a user account. Pass `isActive: true` to reactivate, `isActive: false` to deactivate.

**Request body:**

```json
{
  "isActive": false
}
```

---

### `DELETE /admin/users/:id`

Permanently delete a user account.

---

### `GET /admin/stats`

Returns aggregate platform statistics (total users, organizations, animals, applications).

---

### `GET /admin/audit?page=1&limit=20`

Returns the paginated platform audit log. Defaults: `page=1`, `limit=20`.
