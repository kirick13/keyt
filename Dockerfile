
FROM       oven/bun:1.0.25
RUN        mkdir -p /app/state
WORKDIR    /app
COPY       src .
COPY       cli.sh /usr/local/bin/keyt
RUN        bun install --production
ENTRYPOINT ["bun", "run", "daemon.js"]
