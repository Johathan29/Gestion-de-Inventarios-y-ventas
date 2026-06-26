$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxZTk1OWNkMS1kM2Y0LTQxNTYtOWI4ZC1mMmJkYjFiNTBhYTQiLCJlbWFpbCI6ImFkbWluQHNpc3RlbWEuY29tIiwicm9sZSI6ImFkbWluIiwicGVybWlzc2lvbnMiOnsiYWRtaW4iOlsiYWNjZXNzIl0sImF1ZGl0IjpbInJlYWQiXSwic2FsZXMiOlsiY3JlYXRlIiwicmVhZCIsInVwZGF0ZSIsImRlbGV0ZSJdLCJ1c2VycyI6WyJjcmVhdGUiLCJyZWFkIiwidXBkYXRlIiwiZGVsZXRlIl0sImNvbmZpZyI6WyJtYW5hZ2UiXSwiY2xpZW50cyI6WyJjcmVhdGUiLCJyZWFkIiwidXBkYXRlIiwiZGVsZXRlIl0sInJlcG9ydHMiOlsicmVhZCIsImV4cG9ydCJdLCJwcm9kdWN0cyI6WyJjcmVhdGUiLCJyZWFkIiwidXBkYXRlIiwiZGVsZXRlIl0sImVjb21tZXJjZSI6WyJtYW5hZ2UiXSwiaW52ZW50b3J5IjpbImNyZWF0ZSIsInJlYWQiLCJ1cGRhdGUiLCJkZWxldGUiXSwicHVyY2hhc2VzIjpbImNyZWF0ZSIsInJlYWQiLCJ1cGRhdGUiLCJkZWxldGUiXX0sImlhdCI6MTc4MjM4ODI2NywiZXhwIjoxNzgyMzg5MTY3LCJpc3MiOiJpbnZlbnRvcnktc3lzdGVtIn0.EObyyYeANQKwwiFUde8I4y_r3ysocgE7AIiTokPr1AE"

$productId = "aed5e231-1ecb-4e68-8b0c-e1438c517d70"

Write-Host "=== TEST 1: Get product images before deletion ==="
$before = curl.exe -s "http://localhost:3000/api/v1/products/$productId" -H "Authorization: Bearer $token"
Write-Host $before

Write-Host "`n=== TEST 2: Delete image ==="
$body = @{image_url="https://prspnfxfspokbqxsboby.supabase.co/storage/v1/object/public/product-images/products/aed5e231-1ecb-4e68-8b0c-e1438c517d70/1782388296215-5xsmr5e4a6g.png"} | ConvertTo-Json
$delete = curl.exe -s -X DELETE "http://localhost:3000/api/v1/products/$productId/images" -H "Authorization: Bearer $token" -H "Content-Type: application/json" -d $body
Write-Host $delete

Write-Host "`n=== TEST 3: Get product images after deletion ==="
$after = curl.exe -s "http://localhost:3000/api/v1/products/$productId" -H "Authorization: Bearer $token"
Write-Host $after
