use crate::drivers::cdp::CdpSession;
use crate::protocol::schema::AutomaStepLog;
use async_trait::async_trait;
use regex::Regex;
use serde::{Deserialize, Serialize};
use serde_json::{json, Map, Value};
use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;
use tokio_util::sync::CancellationToken;
use tracing::{debug, warn};

#[async_trait]
pub trait BrowserBackend: Send + Sync {
    async fn navigate(&self, url: &str) -> Result<(), String>;
    async fn reload(&self) -> Result<(), String>;
    async fn go_back(&self) -> Result<(), String>;
    async fn go_forward(&self) -> Result<(), String>;
    async fn get_url(&self) -> Result<String, String>;
    async fn click_at_index(&self, selector: &str, index: usize) -> Result<(), String>;
    async fn hover_at_index(&self, selector: &str, index: usize) -> Result<(), String>;
    async fn type_text_at_index(
        &self,
        selector: &str,
        index: usize,
        text: &str,
        clear: bool,
        direct: bool,
    ) -> Result<(), String>;
    async fn press_key(&self, key: &str) -> Result<(), String>;
    async fn scroll(&self, dx: f64, dy: f64) -> Result<(), String>;
    async fn scroll_element(
        &self,
        selector: &str,
        index: usize,
        dx: f64,
        dy: f64,
        into_view: bool,
        smooth: bool,
    ) -> Result<bool, String>;
    async fn get_text(
        &self,
        selector: &str,
        index: Option<usize>,
        multiple: bool,
        include_tags: bool,
    ) -> Result<Value, String>;
    async fn get_attribute(
        &self,
        selector: &str,
        attr: &str,
        index: Option<usize>,
        multiple: bool,
    ) -> Result<Value, String>;
    async fn element_exists(&self, selector: &str, timeout: Duration) -> Result<bool, String>;
    async fn count_elements(&self, selector: &str) -> Result<usize, String>;
    async fn manipulate_form_element(
        &self,
        selector: &str,
        index: usize,
        form_type: &str,
        value: &str,
        clear: bool,
        selected: Option<bool>,
    ) -> Result<Value, String>;
    async fn capture_screenshot(&self, format: &str) -> Result<String, String>;
    async fn get_cookies(&self, urls: Option<Vec<String>>) -> Result<Value, String>;
    async fn set_cookie(&self, cookie: Value) -> Result<bool, String>;
    async fn delete_cookies(
        &self,
        name: &str,
        url: Option<&str>,
        domain: Option<&str>,
    ) -> Result<(), String>;
    async fn evaluate(&self, script: &str) -> Result<Value, String>;
    async fn solve_turnstile(&self, timeout: Duration) -> Result<bool, String>;
}

