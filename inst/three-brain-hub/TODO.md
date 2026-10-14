# TODO

## Publish the hub to npm for `npx` (deferred)

Today the hub reaches people without R as one file in the agent plugin (see
`examples/mcp/README.md`). On npm, terminal users and other agent apps could
also run it with `npx`:

```sh
npx -y @rave-ieeg/three-brain-hub serve
claude mcp add threebrain -- npx -y @rave-ieeg/three-brain-hub mcp
```

Deferred because most users do not use terminals: installing Node.js once is
fine, but starting an agent from a terminal is not.

To publish:

1. `package.json`:
   - `"bin": { "threebrain-hub": "dist/threebrain-hub.mjs" }`. Today it points at
     `src/cli.js`, which needs `ws` installed.
   - Move `ws` to `devDependencies`. The bundle includes it, so the published
     package has no runtime dependencies.
   - `"files": ["dist", "README.md"]`.
   - `"prepublishOnly": "npm run build && npm test"`.
2. A `README.md` for npm: the commands (`serve`, `list`, `stop`, `mcp`), the
   passkey, and the MCP line.
3. Check it without the registry: `npm pack`, install the tarball into an empty
   folder, then run `node_modules/.bin/threebrain-hub --help`, `list`, and an MCP
   session (`hub_status`, `start_hub`).
4. `npm publish --access public`, in the `@rave-ieeg` scope.
5. On Windows, agent apps start it with `cmd /c npx -y @rave-ieeg/three-brain-hub mcp`.
6. Keep protocol 1 compatible, so that viewers saved earlier still connect to
   newer hubs.
