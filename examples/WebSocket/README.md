# Drive the 3D viewer from other programs

A `threeBrain` viewer can join a small *hub* that runs on your computer. Other
programs on the same computer (R, Python, MATLAB, an AI agent) then send
commands to the viewer through the hub and read back what it shows. The viewer
page itself can come from anywhere: a saved `.html` file, the RStudio viewer, a
local or remote Shiny/RAVE app. Only the browser has to run on the same
computer as the hub.

```
browser (viewer page) ──┐
                        ├── ws://127.0.0.1:17285 ── hub ── R / Python / agent
another viewer page   ──┘
```

## 1. Start the hub

The hub needs [Node.js](https://nodejs.org/) 18 or newer.

```sh
node inst/three-brain-hub/dist/threebrain-hub.mjs serve
# threeBrain hub listening on 127.0.0.1:17285 (passkey: 17285)
```

In this repository, build the bundle first with
`cd inst/three-brain-hub && npm install && npm run build`. The installed R
package carries the same bundle:

```r
hub_script <- system.file("three-brain-hub", "dist", "threebrain-hub.mjs", package = "threeBrain")
system2("node", c(shQuote(hub_script), "serve", "--detach"))
```

| Option | What it does |
|---|---|
| `--port 17285` | the port (17285 by default) |
| `--key KEY` / `--generate-key` | require a key; the passkey becomes `17285.KEY` |
| `--idle-minutes 30` | stop after 30 minutes with nothing connected (`0`: never) |
| `--detach` | run in the background and return once the hub listens |

`node threebrain-hub.mjs stop` stops it. The hub listens on `127.0.0.1` only,
so other computers cannot reach it. Without a key, any program or web page on
this computer can connect; use `--key` or `--generate-key` when that matters.

## 2. Connect a viewer

Any viewer works. The examples below expect this demo (the `N27` template,
`threeBrain::download_N27()`, with eight contacts):

```r
library(threeBrain)
brain <- threeBrain(
  path = file.path(default_template_directory(), "N27"),
  subject_code = "N27", surface_types = "pial"
)
brain$set_electrodes(data.frame(
  Electrode = 1:8,
  Coord_x = c(-45, -50, -55, -60, 45, 50, 55, 60), Coord_y = -10, Coord_z = 15,
  Label = c(sprintf("LA%d", 1:4), sprintf("RA%d", 1:4)), Radius = 2
))
brain$plot()
```

In the viewer's control panel (the **Default** folder at the top), check
that **Passkey** shows the hub's passkey (`17285`, or `17285.KEY` with a key)
and click **Connect**. **Remote Connection Status** says whether it worked. A
viewer never connects by itself. After the first
connection, an **Auto-connect** box appears (checked): the viewer then
reconnects when the hub restarts, and connects on its own the next time a page
from the same site opens.

## 3. Send commands

| Folder | Files |
|---|---|
| [`R/`](R) | `hub_client.R` (a small client), `drive_viewer.R`, `watch_clicks.R` |
| [`Python/`](Python) | `hub_client.py` (a small client), `drive_viewer.py`, `watch_clicks.py` |

```sh
cd examples/WebSocket/R
Rscript drive_viewer.R      # background, camera, panel, electrode values, screenshot
Rscript watch_clicks.R      # prints what you click in the viewer

cd examples/WebSocket/Python
pip install -r requirements.txt
python drive_viewer.py
python watch_clicks.py
```

Set `THREEBRAIN_PASSKEY` (for example `17285.KEY`) when the hub uses another
port or a key. AI agents use the hub's MCP mode instead; see
[`../mcp/skill.md`](../mcp/skill.md).

## Protocol

Every message is one JSON object in a WebSocket text frame. A controller first
introduces itself, then sends requests with an `id` of its choosing; each
request gets one `result` with the same `id`.

```jsonc
{"type": "hello", "protocol": 1, "role": "controller", "name": "my script"}   // "key": "KEY" when the hub has one
{"type": "welcome", "protocol": 1, "id": "c1", "hub": {"port": 17285, "keyed": false, ...}}

{"type": "list", "id": "1"}
{"type": "result", "id": "1", "ok": true, "value": [{"id": "v1", "title": "...", "subjects": ["N27"], ...}]}

{"type": "command", "id": "2", "target": "v1", "name": "background", "value": "#000000"}
{"type": "result", "id": "2", "ok": true, "value": null}
{"type": "result", "id": "3", "ok": false, "error": {"code": "unknown_command", "message": "..."}}

{"type": "subscribe", "id": "4", "targets": "*", "names": ["mouse_clicked"]}
{"type": "event", "source": "v1", "name": "mouse_clicked", "value": {...}, "time": 1791869579050}
```

| Request | Answer |
|---|---|
| `list` | the connected viewers |
| `command` (`target`, `name`, `value`) | the viewer's result |
| `subscribe` (`targets`, `names`: lists or `"*"`) | then `event` messages for those viewers and names |
| `hub` with `op`: `status`, `events`, `set_key` (`key` or `generate: true`), `shutdown` | hub status, the last 50 events per viewer, the new passkey |

The hub also sends `viewer_joined` and `viewer_left` notices to controllers.

**Commands.** The names and values are the ones R's `brain_proxy()` sends in
Shiny. The `describe` command lists them with short descriptions.

| Command | Value |
|---|---|
| `background` | a color, `"#000000"` |
| `title` | text shown over the viewer |
| `zoom_level` | a number > 0 |
| `camera` | `{"position": [x, y, z], "up": [x, y, z]}` |
| `controllers` | `{"<control panel name>": value, ...}`, any panel setting |
| `display_data` | `{"variable": "name", "range": [min, max]}` |
| `set_electrode_data` | `{"data": {"Electrode": [...], "Subject": [...], "<variable>": [...]}, "updateDisplay": true}` |
| `set_electrode_palette` | `{"colors": [...], "name": "variable"}` |
| `focused_electrode` | `{"subject_code": "N27", "electrode": 3}` |
| `set_plane` | `{"x": 0, "y": 0, "z": 0}`, the slice crosshair (`tkrRAS`, mm) |
| `font_magnification` | a number |
| `text_decoration_set` / `text_decoration_delete` | `{"id": "label1", "text": "...", "position": [x, y, z]}` / `{"id": "label1"}` |
| `describe` | the list of commands |
| `get_state` | control panel values, slice crosshair, camera, current subject |
| `get_input` | `{"name": "controllers"}`; also `controller_specs`, `main_camera`, `current_subject`, `mouse_clicked`, ... |
| `capture` | `{"timeout_ms": 5000}` → PNG data URLs `{"dataURI", "views"}`, as the user sees the viewer |

Commands that edit electrode localization (`clear_localization`,
`add_localization_electrode`, `set_localization_electrode`) or object transforms
(`set_matrix_world`) change the user's work.

**Events** carry the names of the Shiny inputs: `mouse_clicked`,
`mouse_dblclicked`, `controllers`, `controller_specs`, `main_camera`,
`current_subject`, `canvas_state`, `localization_table`, ...

**Errors** (`error.code`): `unknown_viewer`, `unknown_command`, `bad_value`,
`exception`, `hidden` (the viewer's tab is in the background, so it does not
draw), `timeout`, `viewer_left`.

## Browsers

The connection always goes to `127.0.0.1`. Whether the browser allows it
depends on where the viewer page came from:

- **No prompt:** `file://` pages, pages from this computer
  (`http://127.0.0.1:...`, RStudio Desktop, a local Shiny app), and pages from
  intranet servers (on `https` intranet servers, not in Safari).
- **Public https servers:** Chrome and Firefox ask once whether the site may
  reach this device.
- **Public plain-http servers:** Chrome blocks the connection.
- **Safari:** blocks the connection from every `https` page.
