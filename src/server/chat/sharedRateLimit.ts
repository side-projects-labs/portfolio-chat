import { clientKey } from "./limits";
import type { RateLimitResult } from "./rateLimit";

type Input = { request: Request; chars: number };
type Cmd = [string, string, ...(string | number)[]];

const REQUEST_WINDOW_MS = 60_000;
const CHARS_WINDOW_MS = 10 * 60_000;

// 클라이언트 주소는 개인정보일 수 있으므로 원문 대신 해시를 저장소 키에 씁니다.
async function hashed(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)]
    .slice(0, 16)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Upstash Redis REST(/pipeline)를 쓰는 공유 제한기입니다. 여러 서버리스 인스턴스가 같은 카운터를 봅니다.
// 저장소가 실패하면 던지지 않고 fallback(메모리 제한기)의 결과를 씁니다. 오류 내용에는 토큰·주소를 담지 않습니다.
export function createSharedRateLimit({
  url,
  token,
  requestsPerMinute = 20,
  charsPerTenMinutes = 40_000,
  fetch: fetchImpl = fetch,
  now = Date.now,
  timeoutMs = 1500,
  fallback,
  onError,
}: {
  url: string;
  token: string;
  requestsPerMinute?: number;
  charsPerTenMinutes?: number;
  fetch?: typeof fetch;
  now?: () => number;
  timeoutMs?: number;
  fallback: (input: Input) => RateLimitResult;
  onError?: (kind: "network" | "http" | "command") => void;
}) {
  async function pipeline(commands: Cmd[]): Promise<{ result?: number; error?: string }[]> {
    const res = await fetchImpl(`${url}/pipeline`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(commands),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) throw Object.assign(new Error("http"), { kind: "http" });
    return (await res.json()) as { result?: number; error?: string }[];
  }

  return async (input: Input): Promise<RateLimitResult> => {
    const at = now();
    const who = await hashed(clientKey(input.request));
    const reqBucket = Math.floor(at / REQUEST_WINDOW_MS);
    const charsBucket = Math.floor(at / CHARS_WINDOW_MS);
    const reqKey = `chat:rl:req:${reqBucket}:${who}`;
    const charsKey = `chat:rl:chars:${charsBucket}:${who}`;

    try {
      const out = await pipeline([
        ["INCRBY", reqKey, 1],
        ["PEXPIRE", reqKey, REQUEST_WINDOW_MS],
        ["INCRBY", charsKey, input.chars],
        ["PEXPIRE", charsKey, CHARS_WINDOW_MS],
      ]);
      if (out.length !== 4 || out.some((o) => o.error !== undefined)) {
        onError?.("command");
        return fallback(input);
      }

      const overRequests = (out[0].result ?? 0) > requestsPerMinute;
      const overChars = (out[2].result ?? 0) > charsPerTenMinutes;
      if (!overRequests && !overChars) return { ok: true };

      // 거부된 요청은 사용량에 남기지 않도록 되돌립니다. 되돌리기가 실패해도 거부 결과는 유지합니다.
      await pipeline([
        ["DECRBY", reqKey, 1],
        ["DECRBY", charsKey, input.chars],
      ]).catch(() => undefined);

      const waits: number[] = [];
      if (overRequests) waits.push((reqBucket + 1) * REQUEST_WINDOW_MS - at);
      if (overChars) waits.push((charsBucket + 1) * CHARS_WINDOW_MS - at);
      return { ok: false, retryAfterSec: Math.max(1, Math.ceil(Math.max(...waits) / 1000)) };
    } catch (error) {
      onError?.((error as { kind?: string }).kind === "http" ? "http" : "network");
      return fallback(input);
    }
  };
}
