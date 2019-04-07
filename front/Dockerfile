FROM node
RUN npm install -g @vue/cli-service
RUN npm install -g @vue/cli-plugin-pwa
WORKDIR /app
COPY ./package.json .
RUN npm install