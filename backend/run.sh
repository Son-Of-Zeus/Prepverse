#!/bin/bash
# PrepVerse Backend Run Script (using uv)

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}PrepVerse Backend${NC}"
echo "===================="

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found!${NC}"
    echo -e "${YELLOW}Please copy .env.example to .env and fill in your credentials:${NC}"
    echo "cp .env.example .env"
    exit 1
fi

# Check if uv is installed
if ! command -v uv &> /dev/null; then
    echo -e "${RED}Error: uv is not installed!${NC}"
    echo -e "${YELLOW}Install uv with:${NC}"
    echo "curl -LsSf https://astral.sh/uv/install.sh | sh"
    exit 1
fi

# Sync dependencies (creates venv and installs deps)
echo -e "${GREEN}Syncing dependencies with uv...${NC}"
uv sync

# Run the server
echo -e "${GREEN}Starting FastAPI server...${NC}"
echo -e "${YELLOW}API will be available at: http://localhost:8000${NC}"
echo -e "${YELLOW}API Documentation: http://localhost:8000/docs${NC}"
echo ""

uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
