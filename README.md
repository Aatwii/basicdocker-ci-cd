# Basicdocker: Node.js Express App with PostgreSQL using Docker Compose

This repository contains a simple Node.js Express application integrated with a PostgreSQL database, all orchestrated using Docker Compose. It serves as a practical example of setting up a multi-service application environment for development.

## Table of Contents

1.  [Project Overview](#project-overview)
2.  [Features](#features)
3.  [Prerequisites](#prerequisites)
4.  [Project Structure](#project-structure)
5.  [Setup Instructions (Step-by-Step)](#setup-instructions-step-by-step)
    * [Step 1: Clone the Repository](#step-1-clone-the-repository)
    * [Step 2: Update `package.json`](#step-2-update-packagejson)
    * [Step 3: Update `src/index.js`](#step-3-update-srcindexjs)
    * [Step 4: Create/Update `Dockerfile`](#step-4-createupdate-dockerfile)
    * [Step 5: Create/Update `docker-compose.yml`](#step-5-createupdate-docker-composeyml)
6.  [Running the Application](#running-the-application)
7.  [Testing the API Endpoints](#testing-the-api-endpoints)
    * [Accessing the Root Endpoint](#accessing-the-root-endpoint)
    * [Adding an Item (POST)](#adding-an-item-post)
    * [Listing All Items (GET)](#listing-all-items-get)
8.  [Stopping and Cleaning Up](#stopping-and-cleaning-up)
9.  [Acknowledgements](#acknowledgements)
10. [Troubleshooting Common Issues](#troubleshooting-common-issues)

---

## 1. Project Overview

This project demonstrates how to set up a Node.js Express application that connects to a PostgreSQL database, all containerized and managed by Docker Compose. This allows for a consistent development environment, isolating your application and database from your host system.

## 2. Features

* **Node.js Express API:** A simple RESTful API with endpoints for:
    * `GET /`: Basic status check, returns current database time.
    * `GET /items`: Retrieves all items from the database.
    * `POST /items`: Adds a new item to the database.
* **PostgreSQL Database:** A robust relational database for data storage.
* **Docker Compose:** Orchestrates the multi-container application, managing networking, environment variables, and data persistence.
* **Babel & Nodemon:** Configured for development, allowing ES6+ syntax and automatic server restarts on code changes.
* **Persistent Data:** Database data is persisted using Docker volumes, so your data isn't lost when containers are stopped or recreated.

## 3. Prerequisites

Before you begin, ensure you have the following installed on your system:

* **Docker Desktop:** Includes Docker Engine and Docker Compose.
    * [Download Docker Desktop](https://www.docker.com/products/docker-desktop/)
* **`curl`:** (Optional, but recommended for testing API endpoints from the command line). Usually pre-installed on Linux/macOS.

## 4. Project Structure

The project directory (`Basicdocker`) should have the following structure after setup:

Basicdocker/
├── package.json
├── package-lock.json
├── Dockerfile
├── docker-compose.yml
└── src/
└── index.js


## 5. Setup Instructions (Step-by-Step)

Follow these steps to set up the project on your local machine.

### Step 1: Clone the Repository

First, clone this repository to your local machine and navigate into its directory:

```bash
git clone [https://github.com/Aatwii/Basicdocker.git](https://github.com/Aatwii/Basicdocker.git)
cd Basicdocker
Step 2: Update package.json
Ensure your package.json includes pg, nodemon, @babel/core, and @babel/node as dependencies. Also, confirm the main entry and start script are correct.

Open package.json and ensure its content matches:

JSON

{
  "name": "basicdocker",
  "version": "1.0.0",
  "description": "A simple Node.js app with Express and PostgreSQL",
  "main": "src/index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1",
    "start": "nodemon --exec babel-node src/index.js"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "dependencies": {
    "express": "^4.19.2",
    "pg": "^8.12.0"
  },
  "devDependencies": {
    "@babel/core": "^7.24.7",
    "@babel/node": "^7.24.7",
    "nodemon": "^3.1.0"
  }
}
Step 3: Update src/index.js
This is your main Node.js application file. It sets up the Express server, connects to PostgreSQL, and defines the API endpoints.

Create a directory named src if it doesn't exist, and inside it, create/update index.js with the following content:

JavaScript

// src/index.js
const express = require('express');
const { Pool } = require('pg');
const app = express();
const port = 3000;

// Middleware to parse JSON request bodies
app.use(express.json());

// --- PostgreSQL Configuration ---
// These environment variables will be provided by Docker Compose
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  // For local development, if you face SSL issues and are NOT using a real SSL connection:
  // ssl: { rejectUnauthorized: false }
});

// Test database connection and create table if it doesn't exist
pool.connect()
  .then(client => {
    console.log('Connected to PostgreSQL database!');
    // Create a simple table if it doesn't exist
    return client.query(`
      CREATE TABLE IF NOT EXISTS test_items (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `).then(() => {
      client.release(); // Release the client back to the pool
      console.log('Table "test_items" checked/created.');
    }).catch(err => {
      client.release();
      console.error('Error creating table:', err.message);
    });
  })
  .catch(err => {
    console.error('Failed to connect to PostgreSQL:', err.message);
    process.exit(1); // Exit process if DB connection fails on startup
  });

// --- Routes ---

app.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as current_time');
    res.send(`Hello from the Node.js app! Current DB time: ${result.rows[0].current_time}`);
  } catch (err) {
    console.error('Error fetching time:', err.message);
    res.status(500).send('Error connecting to database');
  }
});

app.get('/items', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM test_items ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching items:', err.message);
    res.status(500).send('Error fetching items from database');
  }
});

app.post('/items', async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).send('Item name is required in the request body.');
  }
  try {
    const result = await pool.query('INSERT INTO test_items (name) VALUES ($1) RETURNING *', [name]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error adding item:', err.message);
    res.status(500).send('Error adding item to database');
  }
});

const HOST = '0.0.0.0'; // Ensure app listens on all network interfaces

app.listen(port, HOST, () => {
  console.log(`Node.js app listening at http://${HOST}:${port}`);
});
Step 4: Create/Update Dockerfile
This file instructs Docker on how to build your Node.js application image.

Create/update Dockerfile in the root of your project with the following content:

Dockerfile

# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package.json and package-lock.json first to install dependencies
COPY package.json .
COPY package-lock.json .

# Install ALL dependencies (including devDependencies like nodemon, babel)
RUN npm install

# Copy the application source code into the container
COPY src/ ./src/

EXPOSE 3000

# Command to run the application when the container starts
# This executes your npm start script which uses nodemon/babel-node
CMD ["npm", "start"]
Step 5: Create/Update docker-compose.yml
This file defines and orchestrates the app (Node.js) and db (PostgreSQL) services.

Create/update docker-compose.yml in the root of your project with the following content:

YAML

# docker-compose.yml
version: '3.8' # Specifies the Docker Compose file format version

services:
  # Service for your Node.js application
  app:
    build:
      context: .       # Tells Docker to look for the Dockerfile in the current directory
      dockerfile: Dockerfile # Specifies the name of your Dockerfile
    ports:
      - "8080:3000"    # Maps port 8080 on your host machine to port 3000 inside the container.
                       # Your Node.js app listens on 3000. Access via http://localhost:8080
    environment:
      # Environment variables passed into the 'app' container for DB connection
      DB_USER: user
      DB_HOST: db             # 'db' refers to the service name of the PostgreSQL container
      DB_NAME: mydatabase
      DB_PASSWORD: password
      DB_PORT: 5432
      NODE_ENV: development

    volumes:
      # Mounts for development (live code changes) and ensuring correct node_modules
      - ./src:/app/src           # Mounts local 'src' to '/app/src' in container
      - ./package.json:/app/package.json
      - ./package-lock.json:/app/package-lock.json
      - /app/node_modules        # Prevents host node_modules from interfering

    depends_on:
      - db # Ensures 'db' service starts before 'app'
    restart: unless-stopped # Automatically restart unless stopped manually

  # Service for the PostgreSQL database
  db:
    image: postgres:16-alpine # Uses the official PostgreSQL Docker image (Alpine variant)
    environment:
      # Environment variables for PostgreSQL initial setup
      POSTGRES_DB: mydatabase
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password

    volumes:
      # Persists database data to a named Docker volume ('db_data')
      - db_data:/var/lib/postgresql/data

    ports:
      # Optional: Exposes PostgreSQL port to host (for direct connection via psql/GUI)
      - "5432:5432"

    healthcheck:
      # Health check for the database service to ensure it's truly ready
      test: ["CMD-SHELL", "pg_isready -U $$POSTGRES_USER -d $$POSTGRES_DB"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped

# Define named volumes for data persistence
volumes:
  db_data: # Declares the 'db_data' named volume
6. Running the Application
Once all the files are correctly set up, navigate to the root of your Basicdocker directory in your terminal and run:

Bash

docker-compose down -v # Cleans up any previous containers/volumes (useful for a fresh start)
docker-compose up --build # Builds new images and starts all services
This command will:

docker-compose down -v: Stop and remove any existing containers, networks, and the db_data volume (deleting previous database data).

docker-compose up --build: Read the docker-compose.yml, build your Node.js application image (using Dockerfile), and then start both the Node.js app and PostgreSQL db services.

You should see logs from both db-1 and app-1 services. Look for messages like:

db-1 | database system is ready to accept connections

app-1 | Connected to PostgreSQL database!

app-1 | Table "test_items" checked/created.

app-1 | Node.js app listening at http://0.0.0.0:3000

The services will run in the foreground. Press Ctrl+C in this terminal to stop them.

7. Testing the API Endpoints
Once docker-compose up is running, open a separate terminal window to test your application's API.

Accessing the Root Endpoint
Open your web browser and navigate to:

http://localhost:8080/

You should see a message indicating the app is running and showing the current database time, e.g.: Hello from the Node.js app! Current DB time: [timestamp].

Adding an Item (POST)
Use curl to send a POST request to add a new item to your database:

Bash

curl -X POST -H "Content-Type: application/json" -d '{"name": "My First Docker Item"}' http://localhost:8080/items
Expected Output:

JSON

{"id":1,"name":"My First Docker Item","created_at":"2025-07-05T..."}
Feel free to run this command multiple times with different names to add more items.

Listing All Items (GET)
Use curl to send a GET request to retrieve all items from your database:

Bash

curl http://localhost:8080/items
Expected Output:
A JSON array containing all the items you've added:

JSON

[
  {"id":1,"name":"My First Docker Item","created_at":"2025-07-05T..."},
  {"id":2,"name":"Another Item from Docker","created_at":"2025-07-05T..."}
]
8. Stopping and Cleaning Up
To stop the running Docker services:

Go to the terminal where docker-compose up is running.

Press Ctrl+C.

To stop and remove containers and networks (keeping database data for next time):

Bash

docker-compose down
To stop and remove containers, networks, AND the db_data volume (deleting all database data):

Bash

docker-compose down -v
Use docker-compose down -v with caution, as it permanently deletes your database data.

9. Acknowledgements
This project was built upon the foundational structure and initial setup provided by the "Simple Node with Express Server" repository by Robin Wieruch. His work served as an excellent starting point for integrating Docker Compose and PostgreSQL.

10. Troubleshooting Common Issues
FROM requires either one or three arguments error in Dockerfile:

This is often due to invisible characters or incorrect line endings. Delete your Dockerfile and recreate it cleanly, then copy-paste the content exactly.

npm error code EJSONPARSE or Unexpected token ... in JSON:

This means your package.json file contains invalid JSON (e.g., comments like // or /* */). Remove all comments from your package.json and try again.

Cannot find module 'pg' or Cannot find module 'nodemon' etc.:

This indicates that npm install inside the container didn't properly install the dependencies.

Ensure all necessary dependencies are in package.json (including devDependencies for nodemon/babel-node).

Always run docker-compose up --build after changing package.json or Dockerfile.

Verify your Dockerfile uses RUN npm install (without --production if you need devDependencies).

Check that COPY package.json . and COPY package-lock.json . are before RUN npm install.

localhost:8080 gives an error or "site can't be reached":

HTTPS vs. HTTP: Ensure you are accessing http://localhost:8080/ (note the http://). Your app is not configured for HTTPS by default.

App Crash: Check the app-1 logs in your docker-compose up terminal for errors that might occur after initial startup.

Firewall: Temporarily check your host's firewall (e.g., sudo ufw status on Linux) to ensure port 8080 is not blocked.

App Listening: Confirm src/index.js explicitly listens on 0.0.0.0 (e.g., app.listen(port, '0.0.0.0', ...)).
