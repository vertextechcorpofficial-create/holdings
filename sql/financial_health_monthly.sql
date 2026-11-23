-- ============================================================================
-- Financial Health Monitoring - Monthly Inputs Table (Encrypted at Rest)
-- Module: Holdings > Financial Management
-- ============================================================================

CREATE TABLE IF NOT EXISTS financial_health_monthly (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,                          -- FK to company_list.company_id
  month_end DATE NOT NULL,                          -- Month-end date (e.g. 2026-10-31)
  currency_code VARCHAR(10) NOT NULL DEFAULT 'PHP', -- Consistent currency/unit per company

  -- Server-side AES-256-GCM encrypted JSON of all 20 financial inputs + management_notes
  -- Format: v1:<iv_base64>:<authTag_base64>:<ciphertext_base64>
  encrypted_payload TEXT NOT NULL,

  -- SHA-256 hex digest of the plaintext JSON payload for integrity verification
  payload_hash VARCHAR(64) NOT NULL,

  -- Audit metadata
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
