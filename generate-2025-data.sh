#!/bin/bash

echo "🚀 Generating 2025 data for dashboard testing..."
echo ""
echo "This will:"
echo "  1. Generate orders for 2025"
echo "  2. Generate orders for October 2025"
echo "  3. Generate orders for today (October 12, 2025)"
echo ""
echo "Running: yarn db:seed-2025-data"
echo ""

# Generate 2025 data
yarn db:seed-2025-data

