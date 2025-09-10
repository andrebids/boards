FROM node:22-alpine AS server-dependencies

RUN apk -U upgrade \
  && apk add build-base python3 ffmpeg --no-cache

WORKDIR /app

COPY server/package.json server/package-lock.json server/requirements.txt ./
COPY server/setup-python.js ./

# Configurar variáveis de ambiente para resolver problemas com undici
ENV NODE_OPTIONS="--no-experimental-fetch"
ENV UNDICI_NO_FILE_API=1

# Configurações SMTP para notificações globais
ENV GLOBAL_NOTIFICATIONS_ENABLED=true
ENV GLOBAL_SMTP_HOST=mail.bids.pt
ENV GLOBAL_SMTP_PORT=587
ENV GLOBAL_SMTP_SECURE=false
ENV GLOBAL_SMTP_USER="boards@bids.pt"
ENV GLOBAL_SMTP_PASSWORD="U3ldc6FeXqSUVE"
ENV GLOBAL_SMTP_FROM="Blachere Boards <boards@bids.pt>"

RUN npm install npm --global \
  && npm install --omit=dev --ignore-scripts

FROM node:22 AS client

WORKDIR /app

COPY client .

RUN npm install npm --global \
  && npm install --omit=dev

RUN DISABLE_ESLINT_PLUGIN=true npm run build

FROM node:22-alpine

RUN apk -U upgrade \
  && apk add bash python3 ffmpeg build-base --no-cache \
  && npm install npm --global

# Configurar variáveis de ambiente para resolver problemas com undici
ENV NODE_OPTIONS="--no-experimental-fetch"
ENV UNDICI_NO_FILE_API=1

# Configurações SMTP para notificações globais
ENV GLOBAL_NOTIFICATIONS_ENABLED=true
ENV GLOBAL_SMTP_HOST=mail.bids.pt
ENV GLOBAL_SMTP_PORT=587
ENV GLOBAL_SMTP_SECURE=false
ENV GLOBAL_SMTP_USER=boards@bids.pt
ENV GLOBAL_SMTP_PASSWORD=U3ldc6FeXqSUVE
ENV GLOBAL_SMTP_FROM="Blachere Boards <boards@bids.pt>"

USER node
WORKDIR /app

COPY --chown=node:node server ./
COPY --from=server-dependencies --chown=node:node /app/setup-python.js ./

RUN python3 -m venv .venv \
  && .venv/bin/pip install -r requirements.txt --no-cache-dir \
  && mv env.sample .env \
  && ls -la \
  && chmod +x start.sh \
  && ls -la start.sh \
  && npm config set update-notifier false

COPY --from=server-dependencies --chown=node:node /app/node_modules node_modules

# Recompilar módulos nativos para a arquitetura correta
RUN npm rebuild bcrypt lodepng --build-from-source --force

# Copy client build files to public
COPY --from=client --chown=node:node /app/dist public
COPY --from=client --chown=node:node /app/dist/index.html views

# Copy server public files (this will merge with client files)
COPY --chown=node:node server/public/* public/

VOLUME /app/public/favicons
VOLUME /app/public/user-avatars
VOLUME /app/public/background-images
VOLUME /app/private/attachments

EXPOSE 1337

HEALTHCHECK --interval=10s --timeout=2s --start-period=15s \
  CMD node ./healthcheck.js

CMD ["bash", "-c", "export NODE_ENV=production && node db/init.js && exec node app.js --prod"]