#[async_trait]
impl BrowserBackend for CdpSession {
    async fn navigate(&self, url: &str) -> Result<(), String> {
        self.navigate(url).await
    }
    async fn reload(&self) -> Result<(), String> {
        self.reload().await
    }
    async fn go_back(&self) -> Result<(), String> {
        self.go_back().await
    }
    async fn go_forward(&self) -> Result<(), String> {
        self.go_forward().await
    }
    async fn get_url(&self) -> Result<String, String> {
        self.get_url().await
    }
    async fn click_at_index(&self, selector: &str, index: usize) -> Result<(), String> {
        self.click_at_index(selector, index).await
    }
    async fn hover_at_index(&self, selector: &str, index: usize) -> Result<(), String> {
        self.hover_at_index(selector, index).await
    }
    async fn type_text_at_index(
        &self,
        selector: &str,
        index: usize,
        text: &str,
        clear: bool,
        direct: bool,
    ) -> Result<(), String> {
        self.type_text_at_index(selector, index, text, clear, direct)
            .await
    }
    async fn press_key(&self, key: &str) -> Result<(), String> {
        self.press_key(key).await
    }
    async fn scroll(&self, dx: f64, dy: f64) -> Result<(), String> {
        self.scroll(dx, dy).await
    }
    async fn scroll_element(
        &self,
        selector: &str,
        index: usize,
        dx: f64,
        dy: f64,
        into_view: bool,
        smooth: bool,
    ) -> Result<bool, String> {
        self.element_engine()
            .scroll_element(selector, index, dx, dy, into_view, smooth)
            .await
    }
    async fn get_text(
        &self,
        selector: &str,
        index: Option<usize>,
        multiple: bool,
        include_tags: bool,
    ) -> Result<Value, String> {
        self.element_engine()
            .get_text(selector, index, multiple, include_tags)
            .await
    }
    async fn get_attribute(
        &self,
        selector: &str,
        attr: &str,
        index: Option<usize>,
        multiple: bool,
    ) -> Result<Value, String> {
        self.element_engine()
            .get_attribute(selector, attr, index, multiple)
            .await
    }
    async fn element_exists(&self, selector: &str, timeout: Duration) -> Result<bool, String> {
        self.element_engine()
            .element_exists(selector, timeout)
            .await
    }
    async fn count_elements(&self, selector: &str) -> Result<usize, String> {
        self.element_engine().count_elements(selector).await
    }
    async fn manipulate_form_element(
        &self,
        selector: &str,
        index: usize,
        form_type: &str,
        value: &str,
        clear: bool,
        selected: Option<bool>,
    ) -> Result<Value, String> {
        self.element_engine()
            .manipulate_form_element(selector, index, form_type, value, clear, selected)
            .await
    }
    async fn capture_screenshot(&self, format: &str) -> Result<String, String> {
        self.capture_screenshot(format).await
    }
    async fn get_cookies(&self, urls: Option<Vec<String>>) -> Result<Value, String> {
        self.get_cookies(urls).await
    }
    async fn set_cookie(&self, cookie: Value) -> Result<bool, String> {
        self.set_cookie(cookie).await
    }
    async fn delete_cookies(
        &self,
        name: &str,
        url: Option<&str>,
        domain: Option<&str>,
    ) -> Result<(), String> {
        self.delete_cookies(name, url, domain).await
    }
    async fn evaluate(&self, script: &str) -> Result<Value, String> {
        self.evaluate(script).await
    }
    async fn solve_turnstile(&self, timeout: Duration) -> Result<bool, String> {
        self.solve_turnstile(timeout).await
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct WorkflowSettings {
    #[serde(default, alias = "debugMode")]
    pub debug_mode: bool,
    #[serde(default, alias = "blockDelay")]
    pub block_delay: u64,
    #[serde(default, alias = "onError")]
    pub on_error: Option<String>,
    /// Automa `settings.restartTimes` — how many times the workflow may be restarted when a
    /// block fails and the error policy is `restart-workflow` (Automa default: 3).
    #[serde(default, alias = "restartTimes")]
    pub restart_times: Option<u32>,
    /// Automa `settings.saveLog` (default true). When false only error steps are recorded —
    /// matching `WorkflowEngine.addLogHistory`, which drops non-error entries.
    #[serde(default, alias = "saveLog")]
    pub save_log: Option<bool>,
}

/// Blocks that exist only to organise the canvas — Automa itself gives them no runtime
/// behaviour, so skipping them is correct and must stay silent-ish.
pub const CANVAS_ONLY_BLOCKS: &[&str] = &["blocks-group", "note"];

/// Automa's nested `execute-workflow` guard — a sub-workflow chain deeper than this is refused.
const MAX_SUBFLOW_DEPTH: u32 = 10;

/// Every block label this engine actually implements.
///
/// This list is the canonical source used by publish/import-time validation: a canvas may
/// author a block we do not implement yet, and that MUST fail loudly instead of silently
/// reporting success (Automa-schema doctrine §0.3 — *declared ⇒ satisfied*).
pub fn supported_block_labels() -> &'static [&'static str] {
    &[
        "active-tab",
        "attribute-value",
        "block-package",
        "close-tab",
        "conditions",
        "contains",
        "cookie",
        "custom-data",
        "delay",
        "delete",
        "element-exists",
        "element-scroll",
        "empty",
        "eq",
        "event-click",
        "execute-workflow",
        "export-data",
        "forms",
        "forward-page",
        "get-all",
        "get-text",
        "go-back",
        "google-sheets",
        "gt",
        "gte",
        "hover-element",
        "increase-variable",
        "insert-data",
        "javascript-code",
        "loop-breakpoint",
        "loop-data",
        "loop-elements",
        "lt",
        "lte",
        "ne",
        "new-tab",
        "numbers",
        "press-key",
        "reload-tab",
        "repeat-task",
        "set",
        "take-screenshot",
        "trigger",
        "turnstile",
        "variable",
        "webhook",
        "while-loop",
    ]
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowNode {
    pub id: String,
    pub label: String,
    #[serde(default)]
    pub data: Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowEdge {
    #[serde(default)]
    pub id: Option<String>,
    pub source: String,
    pub target: String,
    #[serde(default, alias = "sourceHandle")]
    pub source_handle: Option<String>,
    #[serde(default, alias = "targetHandle")]
    pub target_handle: Option<String>,
}

#[derive(Debug, Clone)]
pub struct ConnectionTarget {
    pub target_node_id: String,
    pub target_handle: String,
}

#[derive(Debug, Clone, Default)]
pub struct WorkflowGraph {
    pub name: String,
    pub nodes: HashMap<String, WorkflowNode>,
    /// Maps "{source_id}-output-{output_index_or_name}" -> Vec<ConnectionTarget>
    pub connections: HashMap<String, Vec<ConnectionTarget>>,
    pub trigger_id: Option<String>,
    pub settings: WorkflowSettings,
    pub global_data: HashMap<String, Value>,
    /// Automa `isDisabled` — a disabled workflow must never execute.
    pub is_disabled: bool,
    /// Automa document `id` (used for the sub-workflow infinite-loop guard).
    pub id: Option<String>,
    /// Automa `table` / `dataColumns`: the workflow's data-table column names, in order.
    /// Used as the CSV header order by `export-data` and as the known column set.
    pub table_columns: Vec<String>,
    /// Declared column type per name (`string`/`integer`/`boolean`/`array`/`any`), used to
    /// coerce inserted values exactly like Automa's `convertData`.
    pub table_column_types: HashMap<String, String>,
    /// Automa packs referenced sub-workflows into the export as `includedWorkflows`
    /// (`{ workflowId: workflowDocument }`) — that is what `execute-workflow` resolves against.
    pub included_workflows: HashMap<String, Value>,
    /// Automa allows the trigger declaration at the document root (`trigger`), not only as a
    /// block. Kept so the declared parameter contract can be read from either place.
    pub trigger_decl: Option<Value>,
}

impl WorkflowGraph {
    /// Automa dialect: the trigger block declares the workflow's **input contract** as
    /// `trigger.data.parameters[] = { name, type, defaultValue, placeholder, description }`
    /// (authored on the canvas, validated by `workflow.schema.json` → `$defs.parameter`).
    ///
    /// Returns `(name, defaultValue)` pairs for every declared parameter that carries a
    /// default. Values supplied by the caller (job / schedule payload) always take
    /// precedence — see the seeding sites.
    pub fn trigger_parameters(&self) -> Vec<(String, Value)> {
        let node = self
            .trigger_id
            .as_ref()
            .and_then(|id| self.nodes.get(id))
            .or_else(|| self.nodes.values().find(|n| n.label == "trigger"));

        // The trigger block wins; otherwise fall back to the document-root `trigger`.
        let params = match node {
            Some(node) => node.data.get("parameters"),
            None => self
                .trigger_decl
                .as_ref()
                .and_then(|t| t.get("parameters"))
                .or_else(|| {
                    // `{ triggers: [ { parameters: [...] } ] }` form used by some triggers.
                    self.trigger_decl
                        .as_ref()
                        .and_then(|t| t.get("triggers"))
                        .and_then(|tr| tr.as_array())
                        .and_then(|arr| arr.first())
                        .and_then(|first| first.get("parameters"))
                }),
        };

        let Some(params) = params.and_then(|p| p.as_array()) else {
            return Vec::new();
        };

        let mut out = Vec::new();
        for p in params {
            let Some(name) = p.get("name").and_then(|n| n.as_str()) else {
                continue;
            };
            if let Some(default) = p.get("defaultValue") {
                if !default.is_null() {
                    out.push((name.to_string(), default.clone()));
                }
            }
        }
        out
    }

    pub fn from_json(val: &Value) -> Result<Self, String> {
        let name = val
            .get("name")
            .and_then(|v| v.as_str())
            .unwrap_or("Untitled Workflow")
            .to_string();

        let settings: WorkflowSettings = val
            .get("settings")
            .and_then(|v| serde_json::from_value(v.clone()).ok())
            .unwrap_or_default();

        let mut raw_nodes: Vec<WorkflowNode> = Vec::new();
        let mut raw_edges: Vec<WorkflowEdge> = Vec::new();

        if let Some(drawflow) = val.get("drawflow") {
            if let Some(nodes_val) = drawflow.get("nodes") {
                if let Ok(nodes) = serde_json::from_value::<Vec<WorkflowNode>>(nodes_val.clone()) {
                    raw_nodes = nodes;
                }
            }
            if let Some(edges_val) = drawflow.get("edges") {
                if let Ok(edges) = serde_json::from_value::<Vec<WorkflowEdge>>(edges_val.clone()) {
                    raw_edges = edges;
                }
            }
        }

        if raw_nodes.is_empty() {
            if let Some(nodes_val) = val.get("nodes") {
                if let Ok(nodes) = serde_json::from_value::<Vec<WorkflowNode>>(nodes_val.clone()) {
                    raw_nodes = nodes;
                }
            }
        }
        if raw_edges.is_empty() {
            if let Some(edges_val) = val.get("edges") {
                if let Ok(edges) = serde_json::from_value::<Vec<WorkflowEdge>>(edges_val.clone()) {
                    raw_edges = edges;
                }
            }
        }

        let mut nodes = HashMap::new();
        let mut trigger_id = None;

        for node in raw_nodes {
            if node.label == "trigger" && trigger_id.is_none() {
                trigger_id = Some(node.id.clone());
            }
            nodes.insert(node.id.clone(), node);
        }

        let mut connections: HashMap<String, Vec<ConnectionTarget>> = HashMap::new();
        for edge in raw_edges {
            let handle = edge
                .source_handle
                .clone()
                .unwrap_or_else(|| format!("{}-output-1", edge.source));
            connections
                .entry(handle)
                .or_default()
                .push(ConnectionTarget {
                    target_node_id: edge.target,
                    target_handle: edge.target_handle.unwrap_or_default(),
                });
        }

        let mut global_data = HashMap::new();
        // `globalData` is the canonical key; `global_data` is the snake_case variant also
        // declared by the schema — previously ignored, which silently dropped global data.
        for key in ["globalData", "global_data"] {
            if let Some(obj) = val.get(key).and_then(|gd| gd.as_object()) {
                for (k, v) in obj {
                    global_data.insert(k.clone(), v.clone());
                }
            }
        }

        let is_disabled = val
            .get("isDisabled")
            .and_then(|v| v.as_bool())
            .unwrap_or(false);

        let trigger_decl = val.get("trigger").filter(|t| !t.is_null()).cloned();

        // Automa: `workflow.table || workflow.dataColumns` (WorkflowEngine.js:259).
        let mut table_columns: Vec<String> = Vec::new();
        let mut table_column_types: HashMap<String, String> = HashMap::new();
        for key in ["table", "dataColumns"] {
            if let Some(cols) = val.get(key).and_then(|t| t.as_array()) {
                for col in cols {
                    let name = col
                        .get("name")
                        .and_then(|n| n.as_str())
                        .or_else(|| col.as_str());
                    if let Some(name) = name {
                        if !table_columns.iter().any(|c| c == name) {
                            table_columns.push(name.to_string());
                        }
                        if let Some(ctype) = col.get("type").and_then(|t| t.as_str()) {
                            table_column_types.insert(name.to_string(), ctype.to_string());
                        }
                    }
                }
            }
            if !table_columns.is_empty() {
                break;
            }
        }

        // `includedWorkflows` at the document root, or inside `content` (Automa export bundle).
        let mut included_workflows: HashMap<String, Value> = HashMap::new();
        for source in [
            val.get("includedWorkflows"),
            val.pointer("/content/includedWorkflows"),
        ] {
            if let Some(obj) = source.and_then(|i| i.as_object()) {
                for (k, v) in obj {
                    included_workflows.insert(k.clone(), v.clone());
                }
            }
        }

        Ok(Self {
            name,
            nodes,
            connections,
            trigger_id,
            settings,
            global_data,
            is_disabled,
            id: val.get("id").and_then(|v| v.as_str()).map(str::to_string),
            table_columns,
            table_column_types,
            included_workflows,
            trigger_decl,
        })
    }
}

#[derive(Debug, Clone)]
pub struct LoopState {
    pub index: usize,
    pub block_id: String,
    pub items: Vec<Value>,
    pub max_loop: usize,
}

#[derive(Debug, Clone, Default)]
pub struct ExecutionState {
    pub variables: HashMap<String, Value>,
    pub table: Vec<Map<String, Value>>,
    pub loop_list: HashMap<String, LoopState>,
    pub loop_data: HashMap<String, Value>,
    pub repeated_tasks: HashMap<String, u32>,
    pub prev_block_data: Value,
    pub active_tab_url: String,
    pub step_logs: Vec<AutomaStepLog>,
    /// Resolved secret values (Secret Store). Referenced as `{{secrets@name}}` —
    /// the Automa dialect authored by the canvas (`EditorUsedCredentials.vue`).
    /// Never persisted into variables / result / logs.
    pub secrets: std::collections::HashMap<String, Value>,
    /// Column names of the workflow data table (Automa `workflow.table`/`dataColumns`).
    pub table_columns: Vec<String>,
    /// Declared column types (Automa `workflow.table[].type`).
    pub table_column_types: std::collections::HashMap<String, String>,
    /// Automa keeps one row cursor *per column* (`WorkflowWorker.addDataToColumn`): each
    /// column writes at its own index, which is what makes several columns inserted in one
    /// block land in the SAME row instead of one row each.
    pub table_column_index: std::collections::HashMap<String, usize>,
    /// Results of `execute-workflow` sub-runs, keyed like Automa
    /// (`executeId` or `<workflowId>-subN`), holding `{ table, variables }`.
    /// Readable from expressions as `{{workflow.<key>.variables.<name>}}`.
    pub workflows: std::collections::HashMap<String, Value>,
    /// Nesting depth of `execute-workflow` runs (loop protection).
    pub subflow_depth: u32,
    /// Results of `google-sheets` blocks keyed by their `refKey` (Automa
    /// `referenceData.googleSheets`), readable as `{{googleSheets.<key>}}`.
    pub google_sheets_refs: std::collections::HashMap<String, Value>,
}

impl ExecutionState {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn set_variable(&mut self, name: &str, val: Value) {
        if let Some(stripped) = name.strip_prefix("$push:") {
            let var_name = stripped.trim();
            let entry = self
                .variables
                .entry(var_name.to_string())
                .or_insert_with(|| Value::Array(vec![]));
            if let Some(arr) = entry.as_array_mut() {
                arr.push(val);
            } else {
                let prev = entry.clone();
                *entry = Value::Array(vec![prev, val]);
            }
        } else {
            self.variables.insert(name.to_string(), val);
        }
    }

    pub fn set_secret(&mut self, name: &str, val: Value) {
        self.secrets.insert(name.to_string(), val);
    }

    /// Automa `addDataToColumn`: values are converted by the column's declared type and
    /// written at that column's own row cursor, so inserting several columns in one block
    /// fills a single row.
    pub fn add_data_to_column(&mut self, col_name: &str, val: Value) {
        let column_type = self.table_column_types.get(col_name).cloned();
        let value = convert_column_value(val, column_type.as_deref());
        let cursor = self
            .table_column_index
            .entry(col_name.to_string())
            .or_insert(0);

        if self.table.len() > *cursor {
            self.table[*cursor].insert(col_name.to_string(), value);
        } else {
            let mut row = Map::new();
            row.insert(col_name.to_string(), value);
            self.table.push(row);
        }
        *cursor += 1;
    }
}

/// Automa `convertData` (workflowEngine/helper.js:174) — matches its per-type coercion,
/// including the `integer` digits-only parse and `default` being a no-op.
fn convert_column_value(value: Value, column_type: Option<&str>) -> Value {
    match column_type {
        None | Some("any") => value,
        Some("string") => Value::String(match &value {
            Value::String(s) => s.clone(),
            Value::Null => "null".to_string(),
            other => other.to_string(),
        }),
        Some("integer") => {
            if let Some(n) = value.as_i64() {
                return Value::from(n);
            }
            let digits: String = value
                .as_str()
                .unwrap_or_default()
                .chars()
                .filter(|c| c.is_ascii_digit())
                .collect();
            if digits.is_empty() {
                value
            } else {
                Value::from(digits.parse::<i64>().unwrap_or_default())
            }
        }
        Some("boolean") => Value::Bool(match &value {
            Value::Null => false,
            Value::Bool(b) => *b,
            Value::Number(n) => n.as_f64().is_some_and(|f| f != 0.0),
            Value::String(s) => !s.is_empty(),
            _ => true,
        }),
        Some("array") => match value {
            Value::Array(items) => Value::Array(items),
            Value::String(s) => {
                Value::Array(s.chars().map(|c| Value::String(c.to_string())).collect())
            }
            _ => Value::Array(vec![]),
        },
        // Automa's `default` branch performs no conversion (e.g. `number`, `json`, `date`).
        Some(_) => value,
    }
}

pub struct WorkflowDagExecutor {
    graph: WorkflowGraph,
    backend: Arc<dyn BrowserBackend>,
}

impl WorkflowDagExecutor {
    pub fn new(graph: WorkflowGraph, backend: Arc<dyn BrowserBackend>) -> Self {
        Self { graph, backend }
    }

    /// Recursively interpolates `{{variables.x}}`, `{{table.0.col}}`, `{{loopData.id}}`, etc.
    pub fn interpolate_string(&self, input: &str, state: &ExecutionState) -> String {
        let re = Regex::new(r"\{\{([^{}]+)\}\}").unwrap();
        re.replace_all(input, |caps: &regex::Captures| {
            let expr = caps[1].trim();
            Self::resolve_expression(expr, state)
        })
        .to_string()
    }

    pub fn resolve_expression(expr: &str, state: &ExecutionState) -> String {
        if expr == "$timestamp" {
            return chrono::Utc::now().timestamp_millis().to_string();
        }
        if expr == "$date" {
            return chrono::Utc::now().format("%Y-%m-%d").to_string();
        }

        if let Some(var_expr) = expr
            .strip_prefix("variables.")
            .or_else(|| expr.strip_prefix("vars."))
        {
            if let Some(v) = state.variables.get(var_expr) {
                return match v {
                    Value::String(s) => s.clone(),
                    other => other.to_string(),
                };
            }
            return String::new();
        }

        if let Some(key) = expr.strip_prefix("googleSheets.") {
            // Automa: `referenceData.googleSheets[refKey]` (set by the `google-sheets` block).
            return match state.google_sheets_refs.get(key.trim()) {
                Some(Value::String(s)) => s.clone(),
                Some(other) => other.to_string(),
                None => String::new(),
            };
        }

        if let Some(rest) = expr.strip_prefix("workflow.") {
            // Automa stores a finished `execute-workflow` run as
            // `referenceData.workflow[key] = { table, variables }`.
            let mut parts = rest.splitn(2, '.');
            let key = parts.next().unwrap_or("");
            let path = parts.next().unwrap_or("");
            let Some(entry) = state.workflows.get(key) else {
                return String::new();
            };
            if path.is_empty() {
                return entry.to_string();
            }
            let resolved = path
                .split('.')
                .filter(|segment| !segment.is_empty())
                .try_fold(entry, |value, segment| match segment.parse::<usize>() {
                    Ok(index) => value.get(index).or_else(|| value.get(segment)),
                    Err(_) => value.get(segment),
                });
            return match resolved {
                Some(Value::String(s)) => s.clone(),
                Some(other) => other.to_string(),
                None => String::new(),
            };
        }

        if let Some(loop_expr) = expr.strip_prefix("loopData.") {
            let parts: Vec<&str> = loop_expr.split('.').collect();
            if let Some(loop_id) = parts.first() {
                if let Some(ld) = state.loop_data.get(*loop_id) {
                    if parts.len() == 1 {
                        return ld.to_string();
                    }
                    if parts.len() >= 2 {
                        let sub = parts[1];
                        if sub == "$index" {
                            if let Some(idx) = ld.get("$index") {
                                return idx.to_string();
                            }
                        } else if sub == "data" {
                            if let Some(d) = ld.get("data") {
                                if parts.len() == 2 {
                                    return match d {
                                        Value::String(s) => s.clone(),
                                        other => other.to_string(),
                                    };
                                }
                                if parts.len() > 2 {
                                    let field = parts[2];
                                    if let Some(fv) = d.get(field) {
                                        return match fv {
                                            Value::String(s) => s.clone(),
                                            other => other.to_string(),
                                        };
                                    }
                                }
                            }
                        }
                    }
                }
            }
            return String::new();
        }

        if expr == "prevBlockData" {
            return match &state.prev_block_data {
                Value::String(s) => s.clone(),
                other => other.to_string(),
            };
        }

        if let Some(stripped) = expr.strip_prefix("prevBlockData.") {
            if let Some(fv) = state.prev_block_data.get(stripped) {
                return match fv {
                    Value::String(s) => s.clone(),
                    other => other.to_string(),
                };
            }
        }

        if let Some(gd_expr) = expr.strip_prefix("globalData.") {
            if let Some(v) = state.variables.get(gd_expr) {
                return match v {
                    Value::String(s) => s.clone(),
                    other => other.to_string(),
                };
            }
        }

        // Automa dialect: `{{secrets@name}}`. The graph only ever holds the reference;
        // the value is resolved here from the Secret Store and scrubbed by the masker.
        if let Some(sec_expr) = expr.strip_prefix("secrets@") {
            if let Some(v) = state.secrets.get(sec_expr) {
                return match v {
                    Value::String(s) => s.clone(),
                    other => other.to_string(),
                };
            }
            return String::new();
        }

        String::new()
    }

    pub fn interpolate_value(&self, val: &Value, state: &ExecutionState) -> Value {
        match val {
            Value::String(s) => {
                let trimmed = s.trim();
                if trimmed.starts_with("{{")
                    && trimmed.ends_with("}}")
                    && !trimmed[2..trimmed.len() - 2].contains("{{")
                {
                    let expr = trimmed[2..trimmed.len() - 2].trim();
                    if let Some(var_expr) = expr
                        .strip_prefix("variables.")
                        .or_else(|| expr.strip_prefix("vars."))
                    {
                        if let Some(v) = state.variables.get(var_expr) {
                            return v.clone();
                        }
                    }
                    if expr == "prevBlockData" {
                        return state.prev_block_data.clone();
                    }
                }
                Value::String(self.interpolate_string(s, state))
            }
            Value::Array(arr) => Value::Array(
                arr.iter()
                    .map(|item| self.interpolate_value(item, state))
                    .collect(),
            ),
            Value::Object(obj) => {
                let mut out = Map::new();
                for (k, v) in obj {
                    out.insert(k.clone(), self.interpolate_value(v, state));
                }
                Value::Object(out)
            }
            other => other.clone(),
        }
    }

    pub fn execute<'a>(
        &'a self,
        initial_state: Option<ExecutionState>,
        cancel_token: CancellationToken,
    ) -> std::pin::Pin<
        Box<dyn std::future::Future<Output = Result<ExecutionState, String>> + Send + 'a>,
    > {
        Box::pin(async move {
            let (state, _) = self
                .execute_with_io(initial_state, None, HashMap::new(), cancel_token)
                .await?;
            Ok(state)
        })
    }

    #[allow(clippy::type_complexity)]
    pub fn execute_with_io<'a>(
        &'a self,
        initial_state: Option<ExecutionState>,
        entry_node_id: Option<String>,
        package_outputs: HashMap<String, String>,
        cancel_token: CancellationToken,
    ) -> std::pin::Pin<
        Box<dyn std::future::Future<Output = Result<(ExecutionState, String), String>> + Send + 'a>,
    > {
        Box::pin(async move {
            // Automa `isDisabled`: a disabled workflow must never execute.
            if self.graph.is_disabled {
                return Err(format!(
                    "Workflow '{}' is disabled (isDisabled = true) — refusing to run",
                    self.graph.name
                ));
            }

            // Automa `onError: restart-workflow` + `settings.restartTimes` (default 3).
            let max_restart = self.graph.settings.restart_times.unwrap_or(3);
            let restart_policy = self
                .graph
                .settings
                .on_error
                .as_deref()
                .is_some_and(|policy| policy == "restart-workflow");
            let mut attempt: u32 = 0;
            let mut state: ExecutionState;

            'restart: loop {
                state = initial_state.clone().unwrap_or_default();
                if state.table_columns.is_empty() {
                    state.table_columns = self.graph.table_columns.clone();
                }
                if state.table_column_types.is_empty() {
                    state.table_column_types = self.graph.table_column_types.clone();
                }

                let start_node_id = entry_node_id
                    .clone()
                    .filter(|id| self.graph.nodes.contains_key(id))
                    .or_else(|| self.graph.trigger_id.clone())
                    .or_else(|| {
                        let targets: std::collections::HashSet<&str> = self
                            .graph
                            .connections
                            .values()
                            .flat_map(|v| v.iter().map(|t| t.target_node_id.as_str()))
                            .collect();
                        self.graph
                            .nodes
                            .keys()
                            .find(|k| !targets.contains(k.as_str()))
                            .cloned()
                    })
                    .or_else(|| self.graph.nodes.keys().next().cloned())
                    .ok_or_else(|| "Workflow contains no nodes".to_string())?;

                let mut next_queue: Vec<(String, Option<String>)> = vec![(start_node_id, None)];
                let mut matched_package_output: Option<String> = None;

                while let Some((current_node_id, incoming_target_handle)) = next_queue.pop() {
                    if cancel_token.is_cancelled() {
                        return Err("Execution cancelled".to_string());
                    }

                    let node = match self.graph.nodes.get(&current_node_id) {
                        Some(n) => n.clone(),
                        None => {
                            warn!("Target node '{}' not found in graph", current_node_id);
                            continue;
                        }
                    };

                    let start_time = std::time::Instant::now();
                    let interpolated_data = self.interpolate_value(&node.data, &state);

                    let res = self
                        .execute_block(
                            &node.id,
                            incoming_target_handle.as_deref(),
                            &node.label,
                            &interpolated_data,
                            &mut state,
                            &cancel_token,
                        )
                        .await;

                    let duration_ms = start_time.elapsed().as_millis() as u64;

                    match res {
                        Ok((block_out, branch)) => {
                            state.prev_block_data = block_out;
                            // Automa `settings.saveLog` (default true): when false only error
                            // steps are recorded (parity with WorkflowEngine.addLogHistory).
                            if self.graph.settings.save_log != Some(false) {
                                state.step_logs.push(AutomaStepLog {
                                    id: uuid::Uuid::new_v4().to_string(),
                                    name: node.label.clone(),
                                    block_id: Some(node.id.clone()),
                                    status: "success".to_string(),
                                    duration_ms: Some(duration_ms),
                                    message: None,
                                });
                            }

                            // Resolve outgoing connections: if branch matches a node ID directly (e.g. loop block id), jump to it directly
                            if self.graph.nodes.contains_key(&branch) {
                                next_queue.push((branch, None));
                            } else {
                                let output_handle = if branch.starts_with(&node.id) {
                                    branch.clone()
                                } else {
                                    format!("{}-output-{}", node.id, branch)
                                };

                                if let Some(pkg_out_id) = package_outputs.get(&output_handle) {
                                    matched_package_output = Some(pkg_out_id.clone());
                                }

                                if let Some(targets) = self.graph.connections.get(&output_handle) {
                                    for t in targets.iter().rev() {
                                        next_queue.push((
                                            t.target_node_id.clone(),
                                            if t.target_handle.is_empty() {
                                                None
                                            } else {
                                                Some(t.target_handle.clone())
                                            },
                                        ));
                                    }
                                } else if branch == "1" {
                                    if let Some(targets) =
                                        self.graph.connections.get(&format!("{}-output-1", node.id))
                                    {
                                        for t in targets.iter().rev() {
                                            next_queue.push((
                                                t.target_node_id.clone(),
                                                if t.target_handle.is_empty() {
                                                    None
                                                } else {
                                                    Some(t.target_handle.clone())
                                                },
                                            ));
                                        }
                                    }
                                }
                            }

                            if self.graph.settings.block_delay > 0 {
                                tokio::time::sleep(Duration::from_millis(
                                    self.graph.settings.block_delay,
                                ))
                                .await;
                            }
                        }
                        Err(err) => {
                            state.step_logs.push(AutomaStepLog {
                                id: uuid::Uuid::new_v4().to_string(),
                                name: node.label.clone(),
                                block_id: Some(node.id.clone()),
                                status: "error".to_string(),
                                duration_ms: Some(duration_ms),
                                message: Some(err.clone()),
                            });

                            // Handle onError policy
                            let on_error = node
                                .data
                                .pointer("/onError/toDo")
                                .and_then(|v| v.as_str())
                                .or(self.graph.settings.on_error.as_deref())
                                .unwrap_or("error");

                            let fallback_handle = format!("{}-output-fallback", node.id);
                            if let Some(pkg_out_id) = package_outputs.get(&fallback_handle) {
                                matched_package_output = Some(pkg_out_id.clone());
                                if on_error == "fallback" {
                                    if let Some(targets) =
                                        self.graph.connections.get(&fallback_handle)
                                    {
                                        for t in targets.iter().rev() {
                                            next_queue.push((
                                                t.target_node_id.clone(),
                                                if t.target_handle.is_empty() {
                                                    None
                                                } else {
                                                    Some(t.target_handle.clone())
                                                },
                                            ));
                                        }
                                    }
                                    continue;
                                }
                            }

                            if on_error == "fallback" {
                                if let Some(targets) = self.graph.connections.get(&fallback_handle)
                                {
                                    for t in targets.iter().rev() {
                                        next_queue.push((
                                            t.target_node_id.clone(),
                                            if t.target_handle.is_empty() {
                                                None
                                            } else {
                                                Some(t.target_handle.clone())
                                            },
                                        ));
                                    }
                                    continue;
                                }
                                if matched_package_output.is_some() {
                                    continue;
                                }
                            } else if on_error == "continue" {
                                let def_handle = format!("{}-output-1", node.id);
                                if let Some(targets) = self.graph.connections.get(&def_handle) {
                                    for t in targets.iter().rev() {
                                        next_queue.push((
                                            t.target_node_id.clone(),
                                            if t.target_handle.is_empty() {
                                                None
                                            } else {
                                                Some(t.target_handle.clone())
                                            },
                                        ));
                                    }
                                    continue;
                                }
                            }

                            if restart_policy && attempt < max_restart {
                                attempt += 1;
                                warn!(
                                    "Block '{}' ({}) failed — restarting workflow (attempt {}/{})",
                                    node.label, node.id, attempt, max_restart
                                );
                                continue 'restart;
                            }

                            return Err(format!(
                                "Block '{}' ({}) failed: {}",
                                node.label, node.id, err
                            ));
                        }
                    }
                }

                break 'restart Ok((
                    state,
                    matched_package_output.unwrap_or_else(|| "1".to_string()),
                ));
            }
        })
    }

    /// Renders column-oriented Automa table data / row objects as CSV.
    ///
    /// Header order follows the workflow's declared `table` columns first (Automa
    /// `workflow.table`), then any extra keys encountered, so a declared-but-empty table
    /// still produces a header row.
    fn rows_to_csv(
        rows: &[Value],
        declared_columns: &[String],
        delimiter: &str,
        add_bom: bool,
    ) -> String {
        let mut columns: Vec<String> = declared_columns.to_vec();
        for row in rows {
            if let Some(obj) = row.as_object() {
                for key in obj.keys() {
                    if !columns.iter().any(|c| c == key) {
                        columns.push(key.clone());
                    }
                }
            }
        }

        let mut out = String::new();
        if add_bom {
            out.push('\u{feff}');
        }
        if !columns.is_empty() {
            out.push_str(
                &columns
                    .iter()
                    .map(|c| Self::csv_cell(c, delimiter))
                    .collect::<Vec<_>>()
                    .join(delimiter),
            );
            out.push('\n');
        }
        for row in rows {
            let cells = columns
                .iter()
                .map(|col| {
                    Self::csv_cell(
                        &row.get(col).map(Self::cell_text).unwrap_or_default(),
                        delimiter,
                    )
                })
                .collect::<Vec<_>>();
            out.push_str(&cells.join(delimiter));
            out.push('\n');
        }
        out
    }

    /// RFC-4180 quoting: only quote when the cell contains the delimiter, a quote or a newline.
    fn csv_cell(value: &str, delimiter: &str) -> String {
        if value.contains(delimiter)
            || value.contains('"')
            || value.contains('\n')
            || value.contains('\r')
        {
            format!("\"{}\"", value.replace('"', "\"\""))
        } else {
            value.to_string()
        }
    }

    fn cell_text(value: &Value) -> String {
        match value {
            Value::String(s) => s.clone(),
            Value::Null => String::new(),
            other => other.to_string(),
        }
    }

    /// Automa `plain-text` exports: all values flattened and joined with a single space.
    fn rows_to_plain_text(rows: &[Value]) -> String {
        let mut parts: Vec<String> = Vec::new();
        for row in rows {
            match row {
                Value::Object(obj) => {
                    for value in obj.values() {
                        parts.push(Self::cell_text(value));
                    }
                }
                other => parts.push(Self::cell_text(other)),
            }
        }
        parts.join(" ")
    }

    /// Writes an export artefact to disk.
    ///
    /// Automa hands the bytes to the browser's download API; a headless worker has no such
    /// surface, so the file is written under `EXPORT_DIR` (default `~/.operon/automation/exports`)
    /// and the path is returned. `onConflict` mirrors Automa: `uniquify` (default) keeps
    /// existing files and appends `-1`, `-2`…; `overwrite` replaces.
    fn write_export_file(
        base_name: &str,
        ext: &str,
        content: &str,
        on_conflict: &str,
    ) -> Result<String, String> {
        let dir = std::env::var("EXPORT_DIR")
            .ok()
            .filter(|s| !s.trim().is_empty())
            .map(std::path::PathBuf::from)
            .unwrap_or_else(|| {
                let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
                std::path::PathBuf::from(home).join(".operon/automation/exports")
            });
        std::fs::create_dir_all(&dir)
            .map_err(|e| format!("export-data: cannot create {}: {e}", dir.display()))?;

        // Never let a canvas-authored name escape the export directory.
        let safe: String = base_name
            .rsplit(['/', '\\'])
            .next()
            .unwrap_or("unnamed")
            .chars()
            .map(|c| {
                if c.is_ascii_alphanumeric() || matches!(c, '.' | '_' | '-') {
                    c
                } else {
                    '_'
                }
            })
            .collect();
        let safe = if safe.is_empty() {
            "unnamed".to_string()
        } else {
            safe
        };

        let mut path = dir.join(format!("{safe}.{ext}"));
        if on_conflict != "overwrite" {
            let mut counter = 1;
            while path.exists() {
                path = dir.join(format!("{safe}-{counter}.{ext}"));
                counter += 1;
            }
        }

        std::fs::write(&path, content)
            .map_err(|e| format!("export-data: cannot write {}: {e}", path.display()))?;
        Ok(path.to_string_lossy().to_string())
    }

    async fn execute_block(
        &self,
        node_id: &str,
        incoming_target_handle: Option<&str>,
        label: &str,
        data: &Value,
        state: &mut ExecutionState,
        cancel_token: &CancellationToken,
    ) -> Result<(Value, String), String> {
        match label {
            "trigger" => Ok((Value::Null, "1".to_string())),
            "delay" => {
                let ms = data.get("time").and_then(|v| v.as_u64()).unwrap_or(1000);
                tokio::select! {
                    _ = tokio::time::sleep(Duration::from_millis(ms)) => Ok((Value::from(ms), "1".to_string())),
                    _ = cancel_token.cancelled() => Err("Cancelled during delay".to_string())
                }
            }
            "new-tab" | "tab-url" | "link" => {
                let url = data
                    .get("url")
                    .and_then(|v| v.as_str())
                    .ok_or_else(|| "Missing 'url' parameter".to_string())?;
                self.backend.navigate(url).await?;
                state.active_tab_url = url.to_string();
                Ok((Value::String(url.to_string()), "1".to_string()))
            }
            "reload-tab" => {
                self.backend.reload().await?;
                Ok((Value::Null, "1".to_string()))
            }
            "go-back" => {
                self.backend.go_back().await?;
                Ok((Value::Null, "1".to_string()))
            }
            "forward-page" => {
                self.backend.go_forward().await?;
                Ok((Value::Null, "1".to_string()))
            }
            "active-tab" => {
                let url = self.backend.get_url().await.unwrap_or_default();
                state.active_tab_url = url.clone();
                Ok((Value::String(url), "1".to_string()))
            }
            "close-tab" => {
                let _ = self.backend.evaluate("window.close()").await;
                Ok((Value::Null, "1".to_string()))
            }
            "event-click" => {
                let (selector, index) = Self::parse_target_selector(data, state)?;
                self.backend.click_at_index(&selector, index).await?;
                Ok((Value::Null, "1".to_string()))
            }
            "hover-element" => {
                let (selector, index) = Self::parse_target_selector(data, state)?;
                self.backend.hover_at_index(&selector, index).await?;
                Ok((Value::Null, "1".to_string()))
            }
            "forms" => {
                let (selector, index) = Self::parse_target_selector(data, state)?;
                let ftype = data
                    .get("type")
                    .and_then(|v| v.as_str())
                    .unwrap_or("text-field");
                let text = data.get("value").and_then(|v| v.as_str()).unwrap_or("");
                let clear_val = data
                    .get("clearValue")
                    .and_then(|v| v.as_bool())
                    .unwrap_or(true);
                let delay = data.get("delay").and_then(|v| v.as_u64()).unwrap_or(0);

                if ftype == "text-field" {
                    self.backend
                        .type_text_at_index(&selector, index, text, clear_val, delay == 0)
                        .await?;
                } else {
                    let sel_opt = data.get("selected").and_then(|v| v.as_bool());
                    self.backend
                        .manipulate_form_element(&selector, index, ftype, text, clear_val, sel_opt)
                        .await?;
                }
                Ok((Value::String(text.to_string()), "1".to_string()))
            }
            "press-key" => {
                let key = data.get("key").and_then(|v| v.as_str()).unwrap_or("Enter");
                self.backend.press_key(key).await?;
                Ok((Value::String(key.to_string()), "1".to_string()))
            }
            "element-scroll" => {
                let (selector, index) = Self::parse_target_selector(data, state)?;
                let into_view = data
                    .get("scrollIntoView")
                    .and_then(|v| v.as_bool())
                    .unwrap_or(true);
                let smooth = data.get("smooth").and_then(|v| v.as_bool()).unwrap_or(true);
                let sx = data.get("scrollX").and_then(|v| v.as_f64()).unwrap_or(0.0);
                let sy = data.get("scrollY").and_then(|v| v.as_f64()).unwrap_or(0.0);

                self.backend
                    .scroll_element(&selector, index, sx, sy, into_view, smooth)
                    .await?;
                Ok((Value::Null, "1".to_string()))
            }
            "get-text" => {
                let (selector, index) = Self::parse_target_selector(data, state)?;
                let multiple = data
                    .get("multiple")
                    .and_then(|v| v.as_bool())
                    .unwrap_or(false);
                let include_tags = data
                    .get("includeTags")
                    .and_then(|v| v.as_bool())
                    .unwrap_or(false);

                let val = self
                    .backend
                    .get_text(&selector, Some(index), multiple, include_tags)
                    .await?;

                Self::assign_extracted_data(data, val.clone(), state);
                Ok((val, "1".to_string()))
            }
            "attribute-value" => {
                let (selector, index) = Self::parse_target_selector(data, state)?;
                let attr = data
                    .get("attributeName")
                    .and_then(|v| v.as_str())
                    .unwrap_or("href");
                let multiple = data
                    .get("multiple")
                    .and_then(|v| v.as_bool())
                    .unwrap_or(false);

                let val = self
                    .backend
                    .get_attribute(&selector, attr, Some(index), multiple)
                    .await?;

                Self::assign_extracted_data(data, val.clone(), state);
                Ok((val, "1".to_string()))
            }
            "element-exists" => {
                let (selector, _) = Self::parse_target_selector(data, state)?;
                let timeout_ms = data.get("timeout").and_then(|v| v.as_u64()).unwrap_or(3000);
                let exists = self
                    .backend
                    .element_exists(&selector, Duration::from_millis(timeout_ms))
                    .await?;

                let branch = if exists { "1" } else { "fallback" };
                Ok((Value::Bool(exists), branch.to_string()))
            }
            "javascript-code" => {
                let code = data.get("code").and_then(|v| v.as_str()).unwrap_or("");
                let val = self.backend.evaluate(code).await?;
                Self::assign_extracted_data(data, val.clone(), state);
                Ok((val, "1".to_string()))
            }
            "take-screenshot" => {
                let fmt = data.get("ext").and_then(|v| v.as_str()).unwrap_or("png");
                let b64 = self.backend.capture_screenshot(fmt).await?;
                Self::assign_extracted_data(data, Value::String(b64.clone()), state);
                Ok((Value::String(b64), "1".to_string()))
            }
            "cookie" => {
                let action = data
                    .get("type")
                    .and_then(|v| v.as_str())
                    .unwrap_or("get-all");
                match action {
                    "get-all" => {
                        let cookies = self.backend.get_cookies(None).await?;
                        Self::assign_extracted_data(data, cookies.clone(), state);
                        Ok((cookies, "1".to_string()))
                    }
                    "set" => {
                        let c = data.get("cookie").cloned().unwrap_or(Value::Null);
                        let ok = self.backend.set_cookie(c).await?;
                        Ok((Value::Bool(ok), "1".to_string()))
                    }
                    "delete" => {
                        let name = data.get("name").and_then(|v| v.as_str()).unwrap_or("");
                        let url = data.get("url").and_then(|v| v.as_str());
                        self.backend.delete_cookies(name, url, None).await?;
                        Ok((Value::Null, "1".to_string()))
                    }
                    _ => Ok((Value::Null, "1".to_string())),
                }
            }
            "turnstile" => {
                let timeout_secs = data.get("timeout").and_then(|v| v.as_u64()).unwrap_or(20);
                let solved = self
                    .backend
                    .solve_turnstile(Duration::from_secs(timeout_secs))
                    .await?;
                let branch = if solved { "1" } else { "fallback" };
                Ok((Value::Bool(solved), branch.to_string()))
            }
            "repeat-task" => {
                let repeat_for = data.get("repeatFor").and_then(|v| v.as_u64()).unwrap_or(1) as u32;
                let counter = state.repeated_tasks.entry(node_id.to_string()).or_insert(0);
                *counter += 1;

                if *counter > repeat_for {
                    state.repeated_tasks.remove(node_id);
                    Ok((Value::from(repeat_for), "1".to_string()))
                } else {
                    Ok((Value::from(*counter), "2".to_string()))
                }
            }
            "conditions" | "while-loop" => {
                let matched_branch = Self::evaluate_conditions(data, state);
                Ok((Value::Null, matched_branch))
            }
            "loop-data" => {
                let loop_id = data
                    .get("loopId")
                    .and_then(|v| v.as_str())
                    .unwrap_or(node_id);
                if let Some(cur) = state.loop_list.get_mut(loop_id) {
                    cur.index += 1;
                    let cur_idx = cur.index;
                    let val = cur.items.get(cur_idx).cloned().unwrap_or(Value::Null);
                    state.loop_data.insert(
                        loop_id.to_string(),
                        json!({
                            "data": val,
                            "$index": cur_idx
                        }),
                    );
                    Ok((val, "1".to_string()))
                } else {
                    let loop_through = data
                        .get("loopThrough")
                        .and_then(|v| v.as_str())
                        .unwrap_or("numbers");
                    let items = match loop_through {
                        "numbers" => {
                            let from = data.get("fromNumber").and_then(|v| v.as_i64()).unwrap_or(1);
                            let to = data.get("toNumber").and_then(|v| v.as_i64()).unwrap_or(5);
                            (from..=to).map(Value::from).collect()
                        }
                        "custom-data" => {
                            let raw = data
                                .get("loopData")
                                .and_then(|v| v.as_str())
                                .unwrap_or("[]");
                            serde_json::from_str::<Vec<Value>>(raw).unwrap_or_default()
                        }
                        "variable" => {
                            let vname = data
                                .get("variableName")
                                .and_then(|v| v.as_str())
                                .unwrap_or("");
                            state
                                .variables
                                .get(vname)
                                .and_then(|v| v.as_array())
                                .cloned()
                                .unwrap_or_default()
                        }
                        _ => vec![],
                    };

                    let first = items.first().cloned().unwrap_or(Value::Null);
                    state.loop_list.insert(
                        loop_id.to_string(),
                        LoopState {
                            index: 0,
                            block_id: node_id.to_string(),
                            items,
                            max_loop: data.get("maxLoop").and_then(|v| v.as_u64()).unwrap_or(0)
                                as usize,
                        },
                    );
                    state.loop_data.insert(
                        loop_id.to_string(),
                        json!({
                            "data": first,
                            "$index": 0
                        }),
                    );
                    Ok((first, "1".to_string()))
                }
            }
            "loop-elements" => {
                let loop_id = data
                    .get("loopId")
                    .and_then(|v| v.as_str())
                    .unwrap_or(node_id);
                if let Some(cur) = state.loop_list.get_mut(loop_id) {
                    cur.index += 1;
                    let cur_idx = cur.index;
                    let val = cur.items.get(cur_idx).cloned().unwrap_or(Value::Null);
                    state.loop_data.insert(
                        loop_id.to_string(),
                        json!({
                            "data": val,
                            "$index": cur_idx
                        }),
                    );
                    Ok((val, "1".to_string()))
                } else {
                    let selector = data.get("selector").and_then(|v| v.as_str()).unwrap_or("");
                    let count = self.backend.count_elements(selector).await.unwrap_or(0);
                    let max_loop =
                        data.get("maxLoop").and_then(|v| v.as_u64()).unwrap_or(0) as usize;
                    let limit = if max_loop > 0 && max_loop < count {
                        max_loop
                    } else {
                        count
                    };

                    let items: Vec<Value> = (0..limit)
                        .map(|i| Value::String(format!("__el_loop__:{selector}@{i}")))
                        .collect();

                    let first = items.first().cloned().unwrap_or(Value::Null);
                    state.loop_list.insert(
                        loop_id.to_string(),
                        LoopState {
                            index: 0,
                            block_id: node_id.to_string(),
                            items,
                            max_loop: limit,
                        },
                    );
                    state.loop_data.insert(
                        loop_id.to_string(),
                        json!({
                            "data": first,
                            "$index": 0
                        }),
                    );
                    Ok((first, "1".to_string()))
                }
            }
            "loop-breakpoint" => {
                let loop_id = data.get("loopId").and_then(|v| v.as_str()).unwrap_or("");
                let clear_loop = data
                    .get("clearLoop")
                    .and_then(|v| v.as_bool())
                    .unwrap_or(false);

                if let Some(cur) = state.loop_list.get(loop_id) {
                    let has_more = cur.index + 1 < cur.items.len()
                        && (cur.max_loop == 0 || cur.index + 1 < cur.max_loop);

                    if !clear_loop && has_more {
                        // Return output branch pointing back to the loop block ID
                        let loop_block_id = cur.block_id.clone();
                        return Ok((Value::Null, loop_block_id));
                    }
                }

                state.loop_list.remove(loop_id);
                state.loop_data.remove(loop_id);
                Ok((Value::Null, "1".to_string()))
            }
            "insert-data" => {
                if let Some(arr) = data
                    .get("dataList")
                    .or_else(|| data.get("dataToInsert"))
                    .and_then(|v| v.as_array())
                {
                    for item in arr {
                        let name = item
                            .get("name")
                            .and_then(|v| v.as_str())
                            .unwrap_or("column");
                        let val = item.get("value").cloned().unwrap_or(Value::Null);
                        let itype = item
                            .get("type")
                            .and_then(|v| v.as_str())
                            .unwrap_or("column");
                        if itype == "variable" {
                            state.set_variable(name, val);
                        } else {
                            state.add_data_to_column(name, val);
                        }
                    }
                }
                Ok((Value::Null, "1".to_string()))
            }
            "google-sheets" => {
                let secret = state
                    .secrets
                    .get(crate::core::google_auth::SERVICE_ACCOUNT_SECRET)
                    .ok_or_else(|| {
                        format!(
                            "google-sheets: missing credential — store the service-account JSON with \
                             `opn secret set {} @key.json` and reference it as {{secrets@{}}}",
                            crate::core::google_auth::SERVICE_ACCOUNT_SECRET,
                            crate::core::google_auth::SERVICE_ACCOUNT_SECRET
                        )
                    })?;
                let sheets = crate::core::google_sheets::SheetsClient::connect(secret).await?;

                let spreadsheet_id = data
                    .get("spreadsheetId")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .trim()
                    .to_string();
                let range = data
                    .get("range")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .trim()
                    .to_string();
                let action = data.get("type").and_then(|v| v.as_str()).unwrap_or("get");
                let sheet_name = data
                    .get("sheetName")
                    .and_then(|v| v.as_str())
                    .filter(|s| !s.trim().is_empty())
                    .unwrap_or("Sheet1");

                // Automa only needs the spreadsheet id for the non-create actions.
                let needs_target = !matches!(action, "create" | "add-sheet");
                if needs_target && spreadsheet_id.is_empty() {
                    return Err("google-sheets: spreadsheetId is empty".to_string());
                }
                if needs_target && range.is_empty() {
                    return Err(
                        "google-sheets: range is empty — use A1 notation (e.g. Sheet1!A1:C1)"
                            .to_string(),
                    );
                }

                let rows =
                    crate::core::google_sheets::table_to_values(&state.table, &state.table_columns);

                let result = match action {
                    "get" | "getRange" => {
                        let target = if range.is_empty() {
                            format!("{sheet_name}!A1:ZZ1000")
                        } else {
                            range.clone()
                        };
                        let values = sheets.get_values(&spreadsheet_id, &target).await?;
                        values
                            .get("values")
                            .cloned()
                            .unwrap_or_else(|| Value::Array(vec![]))
                    }
                    "append" => sheets.append_values(&spreadsheet_id, &range, &rows).await?,
                    "update" => sheets.update_values(&spreadsheet_id, &range, &rows).await?,
                    "clear" => sheets.clear_values(&spreadsheet_id, &range).await?,
                    "create" => {
                        let created = sheets.create_spreadsheet(sheet_name).await?;
                        created.get("spreadsheetId").cloned().unwrap_or(Value::Null)
                    }
                    "add-sheet" => {
                        let response = sheets.add_sheet(&spreadsheet_id, sheet_name).await?;
                        response
                            .pointer("/replies/0/addSheet/properties")
                            .cloned()
                            .unwrap_or(Value::Null)
                    }
                    other => {
                        return Err(format!("google-sheets: unsupported type '{other}'"));
                    }
                };

                // Automa `refKey` → `referenceData.googleSheets[key]`, so later blocks and
                // `export-data` can consume the result.
                if let Some(ref_key) = data
                    .get("refKey")
                    .and_then(|v| v.as_str())
                    .filter(|s| !s.trim().is_empty())
                {
                    state
                        .google_sheets_refs
                        .insert(ref_key.trim().to_string(), result.clone());
                }
                if data
                    .get("assignVariable")
                    .and_then(|v| v.as_bool())
                    .unwrap_or(false)
                {
                    if let Some(name) = data
                        .get("variableName")
                        .and_then(|v| v.as_str())
                        .filter(|s| !s.trim().is_empty())
                    {
                        state.set_variable(name, result.clone());
                    }
                }
                // `dataColumn` empty means "don't save into the data table" — Automa would fall
                // back to a literal `column` column, which is almost never what an author wants.
                if data
                    .get("saveData")
                    .and_then(|v| v.as_bool())
                    .unwrap_or(false)
                {
                    if let Some(column) = data
                        .get("dataColumn")
                        .and_then(|v| v.as_str())
                        .filter(|s| !s.trim().is_empty())
                    {
                        state.add_data_to_column(column, result.clone());
                    }
                }

                Ok((result, "1".to_string()))
            }
            "export-data" => {
                let data_to_export = data
                    .get("dataToExport")
                    .and_then(|v| v.as_str())
                    .unwrap_or("data-columns");
                let export_type = data.get("type").and_then(|v| v.as_str()).unwrap_or("json");
                let base_name = data
                    .get("name")
                    .and_then(|v| v.as_str())
                    .filter(|s| !s.is_empty())
                    .unwrap_or("unnamed");
                let delimiter = data
                    .get("csvDelimiter")
                    .and_then(|v| v.as_str())
                    .filter(|s| !s.is_empty())
                    .unwrap_or(",");
                let add_bom = data
                    .get("addBOMHeader")
                    .and_then(|v| v.as_bool())
                    .unwrap_or(true);
                let on_conflict = data
                    .get("onConflict")
                    .and_then(|v| v.as_str())
                    .unwrap_or("uniquify");

                // Automa sources (`handlerExportData.js`): the workflow data table, a
                // variable, or a google-sheets references collection.
                let rows: Vec<Value> = match data_to_export {
                    "variable" => {
                        let var_name = data
                            .get("variableName")
                            .and_then(|v| v.as_str())
                            .unwrap_or("");
                        match state.variables.get(var_name) {
                            Some(Value::Array(items)) => items.clone(),
                            Some(other) => vec![other.clone()],
                            None => Vec::new(),
                        }
                    }
                    "data-columns" | "table" => state
                        .table
                        .iter()
                        .map(|row| Value::Object(row.clone()))
                        .collect(),
                    // Automa: `refData.googleSheets[refKey]` — filled by the `google-sheets` block.
                    "google-sheets" => {
                        let ref_key = data.get("refKey").and_then(|v| v.as_str()).unwrap_or("");
                        match state.google_sheets_refs.get(ref_key) {
                            Some(Value::Array(items)) => items.clone(),
                            Some(other) => vec![other.clone()],
                            None => Vec::new(),
                        }
                    }
                    unsupported => {
                        return Err(format!(
                            "export-data: source '{unsupported}' is not supported by this engine"
                        ));
                    }
                };

                let (content, ext) = match export_type {
                    "csv" => (
                        Self::rows_to_csv(&rows, &state.table_columns, delimiter, add_bom),
                        "csv",
                    ),
                    "plain-text" => (Self::rows_to_plain_text(&rows), "txt"),
                    _ => (
                        serde_json::to_string_pretty(&rows).unwrap_or_else(|_| "[]".to_string()),
                        "json",
                    ),
                };

                let path = Self::write_export_file(base_name, ext, &content, on_conflict)?;
                debug!(
                    "export-data: wrote {} row(s) as {} to {}",
                    rows.len(),
                    export_type,
                    path
                );
                // Automa returns an empty payload because the browser performs the download.
                // Headless has no download UI, so the written path IS the result — returned so
                // downstream blocks / logs can reference the artefact.
                Ok((Value::String(path), "1".to_string()))
            }
            "execute-workflow" => {
                let workflow_id = data
                    .get("workflowId")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                if workflow_id.is_empty() {
                    return Err("execute-workflow: empty workflowId".to_string());
                }
                if let Some(sub_doc) = self.graph.included_workflows.get(workflow_id) {
                    if state.subflow_depth >= MAX_SUBFLOW_DEPTH {
                        return Err(format!(
                            "execute-workflow: nesting deeper than {MAX_SUBFLOW_DEPTH} sub-workflows — refusing to continue"
                        ));
                    }

                    let sub_graph = WorkflowGraph::from_json(sub_doc)?;

                    // Automa guards against a workflow including itself (`workflow-infinite-loop`).
                    let parent_key = self
                        .graph
                        .id
                        .clone()
                        .unwrap_or_else(|| self.graph.name.clone());
                    let recurses_into_parent = sub_graph.nodes.values().any(|node| {
                        node.label == "execute-workflow"
                            && node
                                .data
                                .get("workflowId")
                                .and_then(|v| v.as_str())
                                .is_some_and(|id| id == parent_key || id == self.graph.name)
                    });
                    if recurses_into_parent {
                        return Err(format!(
                            "execute-workflow: '{workflow_id}' executes this workflow back — infinite loop refused"
                        ));
                    }

                    let mut child_state = ExecutionState::new();
                    child_state.subflow_depth = state.subflow_depth + 1;
                    child_state.table_columns = sub_graph.table_columns.clone();
                    child_state.secrets = state.secrets.clone();

                    if data
                        .get("insertAllGlobalData")
                        .and_then(|v| v.as_bool())
                        .unwrap_or(false)
                    {
                        for (k, v) in &self.graph.global_data {
                            child_state.variables.insert(k.clone(), v.clone());
                        }
                    }
                    if let Some(raw) = data
                        .get("globalData")
                        .and_then(|v| v.as_str())
                        .filter(|s| !s.trim().is_empty())
                    {
                        if let Ok(Value::Object(passed)) = serde_json::from_str::<Value>(raw) {
                            for (k, v) in passed {
                                child_state.variables.insert(k, v);
                            }
                        }
                    }
                    let insert_all_vars = data
                        .get("insertAllVars")
                        .and_then(|v| v.as_bool())
                        .unwrap_or(false);
                    if insert_all_vars {
                        for (k, v) in &state.variables {
                            child_state.variables.insert(k.clone(), v.clone());
                        }
                    } else if let Some(list) = data.get("insertVars").and_then(|v| v.as_str()) {
                        for name in list.split(',').map(str::trim).filter(|s| !s.is_empty()) {
                            if let Some(value) = state.variables.get(name) {
                                child_state
                                    .variables
                                    .insert(name.to_string(), value.clone());
                            }
                        }
                    }

                    let child = WorkflowDagExecutor::new(sub_graph, self.backend.clone());
                    let (child_state, _) = child
                        .execute_with_io(
                            Some(child_state),
                            None,
                            HashMap::new(),
                            cancel_token.clone(),
                        )
                        .await?;

                    if insert_all_vars {
                        for (k, v) in &child_state.variables {
                            state.variables.insert(k.clone(), v.clone());
                        }
                    }

                    let key = data
                        .get("executeId")
                        .and_then(|v| v.as_str())
                        .filter(|s| !s.is_empty())
                        .map(str::to_string)
                        .unwrap_or_else(|| format!("{workflow_id}-sub{}", state.subflow_depth + 1));
                    state.workflows.insert(
                        key,
                        json!({
                            "table": child_state.table,
                            "variables": child_state.variables,
                        }),
                    );

                    return Ok((Value::Null, "1".to_string()));
                }

                Err(format!(
                    "execute-workflow: workflow '{workflow_id}' is not bundled in this document \
                     (expected it under `includedWorkflows`) — refusing to silently skip a sub-workflow"
                ))
            }
            "increase-variable" => {
                let name = data
                    .get("variableName")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                let amount = data.get("value").and_then(|v| v.as_i64()).unwrap_or(1);
                let cur = state
                    .variables
                    .get(name)
                    .and_then(|v| v.as_i64())
                    .unwrap_or(0);
                let next = cur + amount;
                state.set_variable(name, Value::from(next));
                Ok((Value::from(next), "1".to_string()))
            }
            "block-package" => {
                // Official Automa Package (`handlerBlockPackage.js`) execution:
                // 1. Resolve entry blockId from `data.inputs` using incoming `targetHandle` (`${pkgNodeId}-input-${inputId}`)
                // 2. Map internal `data.outputs[].handleId` -> external package output `output.id`
                if let Some(sub_val) = data.get("data").or_else(|| data.get("workflowData")) {
                    if let Ok(sub_graph) = WorkflowGraph::from_json(sub_val) {
                        let target_input_id = incoming_target_handle.and_then(|th| {
                            th.split("-input-").nth(1).or(if !th.is_empty() {
                                Some(th)
                            } else {
                                None
                            })
                        });

                        let entry_block_id = data
                            .get("inputs")
                            .and_then(|v| v.as_array())
                            .and_then(|inputs| {
                                if let Some(tid) = target_input_id {
                                    inputs
                                        .iter()
                                        .find(|item| {
                                            item.get("id").and_then(|v| v.as_str()) == Some(tid)
                                        })
                                        .or_else(|| inputs.first())
                                } else {
                                    inputs.first()
                                }
                            })
                            .and_then(|item| item.get("blockId").and_then(|v| v.as_str()))
                            .map(|s| s.to_string());

                        let mut package_outputs = HashMap::new();
                        if let Some(outputs) = data.get("outputs").and_then(|v| v.as_array()) {
                            for out_item in outputs {
                                if let Some(out_id) = out_item.get("id").and_then(|v| v.as_str()) {
                                    if let Some(handle_id) =
                                        out_item.get("handleId").and_then(|v| v.as_str())
                                    {
                                        if !handle_id.is_empty() {
                                            package_outputs
                                                .insert(handle_id.to_string(), out_id.to_string());
                                        } else if let Some(block_id) =
                                            out_item.get("blockId").and_then(|v| v.as_str())
                                        {
                                            package_outputs.insert(
                                                format!("{}-output-1", block_id),
                                                out_id.to_string(),
                                            );
                                        }
                                    } else if let Some(block_id) =
                                        out_item.get("blockId").and_then(|v| v.as_str())
                                    {
                                        package_outputs.insert(
                                            format!("{}-output-1", block_id),
                                            out_id.to_string(),
                                        );
                                    }
                                }
                            }
                        }

                        let sub_executor =
                            WorkflowDagExecutor::new(sub_graph, Arc::clone(&self.backend));
                        let (sub_state, out_branch) = sub_executor
                            .execute_with_io(
                                Some(state.clone()),
                                entry_block_id,
                                package_outputs,
                                cancel_token.clone(),
                            )
                            .await?;
                        state.variables = sub_state.variables;
                        state.table = sub_state.table;
                        state.prev_block_data = sub_state.prev_block_data;
                        state.active_tab_url = sub_state.active_tab_url;
                        state.step_logs = sub_state.step_logs;
                        return Ok((state.prev_block_data.clone(), out_branch));
                    }
                }
                Ok((Value::Null, "1".to_string()))
            }
            "webhook" => {
                let url = data.get("url").and_then(|v| v.as_str()).unwrap_or("");
                let method = data
                    .get("method")
                    .and_then(|v| v.as_str())
                    .unwrap_or("POST");
                let body = data.get("body").cloned().unwrap_or(Value::Null);

                let client = reqwest::Client::new();
                let req = match method.to_uppercase().as_str() {
                    "GET" => client.get(url),
                    _ => client.post(url).json(&body),
                };
                let resp = req.send().await.map_err(|e| e.to_string())?;
                let text = resp.text().await.map_err(|e| e.to_string())?;
                let val: Value = serde_json::from_str(&text).unwrap_or(Value::String(text));
                Self::assign_extracted_data(data, val.clone(), state);
                Ok((val, "1".to_string()))
            }
            _ => {
                // Automa-schema doctrine §0.3: a canvas can author blocks this engine does not
                // implement. Reporting success for those makes the canvas "fake authoring" and
                // hides real gaps — so fail loudly instead. The workflow's own `onError` policy
                // (node/settings) decides whether the run stops or takes its fallback branch.
                if CANVAS_ONLY_BLOCKS.contains(&label) {
                    debug!(
                        "Canvas-only block skipped (no runtime behaviour): {}",
                        label
                    );
                    Ok((Value::Null, "1".to_string()))
                } else {
                    Err(format!(
                        "Unsupported block '{}': allowed by the workflow schema but not implemented by this engine. Refusing to report success.",
                        label
                    ))
                }
            }
        }
    }

    fn parse_target_selector(
        data: &Value,
        state: &ExecutionState,
    ) -> Result<(String, usize), String> {
        let raw = data
            .get("selector")
            .or_else(|| data.get("elementSelector"))
            .and_then(|v| v.as_str())
            .unwrap_or("");

        if raw.is_empty() {
            return Err("Missing target selector".to_string());
        }

        if let Some(stripped) = raw.strip_prefix("__el_loop__:") {
            if let Some((base_sel, idx_str)) = stripped.rsplit_once('@') {
                let idx: usize = idx_str.parse().unwrap_or(0);
                return Ok((base_sel.to_string(), idx));
            }
        }

        // Check if an active loop elements context applies
        if let Some(loop_id) = data.get("loopId").and_then(|v| v.as_str()) {
            if let Some(loop_st) = state.loop_list.get(loop_id) {
                return Ok((raw.to_string(), loop_st.index));
            }
        }

        Ok((raw.to_string(), 0))
    }

    fn assign_extracted_data(data: &Value, val: Value, state: &mut ExecutionState) {
        if data
            .get("assignVariable")
            .and_then(|v| v.as_bool())
            .unwrap_or(false)
        {
            if let Some(var_name) = data.get("variableName").and_then(|v| v.as_str()) {
                if !var_name.is_empty() {
                    state.set_variable(var_name, val.clone());
                }
            }
        }
        if data
            .get("saveData")
            .and_then(|v| v.as_bool())
            .unwrap_or(false)
        {
            if let Some(col_name) = data.get("dataColumn").and_then(|v| v.as_str()) {
                if !col_name.is_empty() {
                    state.add_data_to_column(col_name, val);
                }
            }
        }
    }

    fn evaluate_conditions(data: &Value, state: &ExecutionState) -> String {
        let conds_arr = match data.get("conditions").and_then(|v| v.as_array()) {
            Some(a) => a,
            None => return "1".to_string(),
        };

        for (idx, item) in conds_arr.iter().enumerate() {
            let cond_type = item.get("type").and_then(|v| v.as_str()).unwrap_or("==");
            let val_a = item.get("value").cloned().unwrap_or(Value::Null);
            let val_b = item
                .get("compareValue")
                .cloned()
                .unwrap_or(state.prev_block_data.clone());

            let is_match = match cond_type {
                "==" | "eq" => val_a == val_b,
                "!=" | "ne" => val_a != val_b,
                ">" | "gt" => val_a.as_f64().unwrap_or(0.0) > val_b.as_f64().unwrap_or(0.0),
                ">=" | "gte" => val_a.as_f64().unwrap_or(0.0) >= val_b.as_f64().unwrap_or(0.0),
                "<" | "lt" => val_a.as_f64().unwrap_or(0.0) < val_b.as_f64().unwrap_or(0.0),
                "<=" | "lte" => val_a.as_f64().unwrap_or(0.0) <= val_b.as_f64().unwrap_or(0.0),
                "()" | "contains" => {
                    let s_a = val_a.as_str().unwrap_or("");
                    let s_b = val_b.as_str().unwrap_or("");
                    s_a.contains(s_b)
                }
                "empty" => val_a.is_null() || val_a == Value::String(String::new()),
                _ => false,
            };

            if is_match {
                let out_id = item
                    .get("id")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string());
                return out_id.unwrap_or_else(|| (idx + 1).to_string());
            }
        }

        "fallback".to_string()
    }
}

