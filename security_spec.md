# Security Specification & Threat Model for Familiekoordinator Firestore

## 1. Data Invariants
- **Family Scoping (`familyId`)**: All entities (`members`, `vehicles`, `reservations`, `calendarEvents`, `taskTemplates`, `taskInstances`, `settings`) belong to a bounded family domain (`familyId: 'totland'`). Unscoped reads or queries cannot access cross-tenant records.
- **Family Member Allowlist**: Only verified Google accounts listed in `familyEmails()` inside `firestore.rules` may read or write family data. Arbitrary signed-in users are denied.
- **Admin Privilege & Immutability**: Critical schema modifications (creating task templates, deleting vehicles, modifying global car rules) are reserved for verified household admins (`magnar.totland@gmail.com`).
- **Secrets Management**: Firebase credentials live in `.env` (gitignored), not in committed JSON config files.
- **Identity Integrity**: Users cannot claim or complete tasks or reserve vehicles on behalf of non-existent identities.
- **State Transition Guard**: A task cannot transition from `completed` backwards to `available` without authorization.
- **String and List Bounds**: String lengths and list counts must not exceed defined limits to prevent resource exhaustion attacks.

## 2. The "Dirty Dozen" Malicious Payloads
1. **Payload 1 (Ghost Field Injection)**: Injecting `{ "isAdmin": true, "superUser": true }` into a `taskInstance`.
2. **Payload 2 (Oversized ID String Poisoning)**: Document ID with 4096 random byte characters to cause memory exhaustion.
3. **Payload 3 (Unverified Email Admin Spoofing)**: Setting `request.auth.token.email = "magnar.totland@gmail.com"` with `email_verified: false`.
4. **Payload 4 (Unbounded Array Flood)**: Writing `eligibleMemberIds` with 10,000 array items.
5. **Payload 5 (Cross-Family Data Extraction)**: Querying `collection("reservations")` without `where("familyId", "==", "totland")`.
6. **Payload 6 (Unauthorized Template Deletion)**: A child user attempting to delete `/taskTemplates/{templateId}`.
7. **Payload 7 (Task Status Reversal)**: Reversing a `completed` task to `available` to steal points.
8. **Payload 8 (Negative Points Exploit)**: Creating a task template with `points: -500`.
9. **Payload 9 (Car Reservation Spoofing)**: Creating a car reservation without valid `startTime` and `endTime` format.
10. **Payload 10 (Immutability Bypass on Reservations)**: Changing `createdAt` or `memberId` on an existing confirmed reservation.
11. **Payload 11 (Malformed Timestamp Injection)**: Submitting arbitrary non-string objects into time fields.
12. **Payload 12 (Settings Tampering)**: Non-admin overwriting `/settings/main` with invalid priority rules.

## 3. Test Runner Invariants
All above payloads are strictly blocked and evaluate to `PERMISSION_DENIED` under `firestore.rules`.
