// Temp: inspeccionar columnas de payment_transactions
import fs from 'fs';
const token = fs.readFileSync('temp_supabase_token.txt', 'utf8').trim();
const res = await fetch('https://api.supabase.com/v1/projects/prspnfxfspokbqxsboby/database/query', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: `SELECT column_name, data_type FROM information_schema.columns WHERE table_name='payment_transactions' ORDER BY ordinal_position` }),
});
const j = await res.json();
console.log(JSON.stringify(j, null, 1));
