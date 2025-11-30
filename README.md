# Nexa Apps

Example applications built with [NexaDB](https://github.com/krishcdbry/nexadb) - the database for AI developers.

## Apps

| App | Description | Stack |
|-----|-------------|-------|
| [NotesApp](./NotesApp) | Full-featured notes app with AI search, tags, and beautiful UI | Python + FastAPI + NexaDB |

## Quick Start

```bash
# Clone this repository
git clone https://github.com/krishcdbry/nexa-apps.git
cd nexa-apps

# Pick an app and follow its README
cd NotesApp
```

## Prerequisites

- [NexaDB](https://github.com/krishcdbry/nexadb) installed and running
- Python 3.8+ (for Python apps)
- Node.js 18+ (for JavaScript apps)

## Install NexaDB

**macOS (Homebrew):**
```bash
brew tap krishcdbry/nexadb
brew install nexadb
nexadb start
```

**macOS & Linux (Install Script):**
```bash
curl -fsSL https://raw.githubusercontent.com/krishcdbry/nexadb/main/install.sh | bash
nexadb start
```

**Docker:**
```bash
docker run -d -p 6970:6970 -p 6969:6969 -p 9999:9999 krishcdbry/nexadb
```

## Contributing

Want to add your own NexaDB app?

1. Fork this repo
2. Create a new folder for your app (e.g., `MyApp/`)
3. Include a README with setup instructions
4. Submit a PR!

## License

MIT - Feel free to use these examples in your own projects.

## Links

- [NexaDB GitHub](https://github.com/krishcdbry/nexadb)
- [NexaDB Documentation](https://nexadb.io/docs)
- [NexaDB Website](https://nexadb.io)
