-- ============================================================================
-- Financial Health Monitoring - Monthly Inputs Table
-- Module: Holdings > Financial Management
-- ============================================================================

CREATE TABLE IF NOT EXISTS financial_health_monthly (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,                          -- FK to company_list.company_id
  month_end DATE NOT NULL,                          -- Month-end date (e.g. 2026-10-31)
  currency_code VARCHAR(10) NOT NULL DEFAULT 'PHP', -- Consistent currency/unit per company

  -- Current Assets
  cash_and_equivalents DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
  short_term_investments DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
  trade_receivables DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
  inventory DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
  other_current_assets DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
  total_current_assets_override DECIMAL(18, 2) NULL, -- Optional check/override

  -- Current Liabilities
  trade_payables DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
  non_trade_payables DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
  current_portion_loans DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
  other_current_liabilities DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
  total_current_liabilities_override DECIMAL(18, 2) NULL, -- Optional check/override

  -- Non-Current Liabilities & Equity
  long_term_loans DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
  other_non_current_liabilities DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
  total_assets DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
  total_equity DECIMAL(18, 2) NOT NULL DEFAULT 0.00,

  -- Income Statement & Cash Flow
  revenue DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
  cost_of_goods_sold DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
  net_income DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
  operating_cash_flow DECIMAL(18, 2) NULL,
  credit_purchases DECIMAL(18, 2) NULL,             -- Optional (used for DPO calculation)

  -- Management Notes & Audit
  management_notes TEXT NULL,
  created_by VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_company_month (company_id, month_end),
  INDEX idx_financial_health_company (company_id),
  INDEX idx_financial_health_month_end (month_end)
);

-- ============================================================================
-- Reference: Directus Sidebar Modules under Holdings > Financial Management
-- Adjust subsystem_id, parent_module_id, and sort values for your environment.
-- ============================================================================
-- 1. Parent module:
--    title: 'Financial Management', slug: 'financial-management', base_path: NULL, icon_name: 'Landmark', status: 'active'
-- 2. Child modules (parent_module_id = <Financial Management id>):
--    - title: 'Dashboard',      slug: 'financial-health-dashboard', base_path: '/holdings/financial-management/dashboard',      icon_name: 'LayoutDashboard', status: 'active'
--    - title: 'Monthly Input',  slug: 'financial-monthly-input',    base_path: '/holdings/financial-management/monthly-input',  icon_name: 'FileSpreadsheet', status: 'active'
--    - title: 'Ratio Analysis', slug: 'financial-ratio-analysis',   base_path: '/holdings/financial-management/ratio-analysis', icon_name: 'Calculator',      status: 'active'
