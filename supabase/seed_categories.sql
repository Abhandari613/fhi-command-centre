-- Seed Categories (Chart of Accounts)
-- Based on standard contractor needs and Financial Blueprint

INSERT INTO categories (name, type, icon, is_system) VALUES
-- Income
('Sales / Revenue', 'income', 'TrendingUp', true),
('Refunds', 'income', 'RefreshCcw', true),

-- COGS (Cost of Goods Sold)
('Materials', 'expense', 'Package', true),
('Subcontractors', 'expense', 'Users', true),
('Equipment Rental', 'expense', 'Truck', true),
('Permits & Fees', 'expense', 'FileText', true),
('Disposal / Bin Fees', 'expense', 'Trash2', true),

-- Operational Expenses
('Vehicle Expenses', 'expense', 'Truck', true),
('Fuel', 'expense', 'Droplet', true),
('Insurance', 'expense', 'Shield', true),
('Advertising & Marketing', 'expense', 'Megaphone', true),
('Software & Subscriptions', 'expense', 'Monitor', true),
('Office Supplies', 'expense', 'Paperclip', true),
('Meals & Entertainment', 'expense', 'Coffee', true),
('Bank Fees', 'expense', 'CreditCard', true),
('Legal & Professional', 'expense', 'Briefcase', true),

-- Personal / Equity
('Owner Draw', 'equity', 'User', true),
('Personal Expense (Non-Business)', 'equity', 'Home', true)

ON CONFLICT (name) DO NOTHING;
