# Use a lightweight Node.js base image
FROM node:22-alpine 

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock) first to leverage Docker cache
COPY package*.json ./

# Install dependencies (including dev dependencies needed for 'npm run dev')
RUN npm install

# Expose the port where your dev server runs ( Vite typically uses 5173)
EXPOSE 5173

# Define the command to start the development server
CMD ["npm", "run", "dev"]
