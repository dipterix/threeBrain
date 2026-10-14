# The agent plugin: what to copy

The `threebrain` MCP server lets AI agents drive 3D viewers that are open in a
user's browser. It needs only [Node.js](https://nodejs.org/), not R or
`threeBrain`. Someone who received a viewer saved with `save_brain()` can open
the file, and their agent can start a hub and drive the viewer.

## Files for the plugin repository

| From this repository | In the plugin |
|---|---|
| `inst/three-brain-hub/dist/threebrain-hub.mjs` | `threebrain-hub.mjs` |
| `inst/three-brain-hub/dist/threebrain-hub.mjs.LICENSE.txt` | `threebrain-hub.mjs.LICENSE.txt` |
| `examples/mcp/skill.md` | `skills/rave-3d-viewer/SKILL.md` |

`threebrain-hub.mjs` is one file with everything included (no `node_modules`).
The root `build.sh` rebuilds it.

The plugin's `.mcp.json`:

```json
{
  "mcpServers": {
    "threebrain": {
      "command": "node",
      "args": ["${CLAUDE_PLUGIN_ROOT}/threebrain-hub.mjs", "mcp"]
    }
  }
}
```

## What a collaborator does

1. Once: install Node.js 18 or newer with the installer from
   [nodejs.org](https://nodejs.org/) (the LTS version), then add the plugin in
   the agent app's plugin settings.
2. Open the viewer in a browser, for example the `.html` file they received.
3. Ask the agent about the viewer. The agent starts a hub when none is running
   and gives them a passkey (`17285` by default). In the viewer's control panel
   (the **Default** folder at the top), they enter it in **Passkey** and click
   **Connect**.

No terminal is needed. A viewer never connects by itself, not even when the
same page is opened again: a person clicks **Connect**. After the first
connection, **Auto-connect** (checked) brings the viewer back when its hub
restarts with the same passkey. Agents can also stop a hub (`stop_hub`) and
remove one viewer (`disconnect_viewer`).

## Other ways to run the same hub

- **R** with `threeBrain`: `viewer_hub_start()` starts the hub (or reuses the
  running one) and puts its passkey in the **Passkey** field of new viewers.
  `viewer_hub_path()` gives the file.
- **A terminal**: `node threebrain-hub.mjs serve` starts a hub;
  `claude mcp add threebrain -- node /path/to/threebrain-hub.mjs mcp` registers
  the MCP server with Claude Code.
- **Not yet**: `npx`; see `inst/three-brain-hub/TODO.md`.

All of these share the running hubs: each hub is recorded on the computer, so an
agent finds and joins a hub that R or a terminal started, and the other way
round.

## Compatibility

Viewers and hubs speak protocol 1. Viewers saved earlier keep working with newer
hubs as long as the protocol stays at 1.
