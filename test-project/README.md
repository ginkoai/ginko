# Test Project

This is a simple Express.js API server used for testing the contextMCP server functionality.

## Features

- User management API
- In-memory database service
- Structured logging
- TypeScript support

## API Endpoints

- `GET /users` - Get all users
- `POST /users` - Create a new user
- `GET /users/:id` - Get user by ID

## Architecture

- **Controllers**: Handle HTTP requests and responses
- **Services**: Business logic and data access
- **Utils**: Shared utilities like logging and database access

## Usage

```bash
npm install
npm run build
npm start
```