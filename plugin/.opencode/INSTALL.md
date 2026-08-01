# Installing Caserne for OpenCode

## Prerequisites

- [OpenCode](https://opencode.ai) installed
- `caserne-mcp` available in your PATH
- A Caserne agent ID

## Installation

Add Caserne to the `plugin` array in your `opencode.json` (global or project-level):

```json
{
  "plugin": ["caserne@git+https://github.com/eRom/erom-caserne.git"]
}
```

Restart OpenCode. The plugin auto-registers all 6 skills and the MCP server.

## Configuration

Set your Caserne identity:

```bash
export CASERNE_AGENT_ID=ton-agent-id
```

The plugin reads `CASERNE_AGENT_ID` from the environment automatically.

## Verify

Ask OpenCode:

```
Charge la skill control
Puis : caserne__whoami
```

You should see your Caserne identity.

## Clone alternative

If you prefer cloning over the git plugin install:

```bash
git clone https://github.com/eRom/erom-caserne.git .caserne
ln -s .caserne/.opencode .opencode
ln -s .caserne/opencode.json opencode.json
ln -s .caserne/AGENTS.md AGENTS.md
```

Then configure `CASERNE_AGENT_ID` and restart OpenCode.

## Updating

Restart OpenCode. OpenCode's plugin manager picks up new versions automatically.

To pin a specific version:

```json
{
  "plugin": ["caserne@git+https://github.com/eRom/erom-caserne.git#v3.0.0"]
}
```

## Troubleshooting

- Check logs: `opencode run --print-logs "hello" 2>&1 | grep -i caserne`
- Ensure `caserne-mcp` is in your PATH
- Ensure `CASERNE_AGENT_ID` is set
