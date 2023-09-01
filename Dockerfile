# Use an official Node.js runtime as the base image
FROM node:18

# Set the working directory in the container to /app
WORKDIR /app

# Copy the application's source code to the working directory
COPY . .

# Install the application's dependencies inside the Docker image
RUN npm install

# Install MongoDB
RUN apt-get update && \
    apt-get install -y mongodb && \
    rm -rf /var/lib/apt/lists/*

# Expose port 80 for the application to use
EXPOSE 80

# Start MongoDB and the Node.js application
CMD [ "npm", "start" ]
