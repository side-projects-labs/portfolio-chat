// @vitest-environment node
import { execFile, spawnSync } from "node:child_process";
import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";

type Handler = (req: IncomingMessage) => { status: number; body?: string };

// 호스트의 환경변수가 스크립트에 새지 않도록 PATH만 남기고 시작합니다.
const cleanEnv = (extra: Record<string, string> = {}) => ({ PATH: process.env.PATH ?? "", ...extra }) as unknown as NodeJS.ProcessEnv;

let server: Server | undefined;
const seenHeaders: IncomingMessage["headers"][] = [];

async function start(handler: Handler): Promise<string> {
  server = createServer((req, res) => {
    seenHeaders.push(req.headers);
    const { status, body = "" } = handler(req);
    res.writeHead(status, { "content-type": "application/json" });
    res.end(body);
  });
  await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
  return `http://127.0.0.1:${(server!.address() as AddressInfo).port}`;
}

// 서버가 같은 프로세스에 있으므로 이벤트 루프를 막지 않게 비동기로 스크립트를 실행합니다.
function run(url: string, env: Record<string, string> = {}) {
  return new Promise<{ code: number; out: string }>((resolve) => {
    execFile(
      "bash",
      ["scripts/smoke.sh", url],
      { env: cleanEnv(env), timeout: 30_000 },
      (error, stdout, stderr) => {
        const code = error ? error.code : 0; // 실패하면 종료 코드(숫자) 또는 오류 이름(문자열)
        resolve({ code: typeof code === "number" ? code : 1, out: `${stdout}${stderr}` });
      },
    );
  });
}

afterEach(async () => {
  seenHeaders.length = 0;
  await new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve()));
  server = undefined;
});

const healthy: Handler = (req) => (req.url === "/api/chat" ? { status: 400, body: '{"error":"empty"}' } : { status: 200, body: "<html></html>" });

describe("scripts/smoke.sh", () => {
  it("첫 화면이 200이고 API가 잘못된 입력에 400 empty를 주면 성공(0)이다", async () => {
    const url = await start(healthy);
    expect((await run(url)).code).toBe(0);
  });

  it("첫 화면이 200이 아니면 실패(1)이다", async () => {
    const url = await start((req) => (req.url === "/api/chat" ? { status: 400, body: '{"error":"empty"}' } : { status: 500 }));
    expect((await run(url)).code).toBe(1);
  });

  it("API가 400이 아니거나 error가 empty가 아니면 실패(1)이다", async () => {
    const a = await start((req) => (req.url === "/api/chat" ? { status: 200, body: "ok" } : { status: 200 }));
    expect((await run(a)).code).toBe(1);
    await new Promise<void>((resolve) => server!.close(() => resolve()));
    const b = await start((req) => (req.url === "/api/chat" ? { status: 400, body: '{"error":"invalid"}' } : { status: 200 }));
    expect((await run(b)).code).toBe(1);
  });

  it("접속할 수 없으면 실패(1)이다", async () => {
    expect((await run("http://127.0.0.1:1")).code).toBe(1);
  });

  it("보호된 배포(401)에 우회 시크릿이 없으면 확인하지 못했다는 뜻으로 3을 준다", async () => {
    const url = await start(() => ({ status: 401, body: "Protected" }));
    expect((await run(url)).code).toBe(3);
  });

  it("우회 시크릿이 있으면 헤더로 보내고, 그래도 401이면 실패(1)이다", async () => {
    const ok = await start(healthy);
    expect((await run(ok, { VERCEL_AUTOMATION_BYPASS_SECRET: "fake-bypass-value" })).code).toBe(0);
    expect(seenHeaders.some((h) => h["x-vercel-protection-bypass"] === "fake-bypass-value")).toBe(true);
    await new Promise<void>((resolve) => server!.close(() => resolve()));
    const blocked = await start(() => ({ status: 401 }));
    expect((await run(blocked, { VERCEL_AUTOMATION_BYPASS_SECRET: "wrong" })).code).toBe(1);
  });

  it("출력에 우회 시크릿 값을 남기지 않는다", async () => {
    const url = await start(() => ({ status: 500 }));
    const { out } = await run(url, { VERCEL_AUTOMATION_BYPASS_SECRET: "fake-bypass-value" });
    expect(out).not.toContain("fake-bypass-value");
  });

  it("URL 인자가 없으면 사용법을 보여 주고 실패(2)이다", async () => {
    const r = spawnSync("bash", ["scripts/smoke.sh"], { env: cleanEnv(), encoding: "utf8" });
    expect(r.status).toBe(2);
  });
});
