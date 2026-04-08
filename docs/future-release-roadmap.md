# ConstructPro Future Release Roadmap

This document captures planned product features for upcoming releases.

## Phase 1 (Free)

### Daily command center
- Good Morning Briefing (7 AM push): weather, due tasks, permits expiring this week, overdue items, tap to open full brief.
- Today's Work Plan screen: assigned tasks, pours/concreting schedule, weather window, expected materials, team on duty.
- Site Weather Widget (hyperlocal via site GPS): hourly rain probability, wind, UV, temperature, with suitability flags.

### Communication shortcuts
- One-tap Site Update Share: generate WhatsApp/email-ready summary from daily log.
- Emergency Contact Speed Dial: per-project critical contacts (client, consultant, foreman, safety, ambulance, fire, hospital).

### Smart capture
- Voice Note on Any Record: attach voice notes to tasks/RFIs/punch/log entries with background transcription.

### Smart nudges
- Silent Hours + Smart Alerts: defer non-critical notifications outside work hours.
- Upcoming Week Digest (Sunday 6 PM): milestones, permits, team schedule, budget review reminders.

### Offline / field-first
- Offline Mode Indicator + background sync toast.
- Auto Draft Save every 30 seconds + restore draft.

### Personalization
- Pinned Tools + automatic frequently-used tool prioritization.
- My Default Values (currency, region, rates, tax, company defaults).
- Dark Mode + Large Text Mode.

### Team / growth
- Streak & Consistency Badge for daily diary logging.

## Phase 2 (Free)

### Communication shortcuts
- Smart Report Templates (weekly/monthly) auto-filled from logs/tasks/budget.

### Smart capture
- Photo -> Issue in 2 taps (auto punch/RFI, GPS + timestamp).
- Scan & Save Any Document to searchable PDF in project folder.

### Smart nudges
- Concrete Pour Readiness Check (weather + checklists + sign-offs + order confirmation).
- Budget Burn Rate Alert (spend pace vs completion pace).

### Personalization
- Custom Checklist Builder for recurring workflows.

### Team / growth
- Invite by WhatsApp Link with project pre-loaded.

## Phase 2 (Premium)

### Communication shortcuts
- Team Broadcast Message with read receipts.

### Smart capture
- Before/After Progress Camera with ghost overlay alignment.

### Offline / field-first
- Download Project for Offline (drawings, checklists, contacts, tasks, references).

### Team / client
- Client View Mode (read-only live progress and KPIs).

## Recommended implementation order
1. Good Morning Briefing + data aggregation backend.
2. Today's Work Plan + Site Weather Widget.
3. One-tap Site Update Share.
4. Offline Mode Indicator + Auto Draft Save.
5. Silent Hours + Week Digest.
6. Pinned Tools + Defaults + Dark/Large Text.
7. Voice notes and Phase 2 feature set.

## Notes for delivery
- Keep every feature behind a feature flag until QA sign-off.
- Add analytics for adoption and time-saved signals on each launch.
- Define clear free vs premium gates in both UI and API responses.
- Prioritize field reliability (offline-first and graceful fallback) over cosmetic complexity.
