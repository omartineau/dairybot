# CLAUDE.md - AI Assistant Guide for DairyBot

## Project Overview

DairyBot is a Slack recognition/rewards bot that enables team members to reward each other with virtual tokens (emoji-based) and exchange accumulated rewards for real gifts. Built with Node.js using the Botkit framework.

**Repository**: https://github.com/omartineau/dairybot
**Homepage**: http://dairybot.in

## Codebase Structure

```
dairybot/
├── dairybot.js           # Main application entry point (all bot logic)
├── package.json          # Dependencies and scripts
├── config/
│   ├── dairybot.json     # English configuration (default)
│   └── dairybot-fr.json  # French configuration
├── views/                # Handlebars templates for web interface
│   ├── layouts/
│   │   └── main.handlebars
│   ├── partials/
│   │   └── welcome.handlebars
│   ├── index.handlebars
│   ├── top.handlebars
│   └── error.handlebars
├── clevercloud/
│   └── buckets.json      # Clever Cloud deployment config
├── docs/
│   └── hosting/
│       └── clevercloud.md
├── persist/              # Runtime data (gitignored)
│   ├── db/               # Botkit JSON file store
│   └── logs/             # CSV reward logs
├── CHANGELOG.md
├── ROADMAP.md
└── README.md
```

## Key Technologies

- **Node.js** - Runtime environment
- **Botkit** - Slack bot framework (wildcard version in package.json)
- **Express 4.x** - Web server for stats pages
- **express-handlebars 3.x** - Template engine
- **body-parser** - Request body parsing

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DairyBotToken` | Yes | Slack Bot API token (xoxb-...) |
| `DairyBotConfig` | No | Config filename (default: `dairybot.json`) |
| `PORT` | No | HTTP server port (default: 3000) |

## Configuration System

Configuration files in `/config/` control all bot behavior:

### Main Sections

1. **Bot Settings**: `botName`, `botTZ`, `cronHourUTC`, `cronMinuteUTC`
2. **Admin**: `adminChanel`, `adminUser`, `giftHeardEmoji`
3. **User Filters**: `excludedUser`, `restrictedToUser`, `excludedChannel`, `restrictedToChannel`
4. **Utterances**: `yes`/`no` pattern arrays for conversation recognition
5. **Reward Settings**: Recognition limits, emoji definitions, gift catalog
6. **Localization (`str`)**: All user-facing strings with placeholder support

### Adding a New Language

1. Copy `config/dairybot.json` to `config/dairybot-{lang}.json`
2. Translate all strings in the `str` section
3. Update `utterances.yes` and `utterances.no` arrays
4. Set `DairyBotConfig=dairybot-{lang}.json` environment variable

## Core Bot Functionality

### Reward Flow (`dairybot.js`)

1. **Daily Distribution** (lines 162-280): Cron-like interval gives users tokens at configured time
2. **Reward Detection** (lines 283-382): Listens for gift emoji in channels, validates and transfers
3. **Direct Commands** (lines 384-556):
   - `hello`/`hi` - Check balances
   - `use` - Redeem rewards for gifts
   - `uptime` - Bot status
   - `restart` - Restart bot (with confirmation)

### Localization System

Custom String prototypes defined at lines 52-96:
- `String.prototype.__()` - Basic translation with placeholder replacement
- `String.prototype.__n()` - Pluralization support
- `String.prototype.replaceArray()` - `{key}` placeholder replacement

**Usage**: `"Hello {name}!".__({name: 'John'})`

### Data Persistence

- **User/Channel Storage**: Botkit's JSON file store in `persist/db/`
- **Reward Logs**: CSV files in `persist/logs/dairyRewards-YYYY-M.log.csv`

## Development Commands

```bash
# Install dependencies
npm install

# Run the bot (requires DairyBotToken)
npm start
# or
DairyBotToken=xoxb-your-token node dairybot.js

# Run with French config
DairyBotConfig=dairybot-fr.json DairyBotToken=xoxb-token node dairybot.js
```

## Code Conventions

### Style Guidelines

- **No linter/formatter configured** - Follow existing code style
- **Callback-based async** - Uses Node callbacks, not Promises/async-await
- **IIFE pattern** - Used for closure in loops (see lines 189, 253)
- **Global variables** - Some globals like `channelName`, `userTop`, `csvlog`

### Important Patterns

1. **String localization**: Always use `.__()` for user-facing strings
2. **Emoji references**: Use config values (`dairyConf.reward.giftEmoji`) not hardcoded
3. **User validation**: Check `is_restricted`, `is_bot`, `excluded` flags
4. **Error logging**: Use `bot.botkit.log()` for bot errors

## Web Interface

Express server runs on configured PORT:
- `/` - Landing page
- `/top` - User leaderboard (work in progress)

## Testing Notes

- **No test suite** - Manual testing required
- **Test in restricted mode**: Use `restrictedToUser` to limit bot to specific users
- Bot must be invited to channels to monitor them
- Direct message rewards are not supported by Slack API

## Known Issues / Technical Debt

1. Line 648 has typo: `tuserTopop` should be `userTop`
2. `updateTop()` function is commented out in some places
3. Wildcard Botkit dependency (`"botkit": "*"`) - pin version for stability
4. No Promise-based async patterns
5. Mixed callback styles

## Deployment

### Local/Server
Use `forever` npm package for daemon mode (see README.md init.d script)

### Clever Cloud
See `docs/hosting/clevercloud.md` - requires FS-bucket for persistence

## Slack Setup Requirements

1. Create bot at https://slack.com/apps/build/custom-integration
2. Invite bot to monitored channels
3. Create private `dairyadmin` channel and invite bot
4. Optional: Create `:thanks:` emoji alias for easier recognition

## Making Changes

When modifying this codebase:

1. **Bot logic changes**: Edit `dairybot.js` directly
2. **New strings**: Add to both config JSON files
3. **New gifts**: Add to `reward.rewardRL` array in config
4. **Web UI changes**: Edit Handlebars templates in `views/`
5. **Test with restricted users first** before deploying widely
