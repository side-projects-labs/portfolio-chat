# 개발 서버용 이미지입니다. 프로덕션 배포용이 아닙니다.
# 키와 환경변수는 이미지에 넣지 않고 compose가 실행할 때 주입합니다.
FROM node:22-alpine

RUN corepack enable

# 비root(node) 사용자로 실행합니다. named volume이 같은 소유자로 만들어지도록
# 마운트 지점을 미리 만들어 소유권을 맞춥니다.
WORKDIR /app
RUN mkdir -p /app/node_modules /app/.next && chown -R node:node /app
USER node

# 의존성 레이어: lockfile이 바뀔 때만 다시 설치합니다.
COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# 소스는 compose에서 bind mount 하므로 이미지에는 최소한만 복사합니다.
COPY --chown=node:node . .

EXPOSE 3000
CMD ["pnpm", "exec", "next", "dev", "-H", "0.0.0.0", "-p", "3000"]
