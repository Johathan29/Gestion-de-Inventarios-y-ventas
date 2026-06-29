# 🔴 ATENCIÓN: Reemplaza este token con uno real generado desde el login
# Este token hardcoded es solo para pruebas locales. NO subir tokens reales al repositorio.
$token = "YOUR_TEST_TOKEN_HERE"

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
