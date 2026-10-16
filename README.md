# Ganter Lab MCP

Connect Claude, Codex or any assistant with MCP to **Ganter Lab**, the SCADA station that runs on your
computer. The assistant reads live values and history, configures devices, logic and screens, and
operates only the areas the station allows.

**Ganter Lab must be installed and running on the same computer.** This repository holds only the
pieces an assistant uses to reach it: the Claude Desktop bundle, the Claude Code plugin and the
registry entries. Ganter Lab itself is downloaded from [ganterlab.com](https://www.ganterlab.com).

## What it does

Ganter Lab is a SCADA station for Windows: it talks to PLCs, meters and sensors over Modbus, OPC UA,
Siemens S7, MQTT and other drivers, keeps their history, raises alarms and draws operation screens.
Its built-in MCP server lets an assistant work on that station:

- browse the connected equipment and read live values with their quality;
- look through what the station recorded;
- create devices, tags, logic, alarms and screens;
- in the areas you allow, write values and run actions;
- answer questions about the program from the documentation of the version installed.

Nothing leaves the computer. The server listens on the loopback interface only
(`http://127.0.0.1:18181/mcp`, Streamable HTTP) and exists only while the station runs. The station's
**Agent** page decides, area by area behind a master switch, what an assistant may read, configure or
operate, and every change an assistant makes is written to the station's event journal under its own
name.

## Before you connect

1. Install Ganter Lab from [ganterlab.com](https://www.ganterlab.com) and start it.
2. Open its **Agent** page and turn on **Enable agent access (MCP)**. It is off on a fresh install.
3. Under **Allowed areas**, choose what an assistant may do. Reading and most configuring are open as
   soon as agent access is on; everything that reaches live equipment stays off until you turn it on.
4. Note the address the page shows. The default is `http://127.0.0.1:18181/mcp`; the port is the
   page's **Port** field.

## Connect a client

### Claude Desktop

Download `ganter-lab.mcpb` from the [latest release](https://github.com/ganterlab/ganter-lab-mcp/releases/latest)
and open it: Claude Desktop shows its install dialog. If the station's port is not 18181, set the
**MCP endpoint** field to the address the Agent page shows. The Node runtime the bundle needs comes
with Claude Desktop. The station's Agent page offers the bundle too (**Install in Claude Desktop**).

### Claude Code

Through the plugin in this repository:

```
claude plugin marketplace add ganterlab/ganter-lab-mcp
claude plugin install ganter-lab@ganter-lab
```

Or with one command and no plugin:

```
claude mcp add --transport http ganterlab http://127.0.0.1:18181/mcp
```

**Another port.** The plugin's **MCP endpoint** setting holds the station's address, filled in with
the default, `http://127.0.0.1:18181/mcp`. If the Agent page shows another port, change that setting
to the address the page shows: Claude Code asks for it when the plugin is enabled, and `/config`
lists it afterwards.

### Codex

Add the station to `~/.codex/config.toml`:

```
[mcp_servers.ganterlab]
url = "http://127.0.0.1:18181/mcp"
```

### Any other MCP client

Any client running on the same computer that takes a Streamable HTTP server address connects to
`http://127.0.0.1:18181/mcp` (the port is the one the Agent page shows). Clients that reach servers
from the internet, such as ChatGPT connectors or the Gemini web chat, are not supported: the station
listens on this computer only.

The assistant guide covers every client and every area:
[www.ganterlab.com/en/docs/agent](https://www.ganterlab.com/en/docs/agent).

## What is in this repository

| File | What it is |
| --- | --- |
| `bridge.mjs` | The Claude Desktop bundle's bridge: it speaks MCP over stdio to Claude Desktop and forwards each message to the station's endpoint. Built-in Node only, no dependencies. When the station restarts (an update relaunches it), the bridge opens a new session and replays the call, so Claude Desktop needs no restart. For debugging it runs alone: `node bridge.mjs http://127.0.0.1:18181/mcp` |
| `manifest.json`, `icon.png` | The bundle's manifest and mark. With `bridge.mjs` they make `ganter-lab.mcpb`, attached to each release |
| `.claude-plugin/`, `.mcp.json` | The Claude Code plugin and the plugin marketplace of this repository |
| `server.json` | The entry in the official MCP Registry, `io.github.ganterlab/ganter-lab` |
| `glama.json` | The maintainers, for Glama |
| `.github/workflows/publish-registry.yml` | Publishes `server.json` to the MCP Registry from GitHub Actions, run by hand after a release |

This package has a version number of its own, which changes only when the bridge, the manifest or
the plugin changes, not with every version of Ganter Lab.

## Plans

Ganter Lab's plans are on the [pricing page](https://www.ganterlab.com/en/pricing).

## Links

- Ganter Lab: [www.ganterlab.com](https://www.ganterlab.com)
- Assistant guide: [www.ganterlab.com/en/docs/agent](https://www.ganterlab.com/en/docs/agent)

## License

The bridge, the manifest and the plugin are under the [MIT License](LICENSE). Ganter Lab itself is
commercial software and is not in this repository; the Ganter Lab name and mark are not licensed by it.
