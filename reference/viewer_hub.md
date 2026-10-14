# Let other programs drive the 3D viewers

A viewer can join a small hub that runs on this computer; R, `Python` or
AI agents then send commands to the viewer through the hub and read back
what it shows. These functions start, list and stop hubs. The hub is a
`Node.js` program (version 18 or newer) that comes with this package;
`viewer_hub_path()` gives its location.

## Usage

``` r
viewer_hub_path()

viewer_hub_start(
  port = 17285L,
  key = NULL,
  generate_key = FALSE,
  idle_minutes = 30
)

viewer_hub_list(port = 17285L)

viewer_hub_stop(port = 17285L)
```

## Arguments

- port:

  the port of the hub; default is `17285`

- key:

  a key that the hub requires (letters, digits, `"_"` and `"-"`), or
  `NULL` for none

- generate_key:

  whether the hub requires a random key; ignored when `key` is given

- idle_minutes:

  the hub stops after this many minutes with nothing connected; `0`
  keeps it running

## Value

`viewer_hub_path()`: the path of the hub script. `viewer_hub_start()`:
the `passkey`, invisibly. `viewer_hub_list()`: a data frame of the
running hubs, with columns `port`, `passkey` (`NA` when the key is
unknown), `keyed`, `viewers`, `by` (who started it) and `started`.
`viewer_hub_stop()`: nothing.

## Details

`viewer_hub_start()` reuses the hub that already runs on `port`, or
starts one in the background. It returns the hub's `passkey`: the port,
or `"port.key"` when the hub requires a key, and stores it in
`options(threeBrain.remote_passkey)`, so viewers made afterwards show it
in their `"Passkey"` field. To connect a viewer, click `"Connect"` below
that field in its control panel; a viewer never connects by itself.

Without a key, any program or web page on this computer can connect to
the hub; set `generate_key = TRUE` (or `key`) when that matters. The hub
only listens on `127.0.0.1`, so other computers cannot reach it.

Running hubs are recorded in `tools::R_user_dir("threeBrain", "cache")`,
where other programs and AI agents find and join them. To let an agent
drive the viewers, register the hub's `MCP` mode once, for example with
`Claude Code`:

    claude mcp add threebrain -- node /path/to/threebrain-hub.mjs mcp

where the path is `viewer_hub_path()`. The examples in the package
repository (`examples/WebSocket`) show how `R` and `Python` scripts send
commands.

The hub itself does not need R. Collaborators who received a viewer
saved with
[`save_brain`](https://dipterix.org/threeBrain/reference/save_brain.md)
run the same file through an agent plugin (`examples/mcp` in the package
repository); their agent starts the hub and gives them the `passkey`.

## Examples

``` r
if (FALSE) { # \dontrun{

passkey <- viewer_hub_start()

brain <- threeBrain(
  path = file.path(default_template_directory(), "N27"),
  subject_code = "N27", surface_types = "pial"
)
# In the viewer's control panel, click "Connect"
brain$plot()

viewer_hub_list()
viewer_hub_stop()
} # }
```
