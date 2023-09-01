# Use an official MongoDB Docker image as base
FROM mongo:latest

# Set MongoDB to run in the background
RUN echo "mongod --fork --logpath /var/log/mongodb.log" >> /root/.bashrc

# Set the working directory in the Docker container to /app
WORKDIR /app

# Install curl and procps (provides free command),
RUN apt-get update && apt-get install -y curl procps

# Install MongoDB Database Tools
RUN curl -OL https://fastdl.mongodb.org/tools/db/mongodb-database-tools-ubuntu2004-arm64-100.8.0.deb && \
    dpkg -i mongodb-database-tools-ubuntu2004-arm64-100.8.0.deb && \
    apt-get install -f && rm mongodb-database-tools-ubuntu2004-arm64-100.8.0.deb

# Use an official Node.js runtime as the base image
FROM node:18

# Set the working directory in the Docker container to /app
WORKDIR /app

# Copy the application's source code to the working directory
COPY . .

# Install the application's dependencies inside the Docker image
RUN npm install

# Expose port 80 for the application to use
EXPOSE 80

# Start Node.js application
CMD ["npm", "start"]
