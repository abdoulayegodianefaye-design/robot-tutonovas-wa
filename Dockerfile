# 1. Utiliser une image Node.js officielle
FROM node:18-slim

# 2. Installer les dépendances pour faire tourner Chrome sur Linux
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-ipafont-gothic \
    fonts-wqy-zenhei \
    fonts-thai-tlwg \
    fonts-kacst \
    fonts-freefont-ttf \
    libxss1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# 3. Définir le chemin de Chromium pour le robot
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# 4. Créer le dossier de l'application
WORKDIR /usr/src/app

# 5. Copier les fichiers de dépendances
COPY package*.json ./
RUN npm install

# 6. Copier le reste du code
COPY . .

# 7. Lancer le robot
CMD [ "node", "index.js" ]