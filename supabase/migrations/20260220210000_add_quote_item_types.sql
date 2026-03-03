-- Add type and provided_by columns to quote_line_items to distinguish labor/materials and who provides them

ALTER TABLE public.quote_line_items
ADD COLUMN IF NOT EXISTS item_type text DEFAULT 'labor',
ADD COLUMN IF NOT EXISTS provided_by text DEFAULT 'contractor';
