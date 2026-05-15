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
composer install --no-dev --optimize-autoloader
composer require laravel/socialite --no-dev --no-interaction -q 2>/dev/null || true
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

echo ""
echo "Atualização concluída!"
pm2 status
echo ""