#[cfg(test)]
pub mod tests {
    use super::*;
    use std::sync::Mutex;

    pub struct InMemoryMockBackend {
        pub url: Mutex<String>,
        pub clicks: Mutex<Vec<(String, usize)>>,
        pub typed: Mutex<Vec<(String, usize, String)>>,
    }

    impl InMemoryMockBackend {
        pub fn new() -> Self {
            Self {
                url: Mutex::new("about:blank".to_string()),
                clicks: Mutex::new(vec![]),
                typed: Mutex::new(vec![]),
            }
        }
    }

    impl Default for InMemoryMockBackend {
        fn default() -> Self {
            Self::new()
        }
    }

    #[async_trait]
    impl BrowserBackend for InMemoryMockBackend {
        async fn navigate(&self, url: &str) -> Result<(), String> {
            *self.url.lock().unwrap() = url.to_string();
            Ok(())
        }
        async fn reload(&self) -> Result<(), String> {
            Ok(())
        }
        async fn go_back(&self) -> Result<(), String> {
            Ok(())
        }
        async fn go_forward(&self) -> Result<(), String> {
            Ok(())
        }
        async fn get_url(&self) -> Result<String, String> {
            Ok(self.url.lock().unwrap().clone())
        }
        async fn click_at_index(&self, selector: &str, index: usize) -> Result<(), String> {
            self.clicks
                .lock()
                .unwrap()
                .push((selector.to_string(), index));
            Ok(())
        }
        async fn hover_at_index(&self, _selector: &str, _index: usize) -> Result<(), String> {
            Ok(())
        }
        async fn type_text_at_index(
            &self,
            selector: &str,
            index: usize,
            text: &str,
            _clear: bool,
            _direct: bool,
        ) -> Result<(), String> {
            self.typed
                .lock()
                .unwrap()
                .push((selector.to_string(), index, text.to_string()));
            Ok(())
        }
        async fn press_key(&self, _key: &str) -> Result<(), String> {
            Ok(())
        }
        async fn scroll(&self, _dx: f64, _dy: f64) -> Result<(), String> {
            Ok(())
        }
        async fn scroll_element(
            &self,
            _selector: &str,
            _index: usize,
            _dx: f64,
            _dy: f64,
            _into_view: bool,
            _smooth: bool,
        ) -> Result<bool, String> {
            Ok(true)
        }
        async fn get_text(
            &self,
            _selector: &str,
            _index: Option<usize>,
            _multiple: bool,
            _include_tags: bool,
        ) -> Result<Value, String> {
            Ok(Value::String("Scraped Text".to_string()))
        }
        async fn get_attribute(
            &self,
            _selector: &str,
            _attr: &str,
            _index: Option<usize>,
            _multiple: bool,
        ) -> Result<Value, String> {
            Ok(Value::String("https://example.com/item".to_string()))
        }
        async fn element_exists(&self, selector: &str, _timeout: Duration) -> Result<bool, String> {
            Ok(selector != "#missing")
        }
        async fn count_elements(&self, selector: &str) -> Result<usize, String> {
            if selector == ".item" {
                Ok(3)
            } else {
                Ok(1)
            }
        }
        async fn manipulate_form_element(
            &self,
            _selector: &str,
            _index: usize,
            _form_type: &str,
            _value: &str,
            _clear: bool,
            _selected: Option<bool>,
        ) -> Result<Value, String> {
            Ok(Value::Bool(true))
        }
        async fn capture_screenshot(&self, _format: &str) -> Result<String, String> {
            Ok("dGVzdF9zY3JlZW5zaG90".to_string())
        }
        async fn get_cookies(&self, _urls: Option<Vec<String>>) -> Result<Value, String> {
            Ok(json!([{"name": "test_cookie", "value": "123"}]))
        }
        async fn set_cookie(&self, _cookie: Value) -> Result<bool, String> {
            Ok(true)
        }
        async fn delete_cookies(
            &self,
            _name: &str,
            _url: Option<&str>,
            _domain: Option<&str>,
        ) -> Result<(), String> {
            Ok(())
        }
        async fn evaluate(&self, _script: &str) -> Result<Value, String> {
            Ok(Value::from(42))
        }
        async fn solve_turnstile(&self, _timeout: Duration) -> Result<bool, String> {
            Ok(true)
        }
    }

