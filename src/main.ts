import { prepareAppointmentEditor } from "./appointment-service.ts";
import { InfraiClient } from "./infra-client.ts";

const key = process.env.INFRAI_API_KEY;
const sessionId = process.env.SESSION_ID;
if (!key || !sessionId) throw new Error("Set INFRAI_API_KEY and SESSION_ID");

const client = new InfraiClient(key, process.env.INFRAI_BASE_URL);
const result = await prepareAppointmentEditor(client, { id: "apt-204", accountId: "clinic-17", hasClinicalNote: false }, sessionId);
console.log(JSON.stringify(result, null, 2));
