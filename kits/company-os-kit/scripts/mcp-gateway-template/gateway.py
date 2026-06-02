"""
Antigravity MCP Gateway
========================
Single-Router Python proxy that bridges Context7 (Live Docs)
into a unified local API.

Requirements (from @mt-arch Mastertable Review):
1. Single-Router: One port (9090), routes to Context7
2. Doc-Chunking: Context7 responses are chunked to max_tokens before returning
3. PII-Scrubber: DIRECTIVE-002 compliant

Usage:
  python gateway.py [--port 9090]
  curl http://localhost:9090/health
  curl http://localhost:9090/docs  # OpenAPI Swagger UI
"""

import os
from pathlib import Path

# Auto-load .env file BEFORE anything else
_env_file = Path(__file__).parent / ".env"
if _env_file.exists():
    for _line in _env_file.read_text().splitlines():
        _line = _line.strip()
        if _line and not _line.startswith("#") and "=" in _line:
            _key, _, _val = _line.partition("=")
            _key, _val = _key.strip(), _val.strip()
            # Only set if .env value is non-empty and env var is empty/unset
            if _val and not os.environ.get(_key):
                os.environ[_key] = _val

import re
import json
import logging
import asyncio
from typing import Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.responses import HTMLResponse
from datetime import datetime

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
GATEWAY_PORT = int(os.getenv("GATEWAY_PORT", "9090"))
CONTEXT7_MAX_TOKENS = int(os.getenv("CONTEXT7_MAX_TOKENS", "3000"))
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

