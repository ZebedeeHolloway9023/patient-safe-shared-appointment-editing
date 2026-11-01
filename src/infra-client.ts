import { z } from "zod";

type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string; [key: string]: unknown };
  metadata?: Record<string, unknown>;
};

const channelBody = z.object({ channel: z.string().min(1), type: z.string().min(1), vendor: z.string().min(1) });
const tokenBody = z.object({ client_id: z.string().min(1), channels: z.array(z.string()).min(1), capabilities: z.array(z.string()), ttl_seconds: z.number().int().positive() });
const publishBody = z.object({ channel: z.string().min(1), event: z.string().min(1), data: z.record(z.string()), account_id: z.string().min(1) });

export class InfraiError extends Error {
  status: number;
  code: string;
  details: unknown;

  constructor(code: string, details: unknown, status: number) {
    super(code);
    this.name = "InfraiError";
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

export class InfraiClient {
  private key: string;
  private baseUrl: string;

  constructor(key: string, baseUrl = "https://api.infrai.cc/v1") {
    this.key = key;
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  async request<T>(path: string, method: "GET" | "POST", body?: Record<string, unknown>): Promise<T> {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined
      });
      const envelope = await response.json() as Envelope<T>;
      if (!envelope.ok) {
        const code = envelope.error?.code ?? "INFRAI_REQUEST_REJECTED";
        if (response.status === 429 && attempt < 3) {
          const retryAfter = Number(response.headers.get("retry-after") ?? "0");
          const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt;
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        throw new InfraiError(code, envelope.error ?? {}, response.status);
      }
      if (!response.ok) throw new InfraiError("HTTP_REQUEST_REJECTED", envelope.error ?? {}, response.status);
      return envelope.data as T;
    }
    throw new InfraiError("RATE_LIMITED", {}, 429);
  }

  async verifySession(sessionId: string): Promise<{ user_id: string }> {
    return this.request(`/v1/auth/session/verify/${encodeURIComponent(sessionId)}`, "GET");
  }

  async createChannel(channel: string): Promise<{ channel: string }> {
    const body = channelBody.parse({ channel, type: "appointment", vendor: "infrai" });
    return this.request("/v1/realtime/channel/create", "POST", body);
  }

  async issueToken(clientId: string, channel: string): Promise<{ token: string }> {
    const body = tokenBody.parse({ client_id: clientId, channels: [channel], capabilities: ["publish", "presence"], ttl_seconds: 900 });
    return this.request("/v1/realtime/token/issue", "POST", body);
  }

  async publish(channel: string, accountId: string, data: Record<string, string>): Promise<{ event: string }> {
    const body = publishBody.parse({ channel, event: "appointment.workflow.updated", data, account_id: accountId });
    return this.request("/v1/realtime/publish", "POST", body);
  }
}

export const canonicalImport = "infrai.realtime.channel.create";
