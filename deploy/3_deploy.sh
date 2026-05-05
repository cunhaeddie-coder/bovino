#!/bin/bash
# =============================================================
# BOVINO - Script de Deploy Completo
# Rodar após 1_provision.sh e 2_mysql_setup.sh
# =============================================================

set -e

REPO_URL="https://github.com/cunhaeddie-coder/bovino.git"
APP_DIR="/var/www/bovino"

echo ""
echo "=========================================="
echo "  BOVINO - Deploy Inicial"
echo "=========================================="
echo ""

# ------------------------------
# Clonar repositório
# ------------------------------
echo "[1/8] Clonando repositório..."
cd /var/www
git clone $REPO_URL bovino
cd $APP_DIR

# ------------------------------
# Laravel API
# ------------------------------
echo "[2/8] Configurando Laravel API..."
cd $APP_DIR/api

composer install --no-dev --optimize-autoloader

cp .env.example .env

# Editar .env com as credenciais do banco
sed -i 's/DB_DATABASE=.*/DB_DATABASE=bovino/' .env
sed -i 's/DB_USERNAME=.*/DB_USERNAME=bovino_user/' .env
sed -i 's/DB_PASSWORD=.*/DB_PASSWORD=Bov1n0@2026#Secure/' .env
sed -i 's/APP_URL=.*/APP_URL=https:\/\/api.bovino.agr.br/' .env
sed -i 's/APP_ENV=.*/APP_ENV=production/' .env
sed -i 's/APP_DEBUG=.*/APP_DEBUG=false/' .env

php artisan key:generate
php artisan migrate --force
php artisan storage:link
php artisan config:cache
php artisan route:cache
php artisan view:cache

chown -R www-data:www-data $APP_DIR/api/storage
chown -R www-data:www-data $APP_DIR/api/bootstrap/cache
chmod -R 775 $APP_DIR/api/storage
chmod -R 775 $APP_DIR/api/bootstrap/cache

# ------------------------------
# Next.js Web
# ------------------------------
echo "[3/8] Configurando Next.js Web..."
cd $APP_DIR/web

cp .env.example .env.local 2>/dev/null || echo "# Crie o .env.local manualmente" > .env.local
sed -i 's|NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=https://api.bovino.agr.br/api/v1|' .env.local

npm install
npm run build

# ------------------------------
# Next.js Admin
# ------------------------------
echo "[4/8] Configurando Next.js Admin..."
cd $APP_DIR/admin

cp .env.example .env.local 2>/dev/null || echo "# Crie o .env.local manualmente" > .env.local
sed -i 's|NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=https://api.bovino.agr.br/api/admin|' .env.local

npm install
npm run build

# ------------------------------
# Nginx - copiar configs
# ------------------------------
echo "[5/8] Configurando Nginx..."
cp $APP_DIR/deploy/nginx_api.conf   /etc/nginx/sites-available/bovino_api
cp $APP_DIR/deploy/nginx_web.conf   /etc/nginx/sites-available/bovino_web
cp $APP_DIR/deploy/nginx_admin.conf /etc/nginx/sites-available/bovino_admin

ln -sf /etc/nginx/sites-available/bovino_api   /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/bovino_web   /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/bovino_admin /etc/nginx/sites-enabled/

rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# ------------------------------
# Supervisor - queue:work
# ------------------------------
echo "[6/8] Configurando Supervisor (queue)..."
cp $APP_DIR/deploy/supervisor_queue.conf /etc/supervisor/conf.d/bovino-queue.conf
supervisorctl reread
supervisorctl update
supervisorctl start bovino-queue:*

# ------------------------------
# PM2 - Next.js apps
# ------------------------------
echo "[7/8] Iniciando apps Next.js com PM2..."
cd $APP_DIR/web
pm2 start npm --name "bovino-web" -- start -- -p 3000

cd $APP_DIR/admin
pm2 start npm --name "bovino-admin" -- start -- -p 3001

pm2 save
pm2 startup systemd -u root --hp /root

# ------------------------------
# SSL - Let's Encrypt
# ------------------------------
echo "[8/8] Gerando certificados SSL..."
certbot --nginx \
  -d bovino.agr.br \
  -d www.bovino.agr.br \
  -d api.bovino.agr.br \
  -d admin.bovino.agr.br \
  --non-interactive \
  --agree-tos \
  --email cunha.eddie@gmail.com

systemctl reload nginx

echo ""
echo "=========================================="
echo "  Deploy concluído com sucesso!"
echo "=========================================="
echo ""
echo "  Site:   https://bovino.agr.br"
echo "  API:    https://api.bovino.agr.br"
echo "  Admin:  https://admin.bovino.agr.br"
echo ""
echo "  Verifique os status:"
echo "  pm2 status"
echo "  supervisorctl status"
echo "  systemctl status nginx"
echo ""
