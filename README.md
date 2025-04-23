# Hunter.io MCP Server

This is a Model Context Protocol (MCP) server that integrates with the Hunter.io API to provide email finding and verification capabilities.

## Features

- Find email addresses using domain and name information
- Verify email addresses for deliverability and validity

## Setup

### Local Setup

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file based on `.env.example` and add your Hunter.io API key:
   ```
   HUNTER_API_KEY=your_api_key_here
   ```
4. Build the server:
   ```
   npm run build
   ```
5. Start the server:
   ```
   npm start
   ```

### Docker Setup

1. Clone this repository
2. Create a `.env` file with your Hunter.io API key
3. Build and run using Docker Compose:
   ```
   docker-compose up -d
   ```

## MCP Configuration

To use this server with an MCP client, add the following configuration to your MCP settings file:

```json
{
  "mcpServers": {
    "hunter.io": {
      "command": "node",
      "args": ["path/to/hunter.io/dist/index.js"],
      "env": {
        "HUNTER_API_KEY": "your_api_key_here"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

## Available Tools

- `hunter_find_email`: Find an email address using domain and name information
- `hunter_verify_email`: Verify if an email address is valid and deliverable

## License

ISC
