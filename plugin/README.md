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

## Try it

With agent access on, these work on a fresh installation, with no equipment connected:

1. "Create a simulated device called Test Oven with a Temperature tag, and tell me its live value."
2. "Add a High alarm that fires when the Test Oven temperature goes above 60."
3. "Which devices are on my station, and is any of them not communicating?"
4. "How do I connect a Siemens S7-1200 PLC to Ganter Lab?"

## Testing it from scratch

1. On a Windows 10 or 11 (x64) computer, install Ganter Lab from
   [ganterlab.com](https://www.ganterlab.com) or the Microsoft Store. It runs without an account: in
   that mode the station's runtime stops after an hour, and starting it again from the app gives
   another hour.
2. Open Ganter Lab, go to its **Agent** page and turn on **Enable agent access (MCP)**. Reading and
   configuring devices and Logic are allowed as soon as it is on.
3. Install this plugin and run the prompts above. The simulated device stands in for real
   equipment, so nothing else is needed.

## Support

Questions and problems: contact@ganterlab.com. Security reports go to the same address.

## License

The plugin is under the MIT License. Ganter Lab itself is commercial software and is not part of
this plugin.