    #[tokio::test]
    async fn test_workflow_dag_linear_execution() {
        let wf_json = json!({
            "name": "Linear Test",
            "drawflow": {
                "nodes": [
                    { "id": "t1", "label": "trigger", "data": {} },
                    { "id": "n1", "label": "new-tab", "data": { "url": "https://example.com" } },
                    { "id": "c1", "label": "event-click", "data": { "selector": "button#submit" } }
                ],
                "edges": [
                    { "source": "t1", "target": "n1" },
                    { "source": "n1", "target": "c1" }
                ]
            }
        });

        let graph = WorkflowGraph::from_json(&wf_json).unwrap();
        let mock_backend = Arc::new(tests::InMemoryMockBackend::new());
        let executor = WorkflowDagExecutor::new(graph, mock_backend.clone());

        let res = executor
            .execute(None, CancellationToken::new())
            .await
            .unwrap();
        assert_eq!(*mock_backend.url.lock().unwrap(), "https://example.com");
        let clicks = mock_backend.clicks.lock().unwrap();
        assert_eq!(clicks.len(), 1);
        assert_eq!(clicks[0].0, "button#submit");
        assert_eq!(res.step_logs.len(), 3);
    }

    #[tokio::test]
    async fn test_workflow_mustache_templating() {
        let wf_json = json!({
            "name": "Template Test",
            "nodes": [
                { "id": "t1", "label": "trigger", "data": {} },
                { "id": "f1", "label": "forms", "data": { "selector": "#search", "value": "{{variables.query}}" } }
            ],
            "edges": [
                { "source": "t1", "target": "f1" }
            ]
        });

        let graph = WorkflowGraph::from_json(&wf_json).unwrap();
        let mock_backend = Arc::new(tests::InMemoryMockBackend::new());
        let executor = WorkflowDagExecutor::new(graph, mock_backend.clone());

        let mut initial_state = ExecutionState::new();
        initial_state.set_variable("query", Value::String("Anti-Detect".to_string()));

        let _ = executor
            .execute(Some(initial_state), CancellationToken::new())
            .await
            .unwrap();
        let typed = mock_backend.typed.lock().unwrap();
        assert_eq!(typed.len(), 1);
        assert_eq!(typed[0].2, "Anti-Detect");
    }

