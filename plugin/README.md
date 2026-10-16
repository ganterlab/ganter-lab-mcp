# Ganter Lab plugin for Claude Code

Connects Claude Code to **Ganter Lab**, the SCADA station running on this computer. Claude reads
live values and history, configures devices, logic and screens, and operates only the areas the
station allows.

**Ganter Lab must be installed and running on the same computer**, with agent access turned on in
its **Agent** page. Ganter Lab is downloaded from [ganterlab.com](https://www.ganterlab.com).

## Setting

**MCP endpoint** is the station's address, filled in with the default, `http://127.0.0.1:18181/mcp`.
If the Agent page shows another port, change it to the address the page shows: Claude Code asks for
it when the plugin is enabled, and `/config` lists it afterwards.

## What it connects to

One MCP server, `ganterlab`, reached over Streamable HTTP at that address on this computer. The
plugin runs nothing, downloads nothing and stores nothing. Nothing leaves the computer: the station
listens on the loopback interface only, decides area by area what an assistant may read, configure
or operate, and writes every change an assistant makes to its own event journal.

Assistant guide: [www.ganterlab.com/en/docs/agent](https://www.ganterlab.com/en/docs/agent)

## License

The plugin is under the MIT License. Ganter Lab itself is commercial software and is not part of
this plugin.