logging.basicConfig(level=LOG_LEVEL, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("antigravity-gateway")

# ---------------------------------------------------------------------------
# PII Scrubber (DIRECTIVE-002 compliant)
# ---------------------------------------------------------------------------
# Patterns for common PII types
PII_PATTERNS = [
    (re.compile(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+"), "[EMAIL_REDACTED]"),
    (re.compile(r"(\+49|0049|0)\s?\d{2,4}[\s/-]?\d{3,8}"), "[PHONE_REDACTED]"),
    (re.compile(r"\+\d{1,3}\s?\d{4,14}"), "[PHONE_REDACTED]"),
    (re.compile(r"\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b"), "[IP_REDACTED]"),
    (re.compile(r"\bDE\d{2}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{2}\b"), "[IBAN_REDACTED]"),
    (re.compile(r"\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b"), "[CC_REDACTED]"),
    (re.compile(r"\b\d{2}\s?\d{6}\s?[A-Z]\s?\d{3}\b"), "[SSN_REDACTED]"),
    (re.compile(r"\b[a-f0-9]{32,}\b", re.IGNORECASE), "[TOKEN_REDACTED]"),
    (re.compile(r"eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+"), "[JWT_REDACTED]"),
    (re.compile(r"sbp_[a-zA-Z0-9]{40,}"), "[SUPABASE_KEY_REDACTED]"),
    (re.compile(r"sk-(?:proj-|ant-|live-)?[a-zA-Z0-9_\-]{20,}"), "[AI_API_KEY_REDACTED]"),
    (re.compile(r"(?:api[_-]?key|secret|token|password)\s*[:=]\s*['\"]?[\w\-\.]{8,}['\"]?", re.IGNORECASE), "[SECRET_REDACTED]"),
]

def scrub_pii(text: str) -> str:
    """Remove PII from text before storing in external systems."""
    scrubbed = text
    for pattern, replacement in PII_PATTERNS:
        scrubbed = pattern.sub(replacement, scrubbed)
    return scrubbed

# ---------------------------------------------------------------------------
# Doc Chunker (for Context7 responses)
# ---------------------------------------------------------------------------
def chunk_docs(text: str, max_tokens: int = CONTEXT7_MAX_TOKENS) -> str:
    """Truncate documentation to approximately max_tokens."""
    max_chars = max_tokens * 4
    if len(text) <= max_chars:
        return text

    truncated = text[:max_chars]
    last_period = truncated.rfind(".")
    last_newline = truncated.rfind("\n")
    break_point = max(last_period, last_newline)

    if break_point > max_chars * 0.5:
        truncated = text[: break_point + 1]
    else:
        truncated = text[:max_chars]

    return truncated + "\n\n[... truncated by Antigravity Gateway — use more specific query for details]"

# ---------------------------------------------------------------------------
# Context7 Bridge (via subprocess → npx @upstash/context7-mcp)
# ---------------------------------------------------------------------------
class Context7Query(BaseModel):
    library: str
    query: str
    max_tokens: Optional[int] = CONTEXT7_MAX_TOKENS

class Context7Response(BaseModel):
    library: str
    query: str
    documentation: str
    truncated: bool
    source: str = "context7"

async def query_context7(library: str, query: str, max_tokens: int) -> str:
    process = None
    process2 = None
    try:
        resolve_cmd = json.dumps({
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/call",
            "params": {"name": "resolve-library-id", "arguments": {"libraryName": library}}
        })

        process = await asyncio.create_subprocess_exec(
            "npx", "-y", "@upstash/context7-mcp",
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await asyncio.wait_for(process.communicate(input=resolve_cmd.encode()), timeout=30)

        if process.returncode != 0:
            logger.warning(f"Context7 resolve failed: {stderr.decode()}")
            return f"Context7 unavailable for '{library}'. Error: {stderr.decode()[:200]}"

        response = json.loads(stdout.decode())
        library_id = None
        if "result" in response and "content" in response["result"]:
            for content in response["result"]["content"]:
                if content.get("type") == "text":
                    text = content["text"]
                    lines = text.strip().split("\n")
                    for line in lines:
                        if "/" in line:
                            library_id = line.strip().split(" ")[0] if " " in line else line.strip()
                            break

        if not library_id:
            return f"Library '{library}' not found in Context7 registry."

        docs_cmd = json.dumps({
            "jsonrpc": "2.0",
            "id": 2,
            "method": "tools/call",
            "params": {
                "name": "get-library-docs",
                "arguments": {"context7CompatibleLibraryID": library_id, "topic": query, "tokens": max_tokens}
            }
        })

        process2 = await asyncio.create_subprocess_exec(
            "npx", "-y", "@upstash/context7-mcp",
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout2, stderr2 = await asyncio.wait_for(process2.communicate(input=docs_cmd.encode()), timeout=30)

        if process2.returncode != 0:
            return f"Context7 docs fetch failed: {stderr2.decode()[:200]}"

        docs_response = json.loads(stdout2.decode())
        docs_text = ""
        if "result" in docs_response and "content" in docs_response["result"]:
            for content in docs_response["result"]["content"]:
                if content.get("type") == "text":
                    docs_text += content["text"]

        return docs_text if docs_text else f"No documentation found for '{query}' in '{library}'."

    except asyncio.TimeoutError:
        try:
            if process and process.returncode is None:
                process.kill()
                await process.wait()
            if process2 and process2.returncode is None:
                process2.kill()
                await process2.wait()
        except OSError:
            pass
        return f"Context7 query timed out for '{library}:{query}'"
    except FileNotFoundError:
        return "Context7 MCP not installed. Run: npm install -g @upstash/context7-mcp"
    except Exception as e:
        logger.error(f"Context7 error: {e}")
        return f"Context7 error: {str(e)}"

# ---------------------------------------------------------------------------
# FastAPI Application
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown lifecycle."""
    logger.info("🚀 Antigravity MCP Gateway starting...")
    logger.info(f"   Context7 max_tokens: {CONTEXT7_MAX_TOKENS}")
    logger.info(f"   PII Scrubber: ACTIVE (DIRECTIVE-002)")
    yield
    logger.info("🛑 Antigravity MCP Gateway shutting down.")

app = FastAPI(
    title="Antigravity MCP Gateway",
    description="Context7 (Live Docs) proxy. Built for the Antigravity AI Factory.",
    version="1.1.0",
    lifespan=lifespan,
)

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "gateway": "antigravity-mcp-gateway",
        "version": "1.1.0",
        "services": {
            "context7": "available (npx)",
            "pii_scrubber": "active",
        },
    }

@app.post("/context7/query", response_model=Context7Response)
async def context7_query(req: Context7Query):
    logger.info(f"Context7 query: {req.library} → '{req.query}' (max {req.max_tokens} tokens)")
    raw_docs = await query_context7(req.library, req.query, req.max_tokens or CONTEXT7_MAX_TOKENS)
    chunked = chunk_docs(raw_docs, req.max_tokens or CONTEXT7_MAX_TOKENS)
    return Context7Response(
        library=req.library,
        query=req.query,
        documentation=chunked,
        truncated=len(chunked) < len(raw_docs),
    )

@app.post("/utils/scrub")
async def test_scrub(text: str):
    return {
        "original": text,
        "scrubbed": scrub_pii(text),
        "pii_found": scrub_pii(text) != text,
    }

# ---------------------------------------------------------------------------
# Dashboard — Workspace & Memory Status
# ---------------------------------------------------------------------------
WORKSPACES = {
    "Antigravity (Root)": Path.home() / "Developer" / "Antigravity",
    "The Swarm": Path.home() / "Developer" / "TheSwarm",
    "ARES App": Path.home() / "Developer" / "[SOURCE_WORKSPACE]",
    "ARES Website": Path.home() / "Developer" / "[SOURCE_WORKSPACE]",
    "NOUS Bridge": Path.home() / "Developer" / "nous-bridge",
}

MEMORY_BANK_FILES = [
    "activeContext.md", "progress.md", "projectbrief.md",
    "productContext.md", "systemPatterns.md", "techContext.md",
    "sessionLog.md", "README.md",
]

GATEWAY_FILES = ["gateway.py", "start.py", ".env", "requirements.txt"]
WORKFLOW_FILES = ["start-gateway.md", "update-memory.md"]

def _scan_workspace(name: str, path: Path) -> dict:
    result = {
        "name": name,
        "path": str(path),
        "exists": path.exists(),
        "memory_bank": {},
        "gateway": {},
        "workflows": {},
        "boot_layers": {"layer_0": False, "layer_05": False, "layer_075": False},
    }
    if not path.exists():
        return result

    mb = path / "memory-bank"
    for f in MEMORY_BANK_FILES:
        fp = mb / f
        if fp.exists():
            stat = fp.stat()
            try:
                preview = fp.read_text(encoding="utf-8")[:200].replace("\n", " ").strip()
            except Exception:
                preview = ""
            result["memory_bank"][f] = {
                "exists": True, "size": stat.st_size,
                "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                "preview": preview,
            }
        else:
            result["memory_bank"][f] = {"exists": False}

    gw = path / "scripts" / "mcp-gateway"
    for f in GATEWAY_FILES:
        fp = gw / f
        result["gateway"][f] = {
            "exists": fp.exists(),
            "size": fp.stat().st_size if fp.exists() else 0,
        }

    wf_dirs = [path / ".agents" / "workflows", path / ".antigravity" / "workflows"]
    for wf_file in WORKFLOW_FILES:
        result["workflows"][wf_file] = any((d / wf_file).exists() for d in wf_dirs)

    sp = path / ".antigravity" / "system-prompt.md"
    if sp.exists():
        try:
            content = sp.read_text(encoding="utf-8")
            result["boot_layers"]["layer_0"] = "Layer 0" in content or "NOUS" in content
            result["boot_layers"]["layer_05"] = "Layer 0.5" in content or "memory-bank" in content
            result["boot_layers"]["layer_075"] = "Layer 0.75" in content or "9090" in content
        except Exception:
            pass

    return result

@app.get("/api/workspaces")
async def api_workspaces():
    return {
        "gateway_version": "1.1.0",
        "timestamp": datetime.now().isoformat(),
        "workspaces": [_scan_workspace(name, path) for name, path in WORKSPACES.items()],
    }

@app.get("/api/file-content")
async def api_file_content(workspace: str, file: str, type: str = "memory"):
    if workspace not in WORKSPACES:
        raise HTTPException(status_code=404, detail=f"Workspace '{workspace}' not found")
    ws_path = WORKSPACES[workspace]
    
    if type == "memory": fp = ws_path / "memory-bank" / file
    elif type == "gateway": fp = ws_path / "scripts" / "mcp-gateway" / file
    else: raise HTTPException(status_code=400, detail="type must be 'memory' or 'gateway'")

    if not fp.exists():
        raise HTTPException(status_code=404, detail=f"File not found: {file}")

    try:
        fp.resolve().relative_to(ws_path.resolve())
    except ValueError:
        raise HTTPException(status_code=403, detail="Access denied")

    stat = fp.stat()
    content = fp.read_text(encoding="utf-8")

    if file in (".env",):
        content = scrub_pii(content)

    return {
        "workspace": workspace, "file": file, "type": type, "content": content,
        "size": stat.st_size, "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
    }

@app.get("/api/gateway-log")
async def api_gateway_log(lines: int = 100):
    log_path = Path("/tmp/gateway.log")
    if not log_path.exists():
        return {"log": "(no gateway log found)", "lines": 0, "total_lines": 0}
    
    try:
        process = await asyncio.create_subprocess_exec(
            "tail", "-n", str(lines), str(log_path),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, _ = await process.communicate()
        
        wc_process = await asyncio.create_subprocess_exec(
            "wc", "-l", str(log_path),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        wc_stdout, _ = await wc_process.communicate()
        
        tail_text = stdout.decode("utf-8", errors="replace").strip()
        tail_lines = tail_text.split("\n") if tail_text else []
        
        try:
            total_lines = int(wc_stdout.decode("utf-8").strip().split()[0])
        except (ValueError, IndexError):
            total_lines = len(tail_lines)
            
        return {"log": "\n".join(tail_lines), "lines": len(tail_lines), "total_lines": total_lines}
    except Exception as e:
        logger.error(f"Failed to tail log: {e}")
        return {"log": f"(error reading log: {e})", "lines": 0, "total_lines": 0}

# Minified HTML without Mem0 sections
DASHBOARD_HTML = """<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Antigravity — Memory Dashboard</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
:root{--bg:#0a0a0f;--card:#12121a;--card-border:#1e1e2e;--accent:#7c3aed;--accent-glow:rgba(124,58,237,0.3);--green:#10b981;--yellow:#f59e0b;--red:#ef4444;--text:#e2e8f0;--text-dim:#64748b;--glass:rgba(18,18,26,0.8)}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',system-ui,sans-serif;background:var(--bg);color:var(--text);min-height:100vh;overflow-x:hidden}
.bg-grid{position:fixed;inset:0;background-image:radial-gradient(circle at 1px 1px,rgba(124,58,237,0.08) 1px,transparent 0);background-size:40px 40px;pointer-events:none;z-index:0}
.container{position:relative;z-index:1;max-width:1400px;margin:0 auto;padding:2rem}
header{text-align:center;margin-bottom:2rem}
header h1{font-size:2.5rem;font-weight:700;background:linear-gradient(135deg,#7c3aed,#06b6d4);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:.5rem}
header p{color:var(--text-dim);font-size:1rem}
.tabs{display:flex;gap:8px;justify-content:center;margin-bottom:2rem}
.tab{padding:8px 20px;border-radius:10px;font-size:.85rem;font-weight:600;cursor:pointer;border:1px solid var(--card-border);background:var(--glass);color:var(--text-dim);transition:all .2s}
.tab.active,.tab:hover{color:var(--accent);border-color:var(--accent);background:rgba(124,58,237,0.08)}
.tab-content{display:none}.tab-content.active{display:block}
.stats-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;margin-bottom:2rem}
.stat-card{background:var(--glass);backdrop-filter:blur(12px);border:1px solid var(--card-border);border-radius:16px;padding:1.5rem;text-align:center;transition:transform .2s,box-shadow .2s}
.stat-card:hover{transform:translateY(-2px);box-shadow:0 8px 32px var(--accent-glow)}
.stat-value{font-size:2.5rem;font-weight:700;color:var(--accent)}
.stat-value.green{color:var(--green)}
.stat-label{font-size:.85rem;color:var(--text-dim);margin-top:4px;text-transform:uppercase;letter-spacing:.05em}
.workspaces{display:grid;grid-template-columns:repeat(auto-fit,minmax(380px,1fr));gap:1.5rem}
.ws-card{background:var(--glass);backdrop-filter:blur(12px);border:1px solid var(--card-border);border-radius:16px;padding:1.5rem;transition:transform .2s,box-shadow .2s}
.ws-card:hover{transform:translateY(-2px);box-shadow:0 8px 32px var(--accent-glow)}
.ws-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem}
.ws-name{font-size:1.25rem;font-weight:600}
.ws-path{font-size:.7rem;color:var(--text-dim);font-family:monospace}
.badge{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:999px;font-size:.7rem;font-weight:600;text-transform:uppercase}
.badge.ok{background:rgba(16,185,129,0.15);color:var(--green);border:1px solid rgba(16,185,129,0.3)}
.badge.warn{background:rgba(245,158,11,0.15);color:var(--yellow);border:1px solid rgba(245,158,11,0.3)}
.badge.err{background:rgba(239,68,68,0.15);color:var(--red);border:1px solid rgba(239,68,68,0.3)}
.section-title{font-size:.75rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:.08em;margin:1rem 0 .5rem;padding-bottom:4px;border-bottom:1px solid var(--card-border)}
.file-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
.file-dot{width:100%;aspect-ratio:1;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:.55rem;font-weight:500;text-align:center;line-height:1.1;padding:2px;transition:all .15s;cursor:pointer}
.file-dot:hover{transform:scale(1.1);box-shadow:0 0 12px var(--accent-glow)}
.file-dot.ok{background:rgba(16,185,129,0.15);color:var(--green);border:1px solid rgba(16,185,129,0.2)}
.file-dot.ok:hover{background:rgba(16,185,129,0.25);border-color:var(--green)}
.file-dot.miss{background:rgba(239,68,68,0.08);color:var(--red);border:1px dashed rgba(239,68,68,0.3);cursor:default}
.layer-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}
.layer{padding:3px 10px;border-radius:6px;font-size:.65rem;font-weight:600}
.layer.on{background:rgba(16,185,129,0.12);color:var(--green);border:1px solid rgba(16,185,129,0.25)}
.layer.off{background:rgba(239,68,68,0.08);color:var(--red);border:1px dashed rgba(239,68,68,0.2)}
.loading{text-align:center;padding:4rem;color:var(--text-dim)}
.loading .spinner{width:40px;height:40px;border:3px solid var(--card-border);border-top-color:var(--accent);border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 1rem}
@keyframes spin{to{transform:rotate(360deg)}}
.pulse{animation:pulse 2s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
/* Modal */
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(8px);z-index:100;display:none;align-items:center;justify-content:center;padding:2rem}
.modal-overlay.open{display:flex}
.modal{background:var(--card);border:1px solid var(--card-border);border-radius:16px;width:90%;max-width:800px;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 24px 64px rgba(0,0,0,0.5)}
.modal-header{display:flex;align-items:center;justify-content:space-between;padding:1.25rem 1.5rem;border-bottom:1px solid var(--card-border)}
.modal-close{cursor:pointer;background:transparent;border:0;color:#fff;font-size:1.5rem}
.modal-body{padding:1.5rem;overflow-y:auto;flex:1}
.modal-body pre{font-family:'JetBrains Mono',monospace;font-size:.8rem;line-height:1.6;white-space:pre-wrap;color:var(--text)}
/* Log viewer */
.log-viewer{background:var(--card);border:1px solid var(--card-border);border-radius:16px;padding:1.5rem;margin-top:1rem}
.log-content{font-family:'JetBrains Mono',monospace;font-size:.7rem;line-height:1.5;white-space:pre-wrap;max-height:400px;overflow-y:auto;color:var(--text-dim);background:rgba(0,0,0,0.3);border-radius:8px;padding:1rem}
</style>
</head>
<body>
<div class="bg-grid"></div>
<div class="modal-overlay" id="modal" onclick="if(event.target===this)closeModal()">
  <div class="modal">
    <div class="modal-header">
      <div><div class="modal-title" id="modal-title">Loading...</div><div class="modal-meta" id="modal-meta"></div></div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body" id="modal-body"><pre>Loading...</pre></div>
  </div>
</div>
<div class="container">
  <header>
    <h1>⬡ Antigravity MCP Gateway</h1>
    <p>Context7 Live Docs & Workspace Monitor</p>
  </header>
  <div class="tabs">
    <div class="tab active" onclick="switchTab('overview')">📊 Overview</div>
    <div class="tab" onclick="switchTab('log')">📋 Gateway Log</div>
  </div>
  <div id="tab-overview" class="tab-content active">
    <div id="app"><div class="loading"><div class="spinner"></div><p class="pulse">Scanning workspaces...</p></div></div>
  </div>
  <div id="tab-log" class="tab-content">
    <div class="log-viewer"><h2>📋 Gateway Log (last 100 lines)</h2><div class="log-content" id="log-content">Loading...</div></div>
  </div>
</div>
<script>
function switchTab(name){
  document.querySelectorAll('.tab').forEach((t,i)=>t.classList.toggle('active',['overview','log'][i]===name));
  document.querySelectorAll('.tab-content').forEach(c=>c.classList.remove('active'));
  document.getElementById('tab-'+name).classList.add('active');
  if(name==='log')loadLog();
}
async function loadLog(){
  const r=await fetch('/api/gateway-log?lines=100');
  const d=await r.json();
  const el=document.getElementById('log-content');
  el.innerHTML=d.log;
  el.scrollTop=el.scrollHeight;
}
async function openFile(workspace,file,type){
  const modal=document.getElementById('modal');
  document.getElementById('modal-title').textContent=file;
  document.getElementById('modal-meta').textContent='Loading...';
  document.getElementById('modal-body').innerHTML='<pre>Loading...</pre>';
  modal.classList.add('open');
  try{
    const r=await fetch(`/api/file-content?workspace=${encodeURIComponent(workspace)}&file=${encodeURIComponent(file)}&type=${type}`);
    const d=await r.json();
    document.getElementById('modal-title').textContent=`${file} — ${workspace}`;
    const kb=(d.size/1024).toFixed(1);
    const mod=new Date(d.modified).toLocaleString('de-DE');
    document.getElementById('modal-meta').textContent=`${kb} KB • ${mod}`;
    document.getElementById('modal-body').innerHTML='<pre>'+d.content.replace(/</g,'&lt;').replace(/>/g,'&gt;')+'</pre>';
  }catch(e){
    document.getElementById('modal-body').innerHTML='<pre style="color:var(--red)">Error: '+e.message+'</pre>';
  }
}
function closeModal(){document.getElementById('modal').classList.remove('open')}
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});

async function load(){
  const r=await fetch('/api/workspaces');
  const d=await r.json();
  const app=document.getElementById('app');
  let html='<div class="stats-row"><div class="stat-card"><div class="stat-value green">'+d.workspaces.length+'</div><div class="stat-label">Workspaces</div></div></div><div class="workspaces">';
  d.workspaces.forEach((w,idx)=>{
    const mbCount=Object.values(w.memory_bank).filter(f=>f.exists).length;
    const gwCount=Object.values(w.gateway).filter(f=>f.exists).length;
    const layerCount=Object.values(w.boot_layers).filter(Boolean).length;
    const status=mbCount===8&&layerCount===3?'ok':mbCount>0?'warn':'err';
    const statusText=status==='ok'?'●':status==='warn'?'◐':'○';
    html+=`<div class="ws-card">
      <div class="ws-header">
        <div><div class="ws-name">${w.name}</div><div class="ws-path">${w.path}</div></div>
        <span class="badge ${status}">${statusText}</span>
      </div>
      <div class="section-title">Memory Bank (${mbCount}/8)</div>
      <div class="file-grid">`;
    for(const[f,info]of Object.entries(w.memory_bank)){
      const label=f.replace('.md','');
      if(info.exists){ html+=`<div class="file-dot ok" onclick="openFile('${w.name}','${f}','memory')">${label}</div>`; }
      else{ html+=`<div class="file-dot miss">${label}</div>`; }
    }
    html+=`</div><div class="section-title">Gateway (${gwCount}/4)</div><div class="file-grid">`;
    for(const[f,info]of Object.entries(w.gateway)){
      if(info.exists){ html+=`<div class="file-dot ok" onclick="openFile('${w.name}','${f}','gateway')">${f}</div>`; }
      else{ html+=`<div class="file-dot miss">${f}</div>`; }
    }
    html+=`</div><div class="section-title">Boot Layers</div><div class="layer-row">`;
    html+=`<span class="layer ${w.boot_layers.layer_0?'on':'off'}">L0 NOUS</span>`;
    html+=`<span class="layer ${w.boot_layers.layer_05?'on':'off'}">L0.5 Memory</span>`;
    html+=`<span class="layer ${w.boot_layers.layer_075?'on':'off'}">L0.75 Gateway</span>`;
    html+=`</div><div class="section-title">Workflows</div><div class="layer-row">`;
    for(const[f,ok]of Object.entries(w.workflows)){ html+=`<span class="layer ${ok?'on':'off'}">${f.replace('.md','')}</span>`; }
    html+=`</div></div>`;
  });
  html+=`</div>`;
  app.innerHTML=html;
}
load();
setInterval(load,30000);
</script>
</body>
</html>"""

@app.get("/dashboard", response_class=HTMLResponse)
async def dashboard():
    return DASHBOARD_HTML

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("gateway:app", host="0.0.0.0", port=GATEWAY_PORT, reload=True, log_level=LOG_LEVEL.lower())