    #[tokio::test]
    async fn test_workflow_loop_elements_and_breakpoint() {
        let wf_json = json!({
            "name": "Loop Test",
            "nodes": [
                { "id": "t1", "label": "trigger", "data": {} },
                { "id": "l1", "label": "loop-elements", "data": { "loopId": "my_loop", "selector": ".item", "maxLoop": 3 } },
                { "id": "c1", "label": "event-click", "data": { "loopId": "my_loop", "selector": ".item" } },
                { "id": "b1", "label": "loop-breakpoint", "data": { "loopId": "my_loop" } }
            ],
            "edges": [
                { "source": "t1", "target": "l1" },
                { "source": "l1", "target": "c1" },
                { "source": "c1", "target": "b1" },
                { "source": "b1", "target": "l1", "sourceHandle": "b1-output-b1" }
            ]
        });

        let graph = WorkflowGraph::from_json(&wf_json).unwrap();
        let mock_backend = Arc::new(tests::InMemoryMockBackend::new());
        let executor = WorkflowDagExecutor::new(graph, mock_backend.clone());

        let _ = executor
            .execute(None, CancellationToken::new())
            .await
            .unwrap();
        let clicks = mock_backend.clicks.lock().unwrap();
        assert_eq!(clicks.len(), 3);
        assert_eq!(clicks[0].1, 0);
        assert_eq!(clicks[1].1, 1);
        assert_eq!(clicks[2].1, 2);
    }

