import fs from 'fs';

const env = fs.readFileSync('backend/.env', 'utf8');
const url = env.split('\n').find(l => l.startsWith('SUPABASE_URL=')).split('=')[1].trim();
const key = env.split('\n').find(l => l.startsWith('SUPABASE_SERVICE_KEY=')).split('=')[1].trim();

const id = '9ddb9ec6-c38d-4fb7-996b-edd015ef272e';
const select = '*,sections:cms_page_sections(id,component_key,title,settings,content,sort_order),published_by_user:users!cms_pages_published_by_fkey(id,full_name,email)';

const res = await fetch(`${url}/rest/v1/cms_pages?id=eq.${id}&select=${select}`, {
  headers: { apikey: key, Authorization: 'Bearer ' + key }
});
const text = await res.text();
console.log('STATUS:', res.status);
console.log('BODY:', text.substring(0, 1000));
