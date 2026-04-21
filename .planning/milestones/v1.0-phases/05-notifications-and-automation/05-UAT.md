---
status: complete
phase: 05-notifications-and-automation
source: 05-01-SUMMARY.md, 05-02-SUMMARY.md
started: 2026-04-21T00:00:00Z
updated: 2026-04-21T22:30:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running backend/frontend processes. Clear ephemeral state. Start both services from scratch (docker compose up / npm run dev). Backend boots without errors, Prisma migrations apply, and the app loads in the browser without console errors.
result: pass

### 2. Notification Bell Visible for Adopters
expected: Log in as an ADOPTER user. The navbar should show a bell icon between the nav links and the user/auth section. No bell visible when logged out.
result: pass

### 3. Bell Click Fetches & Shows Dropdown
expected: Click the bell icon. A popover/dropdown appears listing your notifications (or an empty state "No tienes notificaciones" if none exist). The list shows notification title, body, and relative time (e.g. "hace 5 min").
result: pass

### 4. Unread Count Badge
expected: When you have unread notifications, the bell shows a numbered badge on top of it. When all are read (or there are none), the badge is hidden.
result: pass

### 5. Mark Single Notification as Read
expected: In the dropdown, unread notifications show a blue dot. Click one — the blue dot disappears and the unread count in the badge decreases by 1.
result: pass

### 6. Mark All Notifications as Read
expected: With at least one unread notification, click "Marcar todas como leídas" in the dropdown. All blue dots disappear and the badge is hidden.
result: pass

### 7. Full Notifications Page
expected: Click "Ver todas" in the dropdown (or navigate directly to /notificaciones). The full notification history page loads, showing up to 50 notifications. A "Marcar todas como leídas" button appears at the top.
result: pass

### 8. Bell Hidden for Staff Roles
expected: Log in as ORG_ADMIN or PLATFORM_ADMIN. The notification bell should NOT appear in the navbar — it is only for ADOPTER users.
result: pass

### 9. Notification Created After Application Event
expected: As an ADOPTER, submit a new adoption application (or have a staff member change its status). Then click the bell — a new notification should appear reflecting the event (e.g. "Solicitud enviada" or "Estado actualizado"), with the correct relative timestamp.
result: pass

## Summary

total: 9
passed: 9
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none]
