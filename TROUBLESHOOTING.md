# Troubleshooting MCP Issues in Kilo Code

## 1. node MCP Server: `invalid_union` Error

**Symptoms:**
- Error message: `Zod validation error ... "code": "invalid_union" ... "expected": "string", "received": "undefined"` for `id` or `method`.
- Occurs when the server sends a JSON-RPC message without an `id` field.

**Cause:**
The `mcp-server-node` package (v1.0.1) had a bug where it would omit the `id` field in JSON responses if the incoming request had no ID (e.g., notifications or parse errors). The MCP specification requires an `id` (even if `null`) for Response and Error objects.

**Resolution:**
The file `C:\Users\Sharda_online\AppData\Roaming\npm\node_modules\mcp-server-node\index.js` was patched to explicitly set `id: msgId ?? null`.

**Configuration:**
Ensure `mcp_settings.json` uses the patched version:
```json
"node": {
  "command": "node",
  "args": ["--no-warnings", "C:\\Users\\Sharda_online\\AppData\\Roaming\\npm\\node_modules\\mcp-server-node\\index.js"]
}
```

## 2. figma-dev-mode: `ECONNREFUSED` Error

**Symptoms:**
- Error message: `SSE error: TypeError: fetch failed: connect ECONNREFUSED 127.0.0.1:3845`

**Cause:**
The configuration specifies `type: "sse"` and `url: "http://127.0.0.1:3845/mcp"`, but no service is listening on port 3845. This usually means the Figma Desktop App is closed, or the required "Dev Mode" integration (or plugin) that provides this local server is not running.

**Resolution:**
1. **Open Figma Desktop App.**
2. **Open a Design File.**
3. **Enable Dev Mode** (Toggle the switch in the top-right corner of the Figma UI).
4. Ensure any necessary Figma plugins (like "Figma to Code" or specific MCP bridges) are active.

If the error persists, check if the port 3845 is correct for your specific Figma setup or plugin. Some plugins might use different ports or require manual start.

**Note:** If you do not have a specific Figma MCP server installed that runs on port 3845, remove the `figma-dev-mode` entry from `mcp_settings.json` to stop the error.