# Lenx MCP Server

MCP server bridging AI agents to the [Lenx.ai](https://lenx.ai) social media monitoring API.

## Installation

Run directly via npx (no local installation required):

```bash
npx @fastaai/lenx-mcp
```

Or install globally:

```bash
npm install -g @fastaai/lenx-mcp
lenx-mcp
```

## Configuration

The server requires two environment variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `LENX_API_KEY` | Yes | Your Lenx API key |
| `LENX_USER_ID` | Yes | Your Lenx user ID |
| `LENX_BASE_URL` | No | API base URL (default: `https://open.lenx.ai`) |

### Claude Code

Add to your Claude Code MCP configuration:

```json
{
  "mcpServers": {
    "lenx": {
      "command": "npx",
      "args": ["-y", "@fastaai/lenx-mcp"],
      "env": {
        "LENX_API_KEY": "your-api-key",
        "LENX_USER_ID": "your-user-id",
        "LENX_BASE_URL": "https://open.lenx.ai"
      }
    }
  }
}
```

### OpenCode

Add to your `~/.config/opencode/opencode.json`:

```json
{
  "mcpServers": {
    "lenx": {
      "command": "npx",
      "args": ["-y", "@fastaai/lenx-mcp"],
      "env": {
        "LENX_API_KEY": "your-api-key",
        "LENX_USER_ID": "your-user-id"
      }
    }
  }
}
```

## Available Tools

| Tool | Description |
|------|-------------|
| `lenx_list_tasks` | List monitoring tasks with pagination |
| `lenx_get_task` | Get task details by ID |
| `lenx_create_task` | Create a new live or adhoc task |
| `lenx_update_task` | Update task name and/or search query |
| `lenx_delete_task` | Delete a monitoring task |
| `lenx_get_task_data` | Get paginated post data for a task |
| `lenx_export_task_data` | Request CSV/XLSX export via email |

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build

# Watch mode
npm run watch
```

## License

MIT
