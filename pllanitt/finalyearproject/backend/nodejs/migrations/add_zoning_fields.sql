-- Migration: Add marla_summary, image_url, green_space_statistics, and terrain_summary to zoning_results table
-- Run this migration to add the new columns for storing zoning data separately

-- Add marla_summary column (JSON)
ALTER TABLE zoning_results 
ADD COLUMN IF NOT EXISTS marla_summary JSON;

-- Add image_url column (TEXT/VARCHAR)
ALTER TABLE zoning_results 
ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);

-- Add green_space_statistics column (JSON)
ALTER TABLE zoning_results 
ADD COLUMN IF NOT EXISTS green_space_statistics JSON;

-- Add terrain_summary column (JSON)
ALTER TABLE zoning_results 
ADD COLUMN IF NOT EXISTS terrain_summary JSON;

-- Add comments to columns
COMMENT ON COLUMN zoning_results.marla_summary IS 'Marla summary with residential, commercial, park, roads breakdown';
COMMENT ON COLUMN zoning_results.image_url IS 'URL to the 2D zoning visualization image';
COMMENT ON COLUMN zoning_results.green_space_statistics IS 'Green space statistics from 2D visualization';
COMMENT ON COLUMN zoning_results.terrain_summary IS 'Terrain analysis summary with area calculations';









