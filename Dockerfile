FROM jrottenberg/ffmpeg:4.1-alpine as ffmpeg
FROM --platform=linux/amd64 node:20-alpine

COPY --from=ffmpeg / /
WORKDIR /app

LABEL authors="andu"

COPY package.json package-lock.json ./

RUN apk add --no-cache python3 make g++

RUN npm install --omit=dev

EXPOSE 3000
EXPOSE 3100

COPY . .

VOLUME /config
VOLUME /recordings

CMD npm start