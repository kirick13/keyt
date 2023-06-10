
FROM       oven/bun:0.6.7
WORKDIR    /app
COPY       src .
COPY       cli.sh /usr/local/bin/keyt
RUN        bun install --production
ENTRYPOINT ["bun", "run", "daemon.js"]
