import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlPath = join(__dirname, '..', 'database', 'migrations', '022_cart_items_variant_id.sql');
const sql = readFileSync(sqlPath, 'utf8');

const token = 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjNlNjE5YzJjIiwidHlwIjoiSldUIn0.eyJpc3MiOiJodHRwczovL2FsdC5zdXBhYmFzZS5pby9hdXRoL3YxIiwic3ViIjoiM2E3NmFlODEtYWVmYS00MGNmLWE5NGQtMTAyYjUzNmU5YzYzIiwiYXVkIjoiYXV0aGVudGljYXRlZCIsImV4cCI6MTc4NDIxNTg0NiwiaWF0IjoxNzg0MjE0MDQ2LCJlbWFpbCI6InJvc2FyaW9qb2hhdGhhbkBob3RtYWlsLmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZW1haWwiLCJwcm92aWRlcnMiOlsiZW1haWwiXX0sInVzZXJfbWV0YWRhdGEiOnsiZW1haWxfdmVyaWZpZWQiOnRydWV9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6InBhc3N3b3JkIiwidGltZXN0YW1wIjoxNzg0MjA5OTYxfV0sInNlc3Npb25faWQiOiJhY2Y4YjFlNC1mOWM0LTRjMjgtOThmMC1hZTg2MzNlOTg2OGMiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.VRtpJ01et7Nnv5WCzHXEFIeDX3Cv3sGn2MtkjDGA0H2zynzC8ioSVfMDDTGhTdJnotGoLA4cbb9RaqggiXSm9m_KAgjFTuiM725qqjQyRzdfR-imfMoy3rGSXBX-Iy_EGAk8oQ4nR-sm7XSpvntQUdlnxOAYH4R1h8DBsnETFSQG0FQISRaUqIU6wrvYFrkzRMzoJ7V1HejTXCKCZXd5OfE0wdVJaTvu65su1_kXjM_zmNhRtgiMVWYMdRvZItV-xrFyf1RFsz_bZ-PN8OnS3HK7K9POTyKh3CN7jMcN4qGMST3Oi3DEWjPkCG-WHdyVcaVVn6J8901IWzsmaNy2uA';

const response = await fetch('https://api.supabase.com/platform/projects/prspnfxfspokbqxsboby/sql', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ query: sql })
});

const text = await response.text();
console.log('Status:', response.status);
console.log('Response:', text.length > 500 ? text.substring(0, 500) + '...' : text);
