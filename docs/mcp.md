# ATLAS for AI assistants (MCP)

ATLAS ships a small **MCP server** (`apps/mcp`): an AI assistant that speaks the Model Context Protocol (Claude Desktop, Claude Code, and others) can use it to answer questions about No Man's Sky from ATLAS's verified wiki mirror, and about **your own log**: your systems, outlaw stations, ships, notes and timers. Decision and privacy notes: ADR-0008.

It runs on your computer, only reads, and never changes your log.

## Set up
1. Clone the repo, then `pnpm install` and `pnpm index:wiki` (Node 24 or newer).
2. Choose how it reads your log:
   - **Sync code (recommended):** in the app, More → Sync → Show the code, then copy it. The server fetches your encrypted copy and opens it on your computer, just as a paired device does.
   - **Exported file:** More → Your data → Export, and point `ATLAS_STATE_FILE` at the file. Nothing is fetched, but answers only change when you export again.
   - **Neither:** the game tools still work; the tools about your log say how to connect one.
3. Add it to your client. For Claude Desktop, in `claude_desktop_config.json`:

   ```json
   {
     "mcpServers": {
       "atlas": {
         "command": "node",
         "args": ["/path/to/nms-os/apps/mcp/src/main.ts"],
         "env": { "ATLAS_SYNC_CODE": "your sync code" }
       }
     }
   }
   ```

   For Claude Code: `claude mcp add atlas -e ATLAS_SYNC_CODE=… -- node /path/to/nms-os/apps/mcp/src/main.ts`.
4. Restart the client and ask, for example: "Which of my outlaw stations are ready?", "What do I need to craft 3 Warp Cells?", "Does my Multi-Tool's layout match the wiki's rules?"

## Before you paste the code
- **The code is the key to your whole log.** Anything holding it can read and change your log through the sync server, just like a paired device. The MCP server only reads, but the code sits in your client's config file in plain text. If you'd rather not, use an exported file.
- **What you ask about goes to your AI provider.** When the assistant calls a tool about your log, the answer (your systems, notes, ships…) is sent to the model you're using, under that provider's terms. ATLAS sends nothing to any AI on its own.
- To cut it off, turn sync off in the app (the code stops working) or remove the server from your client.

## Tools
| Tool | Answers from |
|---|---|
| `search_codex`, `read_article` | The wiki mirror (CC BY-SA 3.0), with the Codex link, wiki URL and revision |
| `plan_recipe` | The recipe planner's build order: what to gather, then each crafting round |
| `item_value` | Base values from the wiki's infoboxes |
| `cited_facts` | Game rules quoted from the wiki's prose (supercharged slots per class, grid sizes) |
| `list_systems`, `get_system` | Your logged systems, planets, visits and notes |
| `outlaw_status` | Which outlaw stations are ready, when the rest restock, the next run's estimate |
| `list_gear` | Your ships, Multi-Tools and Exosuit, with the wiki's slot rules and any mismatch |
| `search_notes`, `read_note` | Your Markdown notes |
| `list_timers` | Your running and finished timers |

## Settings
| Variable | Meaning |
|---|---|
| `ATLAS_SYNC_CODE` | Your sync code (or the pairing link). Takes precedence over the file. |
| `ATLAS_STATE_FILE` | Path to an exported `nms_state.json`. |
| `ATLAS_SYNC_URL` | Another relay (https; `http://localhost` for development). Default: ATLAS's own. |
| `ATLAS_WIKI_DIR` | Another wiki folder. Default: the repo's `wiki/`. |

A synced copy is fetched at most once a minute; changes made in the app show up after the next sync plus that minute.
