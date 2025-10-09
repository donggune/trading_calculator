-- Migration: Add 'economic_indicator' to asset_type CHECK constraint
-- Created: 2025-10-09
-- Purpose: Enable M2 Money Supply and other economic indicators in financial_dashboard_prices table

-- Drop existing CHECK constraint
ALTER TABLE financial_dashboard_prices 
DROP CONSTRAINT IF EXISTS financial_dashboard_prices_asset_type_check;

-- Add new CHECK constraint with 'economic_indicator'
ALTER TABLE financial_dashboard_prices 
ADD CONSTRAINT financial_dashboard_prices_asset_type_check 
CHECK (asset_type IN (
  'gold',
  'stock_index',
  'currency_index',
  'cryptocurrency',
  'commodity',
  'currency',
  'economic_indicator'
));
