export type AppointmentAccessInput = {
  sessionVerified: boolean;
  appointmentId: string;
  hasClinicalNote: boolean;
};

export type AppointmentAccess = { allowed: true; channel: string } | { allowed: false; reason: string };

export function decideAppointmentAccess(input: AppointmentAccessInput): AppointmentAccess {
  if (!input.sessionVerified) return { allowed: false, reason: "session_not_verified" };
  if (input.hasClinicalNote) return { allowed: false, reason: "clinical_note_excluded" };
  return { allowed: true, channel: `appointment:${input.appointmentId}` };
}
