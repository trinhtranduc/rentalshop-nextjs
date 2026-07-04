-- Enable unaccent extension for diacritics-insensitive search
-- This allows searching "hong ngoc" to match "Hồng Ngọc" in customer names
-- Run this once on the database: psql -d your_database -f enable_unaccent.sql
CREATE EXTENSION IF NOT EXISTS unaccent;