    #[tokio::test]
    async fn test_official_automa_block_package_multi_io() {
        let wf_json = json!({
            "name": "Official Package Multi-IO Test",
            "drawflow": {
                "nodes": [
                    { "id": "t1", "label": "trigger", "data": {} },
                    {
                        "id": "pkg_login",
                        "label": "block-package",
                        "type": "BlockPackage",
                        "data": {
                            "id": "pkg_auth_v1",
                            "name": "Auth Package",
                            "icon": "mdiPackageVariantClosed",
                            "settings": { "asBlock": true },
                            "inputs": [
                                {
                                    "id": "in_unused",
                                    "name": "Unused Entry",
                                    "blockId": "sub_unused",
                                    "handleId": "sub_unused-input-1"
                                },
                                {
                                    "id": "in_main",
                                    "name": "Main Entry",
                                    "blockId": "sub_open",
                                    "handleId": "sub_open-input-1"
                                }
                            ],
                            "outputs": [
                                {
                                    "id": "out_ok",
                                    "name": "Success",
                                    "blockId": "sub_check",
                                    "handleId": "sub_check-output-1"
                                },
                                {
                                    "id": "out_fail",
                                    "name": "Fallback",
                                    "blockId": "sub_check",
                                    "handleId": "sub_check-output-fallback"
                                }
                            ],
                            "data": {
                                "nodes": [
                                    {
                                        "id": "sub_unused",
                                        "label": "new-tab",
                                        "data": { "url": "https://unused.example.com" }
                                    },
                                    {
                                        "id": "sub_open",
                                        "label": "new-tab",
                                        "data": { "url": "https://auth.example.com" }
                                    },
                                    {
                                        "id": "sub_check",
                                        "label": "element-exists",
                                        "data": { "selector": "#missing", "tryCount": 1, "timeout": 10 }
                                    }
                                ],
                                "edges": [
                                    {
                                        "source": "sub_open",
                                        "target": "sub_check",
                                        "sourceHandle": "sub_open-output-1",
                                        "targetHandle": "sub_check-input-1"
                                    }
                                ]
                            }
                        }
                    },
                    {
                        "id": "after_ok",
                        "label": "insert-data",
                        "data": {
                            "dataList": [
                                { "type": "variable", "name": "authResult", "value": "ok" }
                            ]
                        }
                    },
                    {
                        "id": "after_fail",
                        "label": "insert-data",
                        "data": {
                            "dataList": [
                                { "type": "variable", "name": "authResult", "value": "fallback_taken" }
                            ]
                        }
                    }
                ],
                "edges": [
                    {
                        "source": "t1",
                        "target": "pkg_login",
                        "sourceHandle": "t1-output-1",
                        "targetHandle": "pkg_login-input-in_main"
                    },
                    {
                        "source": "pkg_login",
                        "target": "after_ok",
                        "sourceHandle": "pkg_login-output-out_ok",
                        "targetHandle": "after_ok-input-1"
                    },
                    {
                        "source": "pkg_login",
                        "target": "after_fail",
                        "sourceHandle": "pkg_login-output-out_fail",
                        "targetHandle": "after_fail-input-1"
                    }
                ]
            }
        });

        let graph = WorkflowGraph::from_json(&wf_json).unwrap();
        let mock_backend = Arc::new(tests::InMemoryMockBackend::new());
        let executor = WorkflowDagExecutor::new(graph, mock_backend.clone());

        let state = executor
            .execute(None, CancellationToken::new())
            .await
            .unwrap();
        assert_eq!(
            *mock_backend.url.lock().unwrap(),
            "https://auth.example.com"
        );
        assert_eq!(
            state.variables.get("authResult"),
            Some(&Value::String("fallback_taken".to_string()))
        );
    }
}

