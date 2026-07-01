FROM node:20-slim

WORKDIR /app

# Copy dependency mappings
COPY package*.json ./

# Install packages
RUN npm install

# Copy source code files
COPY . .

# Build production bundle
RUN npm run build

EXPOSE 3000

# Start production server
CMD ["npm", "start"]
