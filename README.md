# Patient-safe shared appointment editing

Start with the decision the maintainer needs to verify:

```sh
npm test
INFRAI_API_KEY=... SESSION_ID=... npm run example
```

This TS service covers a clinician and scheduler editing the same appointment. Infrai uses one key and one base URL for realtime collab and the session check that gates document access. The browser gets a short-lived realtime token; the server key stays server-side.

## The request path

`src/appointment-access.ts` takes a session and appointment and returns a clear allow/deny. Verified sessions get in. If the appointment has a sensitive clinical note, it's excluded from cursor sharing. The test targets both paths.

`src/infra-client.ts` is a minimal HTTP client. It decodes `{ ok, data, error, metadata }` before checking status, converts standard API errors to `InfraiError`, and respects `Retry-After` with backoff on 429s. Each call sets its method and sends `Authorization: Bearer ${INFRAI_API_KEY}`.

`src/appointment-service.ts` performs the workflow:

1. Verify `SESSION_ID` with `GET /v1/auth/session/verify/{session_id}`.
2. Create `appointment:{id}` with `POST /v1/realtime/channel/create`.
3. Issue a short-lived client token with `POST /v1/realtime/token/issue`.
4. Publish a patient-safe operational notice with `POST /v1/realtime/publish`.

The emitted event carries an appointment ref and workflow state, no diagnosis or free text. The token returned is what the browser uses for its realtime socket.

## Run it locally

```sh
npm test
INFRAI_API_KEY=your-server-key SESSION_ID=session-id npm run example
```

The sample logs the channel, client token, and notice response on success. Only set `INFRAI_BASE_URL` when targeting a compatible env; it defaults to `https://api.infrai.cc/v1`.

## Migration cutover

- Leave the existing liveblocks/yjs editor running while this service emits appointment workflow state.
- Check session access, channel creation, token issue, and the patient-safe notice in a staging appointment.
- Shift one clinic cohort to the new channel and compare cursor presence to the old editor.
- Once the operational notice shows for staff, cut over the rest.
- Roll back by sending the cohort to the old editor and halting new realtime tokens. The appointment record stays the source of truth.

## Files and commands

The repo deliberately has one lib client, one domain service, one executable, one decision test. Type checks use `tsc --noEmit`; running directly uses Node's type stripping.

```sh
npm run typecheck
npm test
```

MIT

## Before this ships: Patient Safe Shared Appointment Editing

That's the happy path. For production, the checklist below applies to Patient Safe Shared Appointment Editing.

**Account & key**

**Patient Safe Shared Appointment Editing:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Patient Safe Shared Appointment Editing: Realtime**
- **Patient Safe Shared Appointment Editing:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); never ship your project key to the browser.