---
phase: 05
plan: 02
type: frontend
tags: notifications, ui, nuxt, i18n
key-files:
  - frontend/app/composables/useNotifications.ts
  - frontend/app/components/notifications/NotificationBell.vue
  - frontend/app/components/notifications/NotificationList.vue
  - frontend/app/pages/notificaciones/index.vue
  - frontend/app/layouts/default.vue
  - frontend/i18n/locales/es-SV.json
metrics:
  files_created: 4
  files_modified: 2
  lines_added: 306
  commits: 1
---

# Phase 05 Plan 02 — Summary

## What Was Done

### Composable
- **useNotifications.ts**: Provides notifications ref, unreadCount ref, loading/error refs
  - `fetchNotifications(limit?)` — GET /notifications, fetch-on-demand (no polling)
  - `fetchUnreadCount()` — fetches unread count only
  - `markAsRead(id)` — POST /notifications/:id/read, updates local state
  - `markAllAsRead()` — POST /notifications/read-all, clears local unread count
  - TypeScript interface for Notification type

### Components
- **NotificationBell.vue**: Bell icon with UBadge for unread count
  - Uses UPopover for dropdown (not UDropdownMenu — simpler for custom content)
  - Fetches notifications on bell click (not on page load)
  - Shows "Ver todas" link to /notificaciones
  - Shows "Marcar todas como leídas" button when unread > 0
  - Only renders for authenticated adopters (parent guards rendering)

- **NotificationList.vue**: Reusable list component
  - Loading state: USkeleton placeholders
  - Empty state: "No tienes notificaciones"
  - Error state: error message + retry button
  - Each item: title, body (optional), relative time, unread indicator (blue dot)
  - Emits `select` event on click

### Page
- **/notificaciones/index.vue**: Full notification history page
  - Fetches up to 50 notifications on mount
  - "Marcar todas como leídas" button at top
  - Uses NotificationList component

### Layout Integration
- **default.vue**: Added NotificationBell between nav links and auth section
  - Only renders when `isAuthenticated && userRole === 'ADOPTER'`
  - Added `userRole` computed from auth store

### i18n
- Added `notifications` section to es-SV.json with:
  - Bell tooltip, mark all read label
  - Empty/loading/error states
  - Retry and "view all" labels
  - Page title

## Deviations

- None. All tasks completed as planned.

## Commits

| Hash | Description |
|------|-------------|
| a922da8 | feat(05-02): frontend notification bell, list, and page |

## Self-Check: PASSED

- All new source files exist on disk
- No TypeScript errors in new files (verified via nuxt typecheck grep)
- Spanish i18n keys present and valid JSON
- NotificationBell only shows for adopters (v-if guard on userRole)
- NotificationList handles all 3 states (loading, empty, error)
- useNotifications has no polling loop (fetch-on-demand only)
- Relative time formatting works in Spanish ("hace 5 min", "hace 2h", "hace 3d")

## Verification

1. ✅ Bell icon renders for authenticated adopters
2. ✅ Bell icon hidden for ORG_ADMIN and PLATFORM_ADMIN
3. ✅ Badge shows unread count when > 0
4. ✅ Badge hidden when unreadCount === 0
5. ✅ Clicking bell fetches fresh notifications
6. ✅ Dropdown shows notification list with relative times
7. ✅ "Ver todas" links to /notificaciones
8. ✅ "Marcar todas como leídas" calls markAllAsRead
9. ✅ /notificaciones page fetches 50 notifications on mount
10. ✅ All text in Spanish (es-SV)
