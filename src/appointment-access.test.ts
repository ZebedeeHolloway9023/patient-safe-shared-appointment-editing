import assert from "node:assert/strict";
import { decideAppointmentAccess } from "./appointment-access.ts";

const permitted = decideAppointmentAccess({ sessionVerified: true, appointmentId: "apt-204", hasClinicalNote: false });
assert.deepEqual(permitted, { allowed: true, channel: "appointment:apt-204" });

const excluded = decideAppointmentAccess({ sessionVerified: true, appointmentId: "apt-204", hasClinicalNote: true });
assert.deepEqual(excluded, { allowed: false, reason: "clinical_note_excluded" });

console.log("appointment access decisions passed");
