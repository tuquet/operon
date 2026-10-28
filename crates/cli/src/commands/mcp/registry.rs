use super::protocol::JsonRpcResponse;
use serde_json::{Value, json};

pub fn handle_initialize(id: Option<Value>) -> JsonRpcResponse {
    JsonRpcResponse::ok(
        id,
        json!({
            "protocolVersion": "2024-11-05",
            "capabilities": {
                "tools": {
                    "listChanged": false
                }
            },
            "serverInfo": {
                "name": "mcp",
                "version": env!("CARGO_PKG_VERSION")
            }
        }),
    )
}

pub fn handle_ping(id: Option<Value>) -> JsonRpcResponse {
    JsonRpcResponse::ok(id, json!({}))
}

pub fn handle_resources_list(id: Option<Value>) -> JsonRpcResponse {
    JsonRpcResponse::ok(id, json!({ "resources": [] }))
}

pub fn handle_prompts_list(id: Option<Value>) -> JsonRpcResponse {
    JsonRpcResponse::ok(id, json!({ "prompts": [] }))
}

pub fn handle_tools_list(id: Option<Value>) -> JsonRpcResponse {
    let tools = json!([
        {
            "name": "status",
            "description": "Inspect unified status across subsystems: Cloud enrollment identity, local Runner daemon health, and isolated Chromium runtime.",
            "inputSchema": {
                "type": "object",
                "properties": {},
                "required": []
            }
        },
        {
            "name": "workflow_list",
            "description": "List all browser automation workflows stored in the local SQLite database. Supports optional search filter.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "search": {
                        "type": "string",
                        "description": "Optional keyword to filter workflows by ID, name, or description."
                    }
                }
            }
        },
        {
            "name": "workflow_inspect",
            "description": "Inspect the structure of a workflow (blocks sequence, triggers, variables, parameters, node connections) by file path or stored workflow ID.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "workflow": {
                        "type": "string",
                        "description": "Stored workflow ID (e.g. 'hn-crawler') or path to .json workflow file."
                    }
                },
                "required": ["workflow"]
            }
        },
        {
            "name": "workflow_run",
            "description": "Execute a browser automation workflow (by file path or stored ID) in headless or visible browser with optional variables and timeout.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "workflow": {
                        "type": "string",
                        "description": "Workflow ID or path to workflow JSON file."
                    },
                    "headless": {
                        "type": "boolean",
                        "description": "Run in background headless mode. Default is true."
                    },
                    "browser": {
                        "type": "string",
                        "description": "Browser engine to launch (chrome, edge, brave). Default is chrome."
                    },
                    "variables": {
                        "type": "object",
                        "description": "Key-value map of runtime variables to inject into the workflow execution.",
                        "additionalProperties": { "type": "string" }
                    },
                    "timeout": {
                        "type": "integer",
                        "description": "Execution timeout in seconds. Default is 300."
                    }
                },
                "required": ["workflow"]
            }
        },
        {
            "name": "worker_probe",
            "description": "Probe local host hardware specs (CPU cores, memory), display capabilities, and worker automation driver capabilities.",
            "inputSchema": {
                "type": "object",
                "properties": {}
            }
        },
        {
            "name": "cloud_whoami",
            "description": "Get current Cloud workstation pairing identity, device ID, tenant, and endpoint configuration.",
            "inputSchema": {
                "type": "object",
                "properties": {}
            }
        },
        {
            "name": "browser_status",
            "description": "Check the status, version, executable path, and disk usage of the dedicated isolated Chromium runtime.",
            "inputSchema": {
                "type": "object",
                "properties": {}
            }
        },
        {
            "name": "tree",
            "description": "Scan directory structure recursively up to a specified depth, ignoring build artifacts (.git, node_modules, target, dist, build, cache) and returning a clean visual tree.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "Root directory path to scan. Defaults to current directory ('.')."
                    },
                    "depth": {
                        "type": "integer",
                        "description": "Maximum directory traversal depth (default: 3, max: 10)."
                    },
                    "show_hidden": {
                        "type": "boolean",
                        "description": "Whether to include hidden files (starting with dot). Default is false."
                    }
                }
            }
        },
    ]);

    JsonRpcResponse::ok(id, json!({ "tools": tools }))
}