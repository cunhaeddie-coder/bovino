#!/bin/bash
# =============================================================
# BOVINO - Script de Atualização (usar após cada novo deploy)
# =============================================================

set -e

APP_DIR="/var/www/bovino"

echo ""
echo "=========================================="
echo "  BOVINO - Atualizando deploy..."
echo "=========================================="
echo ""

cd $APP_DIR
git fetch origin main
git reset --hard origin/main

# API Laravel
echo "[1/3] Atualizando Laravel..."
cd $APP_DIR/api
COMPOSER_ALLOW_SUPERUSER=1 composer update laravel/socialite --no-dev --optimize-autoloader --no-interaction -q
COMPOSER_ALLOW_SUPERUSER=1 composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
chown -R www-data:www-data storage bootstrap/cache

# Web
echo "[2/3] Atualizando Next.js Web..."
cd $APP_DIR/web
npm install
rm -rf .next
npm run build
pm2 restart bovino-web

# Admin
echo "[3/3] Atualizando Next.js Admin..."
cd $APP_DIR/admin
rm -rf .next node_modules/.cache
npm install
npm run build
pm2 restart bovino-admin

supervisorctl restart bovino-queue:*

# Nginx — injeta location /_next/static/ se ainda não existir (idempotente)
if ! grep -q "_next/static" /etc/nginx/sites-available/bovino_web 2>/dev/null; then
  echo "Atualizando nginx: adicionando location /_next/static/..."
  sed -i 's|location / {|location /_next/static/ {\n        alias /var/www/bovino/web/.next/static/;\n        expires max;\n        add_header Cache-Control "public, immutable";\n        access_log off;\n    }\n\n    location / {|' /etc/nginx/sites-available/bovino_web
  nginx -t && systemctl reload nginx && echo "Nginx recarregado."
fi

# Garantir que o scheduler do Laravel está no cron (idempotente)
CRON_LINE="* * * * * cd $APP_DIR/api && php artisan schedule:run >> /dev/null 2>&1"
( crontab -l 2>/dev/null | grep -qF "artisan schedule:run" ) || \
  ( crontab -l 2>/dev/null; echo "$CRON_LINE" ) | crontab -

echo ""
echo "Atualização concluída!"
pm2 status
echo ""
