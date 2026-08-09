// Adapta company_brand_settings (esquema preexistente de design-tokens)
// al contrato del site-builder-service: agrega created_by/font_heading/font_body
// y hace nullable las columnas NOT NULL sin default para inserts parciales.
import fs from 'fs';

const PAT = fs.readFileSync('temp_supabase_token.txt', 'utf8').trim();

const sql = `
DO $$
DECLARE
  col record;
BEGIN
  FOR col IN
    SELECT column_name FROM information_schema.columns
    WHERE table_schema='public' AND table_name='company_brand_settings'
      AND is_nullable='NO' AND column_default IS NULL
      AND column_name NOT IN ('id','company_id','created_at','updated_at')
  LOOP
    EXECUTE format('ALTER TABLE public.company_brand_settings ALTER COLUMN %I DROP NOT NULL', col.column_name);
  END LOOP;
END $$;

ALTER TABLE public.company_brand_settings
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS font_heading VARCHAR(100),
  ADD COLUMN IF NOT EXISTS font_body VARCHAR(100);
`;

const res = await fetch('https://api.supabase.com/v1/projects/prspnfxfspokbqxsboby/database/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${PAT}` },
  body: JSON.stringify({ query: sql })
});
const text = await res.text();
console.log('status:', res.status);
console.log(text.slice(0, 2000));
