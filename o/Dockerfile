# Use the official Node.js image from Docker Hub
FROM node:18

# Create and set the working directory inside the container
WORKDIR .

# Copy package.json and package-lock.json before copying the rest
# This allows Docker to cache npm install if nothing has changed
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the port your app runs on (adjust if needed)
EXPOSE 3000

# Start the app (adjust if your main file is not index.js or script is different)
CMD ["npm", "start"]
