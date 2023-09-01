# Use an official MongoDB Docker image as base
FROM mongo:latest

# Set MongoDB to run in the background
RUN echo "mongodb --fork --logpath /var/log/mongodb.log" >> /root/.bashrc

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