/// Contract tests for the Automa-schema parity work: the engine must honour what the
/// canvas declares (`isDisabled`, `settings.restartTimes`/`saveLog`, the document-root
/// `trigger`, `global_data`).
#[cfg(test)]
mod automa_parity_tests {
    use super::*;

    fn doc() -> Value {
        serde_json::json!({
            "name": "parity",
            "settings": {"restartTimes": 5, "saveLog": false, "onError": "restart-workflow"},
            "global_data": {"env": "prod"},
            "isDisabled": true,
            "trigger": {"type": "cron-job", "expression": "0 8 * * 1-5",
                "parameters": [{"name": "mode", "defaultValue": "dry-run"},
                               {"name": "maxLateMinutes", "defaultValue": 60}]},
            "nodes": [{"id": "a", "label": "delay", "data": {"time": 10}}],
            "edges": []
        })
    }

    #[test]
    fn reads_is_disabled() {
        assert!(WorkflowGraph::from_json(&doc()).unwrap().is_disabled);
        let mut d = doc();
        d["isDisabled"] = serde_json::json!(false);
        assert!(!WorkflowGraph::from_json(&d).unwrap().is_disabled);
    }

    #[test]
    fn reads_restart_times_and_save_log() {
        let g = WorkflowGraph::from_json(&doc()).unwrap();
        assert_eq!(g.settings.restart_times, Some(5));
        assert_eq!(g.settings.save_log, Some(false));
        assert_eq!(g.settings.on_error.as_deref(), Some("restart-workflow"));
    }

