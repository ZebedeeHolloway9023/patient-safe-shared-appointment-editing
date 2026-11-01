import { decideAppointmentAccess } from "./appointment-access.ts";
import { InfraiClient } from "./infra-client.ts";

export type AppointmentInput = { id: string; accountId: string; hasClinicalNote: boolean };

export async function prepareAppointmentEditor(client: InfraiClient, input: AppointmentInput, sessionId: string) {
  const session = await client.verifySession(sessionId);
  const access = decideAppointmentAccess({ sessionVerified: Boolean(session.user_id), appointmentId: input.id, hasClinicalNote: input.hasClinicalNote });
  if (!access.allowed) return access;
  await client.createChannel(access.channel);
  const token = await client.issueToken(session.user_id, access.channel);
  const notice = await client.publish(access.channel, input.accountId, { appointment_id: input.id, state: "ready_for_staff_review" });
  return { channel: access.channel, token: token.token, notice };
}
