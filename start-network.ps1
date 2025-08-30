# Скрипт для запуска Angular фронтенда с доступом по сети
# Это позволит тестировать с других устройств в локальной сети

Write-Host "🚀 Запуск Angular фронтенда для сетевого доступа..." -ForegroundColor Green
Write-Host "📱 Доступ будет возможен с других устройств в сети" -ForegroundColor Yellow
Write-Host ""

# Получаем IP адрес
$ipAddress = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Wi-Fi").IPAddress
Write-Host "🌐 Фронтенд будет доступен по адресу:" -ForegroundColor Cyan
Write-Host "   http://$ipAddress:4200" -ForegroundColor White
Write-Host "   http://$ipAddress:4200/test-video" -ForegroundColor White
Write-Host ""

# Запускаем с хостом 0.0.0.0 для доступа по сети
npm start -- --host 0.0.0.0 --disable-host-check
