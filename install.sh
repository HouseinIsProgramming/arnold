#!/usr/bin/env bash
set -euo pipefail

REPO="HouseinIsProgramming/arnold"
SKILL_DIR="$HOME/.claude/skills/arnold"
BINARY_NAME="arnold"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info() { echo -e "${GREEN}→${NC} $1"; }
warn() { echo -e "${YELLOW}→${NC} $1"; }
error() { echo -e "${RED}✗${NC} $1" >&2; exit 1; }

# Detect platform
detect_platform() {
  local os arch
  os="$(uname -s | tr '[:upper:]' '[:lower:]')"
  arch="$(uname -m)"

  case "$arch" in
    arm64|aarch64) arch="arm64" ;;
    x86_64|amd64)  arch="x64" ;;
    *) error "Unsupported architecture: $arch" ;;
  esac

  case "$os" in
    darwin) ;;
    linux)  ;;
    *) error "Unsupported OS: $os" ;;
  esac

  echo "${os}-${arch}"
}

# Download file with curl or wget
download() {
  local url="$1" dest="$2"
  if command -v curl &>/dev/null; then
    curl -fsSL "$url" -o "$dest"
  elif command -v wget &>/dev/null; then
    wget -q "$url" -O "$dest"
  else
    error "Neither curl nor wget found"
  fi
}

main() {
  echo ""
  echo "  arnold — agent-first GraphQL CLI"
  echo ""

  local platform
  platform="$(detect_platform)"
  info "Detected platform: $platform"

  # Check for existing installation
  if [ -f "$SKILL_DIR/$BINARY_NAME" ]; then
    local current_version
    current_version="$("$SKILL_DIR/$BINARY_NAME" --version 2>/dev/null || echo "unknown")"
    warn "Existing installation found (v${current_version}), upgrading..."
  fi

  # Download binary
  local tmp
  tmp="$(mktemp)"
  local download_url="https://github.com/${REPO}/releases/latest/download/${BINARY_NAME}-${platform}"

  info "Downloading ${BINARY_NAME}-${platform}..."
  download "$download_url" "$tmp" || error "Download failed. Check https://github.com/${REPO}/releases"

  # Install
  mkdir -p "$SKILL_DIR"
  mv "$tmp" "$SKILL_DIR/$BINARY_NAME"
  chmod +x "$SKILL_DIR/$BINARY_NAME"
  info "Installed binary to $SKILL_DIR/$BINARY_NAME"

  # Download skill
  local skill_url="https://raw.githubusercontent.com/${REPO}/main/src/skill/arnold.md"
  download "$skill_url" "$SKILL_DIR/SKILL.md" || warn "Could not download skill file"
  info "Installed skill to $SKILL_DIR/SKILL.md"

  # Create default config if not exists
  if [ ! -f "$SKILL_DIR/config.json" ]; then
    echo '{}' > "$SKILL_DIR/config.json"
  fi

  # Add to PATH
  add_to_path

  echo ""
  info "Installation complete!"
  echo ""
  echo "  Quick start:"
  echo "    arnold schema ops --api shop              # discover operations"
  echo "    arnold schema type --api shop <TypeName>   # inspect a type"
  echo "    arnold auth login --api shop --email ...   # authenticate"
  echo ""
  echo "  Configure endpoint (optional):"
  echo "    export ARNOLD_SHOP_API=http://localhost:3000/shop-api"
  echo "    export ARNOLD_ADMIN_API=http://localhost:3000/admin-api"
  echo ""
}

add_to_path() {
  local export_line="export PATH=\"$SKILL_DIR:\$PATH\""

  # Check if already in PATH
  if echo "$PATH" | tr ':' '\n' | grep -qx "$SKILL_DIR"; then
    return
  fi

  # Detect shell and config file
  local shell_config=""
  case "${SHELL:-}" in
    */zsh)  shell_config="$HOME/.zshrc" ;;
    */bash) shell_config="$HOME/.bashrc" ;;
    */fish)
      # Fish uses a different syntax
      local fish_line="fish_add_path $SKILL_DIR"
      local fish_config="$HOME/.config/fish/config.fish"
      if [ -f "$fish_config" ] && ! grep -qF "$SKILL_DIR" "$fish_config"; then
        echo "$fish_line" >> "$fish_config"
        info "Added to PATH in $fish_config"
      fi
      return
      ;;
  esac

  if [ -n "$shell_config" ] && [ -f "$shell_config" ]; then
    if ! grep -qF "$SKILL_DIR" "$shell_config"; then
      echo "" >> "$shell_config"
      echo "# arnold CLI" >> "$shell_config"
      echo "$export_line" >> "$shell_config"
      info "Added to PATH in $shell_config (restart shell or run: source $shell_config)"
    fi
  else
    warn "Add this to your shell config: $export_line"
  fi
}

main "$@"