    #[test]
    fn reads_document_root_trigger_parameters() {
        // No trigger *block* in the graph — the contract lives at the document root.
        let g = WorkflowGraph::from_json(&doc()).unwrap();
        let params = g.trigger_parameters();
        assert_eq!(
            params.len(),
            2,
            "expected the root trigger contract: {params:?}"
        );
        assert_eq!(params[0].0, "mode");
        assert_eq!(params[0].1, serde_json::json!("dry-run"));
    }

    #[test]
    fn trigger_block_still_wins_over_root_declaration() {
        let mut d = doc();
        d["nodes"] = serde_json::json!([
            {"id": "t", "label": "trigger", "data": {"parameters": [{"name": "fromBlock", "defaultValue": 1}]}}
        ]);
        let g = WorkflowGraph::from_json(&d).unwrap();
        assert_eq!(g.trigger_parameters()[0].0, "fromBlock");
    }

    #[test]
    fn reads_snake_case_global_data() {
        let g = WorkflowGraph::from_json(&doc()).unwrap();
        assert_eq!(g.global_data.get("env"), Some(&serde_json::json!("prod")));
    }
}

#[cfg(test)]
mod automa_block_tests {
    use super::tests;
    use super::*;

    // ---- export-data ----

    /// `EXPORT_DIR` is process-wide, so export tests must not run concurrently.
    /// An async-aware mutex keeps the guard legal to hold across the test's await points.
    async fn export_lock() -> tokio::sync::MutexGuard<'static, ()> {
        static LOCK: std::sync::OnceLock<tokio::sync::Mutex<()>> = std::sync::OnceLock::new();
        LOCK.get_or_init(|| tokio::sync::Mutex::new(()))
            .lock()
            .await
    }

    fn export_dir(tag: &str) -> String {
        let dir = std::env::temp_dir().join(format!("opn-export-{}-{}", std::process::id(), tag));
        let _ = std::fs::remove_dir_all(&dir);
        std::env::set_var("EXPORT_DIR", &dir);
        dir.to_string_lossy().to_string()
    }

    fn export_doc(export_data: Value) -> Value {
        json!({
            "name": "exporter",
            "table": [
                {"id": "c1", "name": "title", "type": "string"},
                {"id": "c2", "name": "count", "type": "integer"}
            ],
            "nodes": [
                {"id": "t", "label": "trigger", "data": {}},
                {"id": "i", "label": "insert-data", "data": {"dataList": [
                    {"type": "column", "name": "title", "value": "Hello"},
                    {"type": "column", "name": "count", "value": "3"}
                ]}},
                {"id": "x", "label": "export-data", "data": export_data}
            ],
            "edges": [{"source": "t", "target": "i"}, {"source": "i", "target": "x"}]
        })
    }

    async fn run_doc(doc: Value) -> ExecutionState {
        let graph = WorkflowGraph::from_json(&doc).unwrap();
        let executor = WorkflowDagExecutor::new(graph, Arc::new(tests::InMemoryMockBackend::new()));
        executor
            .execute(None, tokio_util::sync::CancellationToken::new())
            .await
            .unwrap()
    }

    #[test]
    fn reads_automa_table_and_data_columns() {
        let doc = export_doc(json!({}));
        assert_eq!(
            WorkflowGraph::from_json(&doc).unwrap().table_columns,
            vec!["title", "count"]
        );

        let mut alt = export_doc(json!({}));
        alt.as_object_mut().unwrap().remove("table");
        alt["dataColumns"] = json!([{"id": "c1", "name": "legacy_col"}]);
        assert_eq!(
            WorkflowGraph::from_json(&alt).unwrap().table_columns,
            vec!["legacy_col"]
        );
    }

    #[tokio::test]
    async fn export_data_writes_csv_in_declared_column_order_with_bom() {
        let _serial = export_lock().await;
        let dir = export_dir("csv");
        let state = run_doc(export_doc(json!({
            "type": "csv", "name": "report", "dataToExport": "data-columns",
            "csvDelimiter": ",", "addBOMHeader": true
        })))
        .await;

        let path = state.prev_block_data.as_str().unwrap().to_string();
        assert!(
            path.starts_with(&dir),
            "export escaped its directory: {path}"
        );
        let content = std::fs::read_to_string(&path).unwrap();
        assert_eq!(content, "\u{feff}title,count\nHello,3\n");
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[tokio::test]
    async fn export_data_uniquifies_by_default_and_overwrites_on_request() {
        let _serial = export_lock().await;
        let dir = export_dir("conflict");
        let doc = json!({
            "type": "json", "name": "same", "dataToExport": "data-columns"
        });
        let s1 = run_doc(export_doc(doc.clone())).await;
        let s2 = run_doc(export_doc(doc.clone())).await;
        let p1 = s1.prev_block_data.as_str().unwrap().to_string();
        let p2 = s2.prev_block_data.as_str().unwrap().to_string();
        assert_ne!(
            p1, p2,
            "default onConflict=uniquify must not clobber the first file"
        );
        assert!(p2.ends_with("-1.json"), "unexpected unique name: {p2}");

        let mut overwrite = doc.clone();
        overwrite["onConflict"] = json!("overwrite");
        let s3 = run_doc(export_doc(overwrite)).await;
        assert_eq!(s3.prev_block_data.as_str().unwrap(), p1);
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[tokio::test]
    async fn export_data_rejects_unknown_sources() {
        let _serial = export_lock().await;
        let _ = export_dir("bad");
        let graph = WorkflowGraph::from_json(&export_doc(json!({
            "type": "json", "dataToExport": "not-a-source"
        })))
        .unwrap();
        let executor = WorkflowDagExecutor::new(graph, Arc::new(tests::InMemoryMockBackend::new()));
        let err = executor
            .execute(None, tokio_util::sync::CancellationToken::new())
            .await
            .unwrap_err();
        assert!(err.contains("not-a-source"), "got: {err}");
    }

    #[tokio::test]
    async fn export_data_exports_a_google_sheets_ref() {
        let _serial = export_lock().await;
        let dir = export_dir("gsheet-ref");
        let mut doc = export_doc(json!({
            "type": "json", "name": "from-sheet", "dataToExport": "google-sheets", "refKey": "rows"
        }));
        // Simulate the `google-sheets` block having stored `referenceData.googleSheets.rows`.
        doc["nodes"][1] = json!({"id": "i", "label": "delay", "data": {"time": 1}});
        let graph = WorkflowGraph::from_json(&doc).unwrap();
        let executor = WorkflowDagExecutor::new(graph, Arc::new(tests::InMemoryMockBackend::new()));
        let mut initial = ExecutionState::new();
        initial
            .google_sheets_refs
            .insert("rows".to_string(), json!([["a", 1], ["b", 2]]));
        let state = executor
            .execute(Some(initial), tokio_util::sync::CancellationToken::new())
            .await
            .unwrap();
        let path = state.prev_block_data.as_str().unwrap().to_string();
        assert!(path.starts_with(&dir));
        let content = std::fs::read_to_string(&path).unwrap();
        assert!(
            content.contains("\"a\""),
            "sheet rows must be exported, got: {content}"
        );
        let _ = std::fs::remove_dir_all(&dir);
    }

    // ---- execute-workflow ----

    fn subflow_doc() -> Value {
        json!({
            "id": "sub1",
            "name": "Sub",
            "nodes": [
                {"id": "t", "label": "trigger", "data": {}},
                {"id": "v", "label": "insert-data", "data": {"dataList": [
                    {"type": "variable", "name": "fromSub", "value": "42"}
                ]}}
            ],
            "edges": [{"source": "t", "target": "v"}]
        })
    }

    fn parent_doc(execute_data: Value, included: Value) -> Value {
        json!({
            "id": "parent",
            "name": "Parent",
            "nodes": [
                {"id": "t", "label": "trigger", "data": {}},
                {"id": "e", "label": "execute-workflow", "data": execute_data},
                {"id": "c", "label": "insert-data", "data": {"dataList": [
                    {"type": "variable", "name": "got",
                     "value": "{{workflow.sub1-sub1.variables.fromSub}}"}
                ]}}
            ],
            "edges": [{"source": "t", "target": "e"}, {"source": "e", "target": "c"}],
            "includedWorkflows": included
        })
    }

    #[tokio::test]
    async fn execute_workflow_runs_bundled_subflow_and_exposes_its_results() {
        let state = run_doc(parent_doc(
            json!({"workflowId": "sub1"}),
            json!({"sub1": subflow_doc()}),
        ))
        .await;

        assert!(
            state.workflows.contains_key("sub1-sub1"),
            "sub-workflow results must be exposed like Automa: {:?}",
            state.workflows.keys().collect::<Vec<_>>()
        );
        assert_eq!(
            state.variables.get("got").and_then(|v| v.as_str()),
            Some("42"),
            "{{workflow.<key>.variables.<name>}} must resolve"
        );
    }

    #[tokio::test]
    async fn execute_workflow_merges_variables_when_insert_all_vars() {
        let doc = parent_doc(
            json!({"workflowId": "sub1", "insertAllVars": true}),
            json!({"sub1": subflow_doc()}),
        );
        let state = run_doc(doc).await;
        assert_eq!(
            state.variables.get("fromSub").and_then(|v| v.as_str()),
            Some("42")
        );
    }

    #[tokio::test]
    async fn execute_workflow_refuses_unbundled_and_looping_subflows() {
        // Not bundled → must fail loudly rather than silently skipping the sub-workflow.
        let graph = WorkflowGraph::from_json(&parent_doc(
            json!({"workflowId": "missing"}),
            json!({"sub1": subflow_doc()}),
        ))
        .unwrap();
        let executor = WorkflowDagExecutor::new(graph, Arc::new(tests::InMemoryMockBackend::new()));
        let err = executor
            .execute(None, tokio_util::sync::CancellationToken::new())
            .await
            .unwrap_err();
        assert!(err.contains("not bundled"), "got: {err}");

        // Sub-workflow executes the parent back → infinite loop refused.
        let mut looping = subflow_doc();
        looping["nodes"] = json!([
            {"id": "t", "label": "trigger", "data": {}},
            {"id": "back", "label": "execute-workflow", "data": {"workflowId": "parent"}}
        ]);
        looping["edges"] = json!([{"source": "t", "target": "back"}]);
        let graph = WorkflowGraph::from_json(&parent_doc(
            json!({"workflowId": "sub1"}),
            json!({"sub1": looping}),
        ))
        .unwrap();
        let executor = WorkflowDagExecutor::new(graph, Arc::new(tests::InMemoryMockBackend::new()));
        let err = executor
            .execute(None, tokio_util::sync::CancellationToken::new())
            .await
            .unwrap_err();
        assert!(err.contains("infinite loop"), "got: {err}");
    }
}
