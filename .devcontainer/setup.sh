#!/bin/bash
set -e

echo "🚀 Setting up devcontainer..."

# Install Claude Code and usage tracker
echo "📦 Installing claude code..."
curl -fsSL https://claude.ai/install.sh | bash
# The installer adds ~/.local/bin to PATH via the shell profile, but this
# (non-login) build shell won't have re-sourced it — put it on PATH now so the
# `claude mcp add` step below can run during the container build.
export PATH="$HOME/.local/bin:$PATH"

# Install GitHub CLI (gh) — used for PRs, releases, and tag operations
echo "🐙 Installing GitHub CLI..."
(type -p curl >/dev/null || sudo apt-get install curl -y) \
  && curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
     | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
  && sudo chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg \
  && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
     | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
  && sudo apt-get update \
  && sudo apt-get install gh -y
gh --version | head -1
echo "✓ GitHub CLI installed (run 'gh auth login' to authenticate)"

# Install agent-browser (browser automation CLI for the agent)
echo "🌐 Installing agent-browser..."
npm install -g agent-browser

# agent-browser install fetches Chrome for Testing, which Google only ships for
# linux64 (x86-64) — there is NO linux-arm64 build, so it fails on Apple Silicon
# containers. Ubuntu's `chromium` is snap-only and snaps don't run in a
# container, so instead we use Playwright's real arm64 Chromium binary and point
# agent-browser at it via AGENT_BROWSER_EXECUTABLE_PATH.
ARCH="$(dpkg --print-architecture)"
MCP_ENV_ARGS=()
if [ "$ARCH" = "arm64" ]; then
  echo "🧭 ARM64 detected — installing Playwright Chromium (no Chrome-for-Testing arm64 build)..."
  npx --yes playwright@latest install chromium
  sudo -E env "PATH=$PATH" npx --yes playwright@latest install-deps chromium
  CHROME="$(ls -d "$HOME"/.cache/ms-playwright/chromium-*/chrome-linux/chrome | sort -V | tail -1)"
  sudo ln -sf "$CHROME" /usr/local/bin/chromium
  # Export system-wide so interactive/login shells (and agent-browser) find it.
  echo 'export AGENT_BROWSER_EXECUTABLE_PATH=/usr/local/bin/chromium' \
    | sudo tee /etc/profile.d/agent-browser.sh > /dev/null
  # The MCP subprocess is launched by Claude Code from a non-login shell that
  # doesn't source the profile, so pass the path explicitly in the MCP config.
  MCP_ENV_ARGS=(-e AGENT_BROWSER_EXECUTABLE_PATH=/usr/local/bin/chromium)
  echo "✓ Chromium ready: $(/usr/local/bin/chromium --version) -> /usr/local/bin/chromium"
else
  agent-browser install --with-deps
fi
echo "✓ agent-browser installed (drive it with: agent-browser open <url>, screenshot, snapshot)"

# Register agent-browser as an MCP server so Claude Code can drive the browser
# via MCP tools. Idempotent: re-adding on container rebuilds replaces cleanly.
if command -v claude >/dev/null 2>&1; then
  echo "🔌 Registering agent-browser MCP server with Claude Code..."
  claude mcp remove agent-browser --scope user 2>/dev/null || true
  claude mcp add agent-browser --scope user "${MCP_ENV_ARGS[@]}" -- agent-browser mcp
  echo "✓ MCP server 'agent-browser' registered (restart Claude Code to load its tools)"
fi

# --- Project dependencies -------------------------------------------------
# Local PostgreSQL server (used by scripts/pg-dev.sh) and the Node deps, so the
# app is ready after a rebuild. See README "Getting started" for the
# pg:up / db:push / db:seed / dev flow.
echo "🐘 Installing PostgreSQL..."
sudo apt-get update
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y postgresql postgresql-client

echo "📦 Installing Node dependencies..."
cd "$(dirname "$0")/.." && npm install

echo "✅ Devcontainer setup complete."