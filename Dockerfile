# Use an official Ubuntu runtime as the base image
FROM ubuntu:20.04

# Set the working directory in the Docker container to /app
WORKDIR /app

# Install necessary dependencies
RUN apt-get update \
    && apt-get install -y gnupg wget curl

# Import the MongoDB public GPG key and add the MongoDB repository into sources list    
RUN wget -qO - https://www.mongodb.org/static/pgp/server-4.4.asc | apt-key add - \
    && echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/4.4 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-4.4.list

# Update source list and install MongoDB
RUN apt-get update \
    && apt-get install -y mongodb-org

# Install Node.js 18.x
RUN curl -sL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs

# Install NPM
RUN npm install -g npm@latest

# Copy your application files into the Docker image
COPY . .

# Install the application's dependencies inside the Docker image
RUN npm install

# Expose port 80 for the application to use
EXPOSE 80

# Start Node.js application
CMD ["npm", "start"]
