#!/bin/bash
# =============================================================
# BOVINO - Script de Provisionamento do Servidor
# Ubuntu 24.04 | KVM 2 Hostinger | IP: 2.24.75.211
# Rodar como root via SSH: bash 1_provision.sh
# =============================================================

set -e
export DEBIAN_FRONTEND=noninteractive

echo ""
echo "=========================================="
echo "  BOVINO - Provisionamento do Servidor"
echo "=========================================="
echo ""

# ------------------------------
# 1. Atualizar sistema
# ------------------------------
echo "[1/9] Atualizando sistema..."
apt-get update && apt-get upgrade -y -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold"
apt-get install -y git curl wget unzip software-properties-common ufw

# ------------------------------
# 2. PHP 8.3 + extensões Laravel
# ------------------------------
echo "[2/9] Instalando PHP 8.3..."
add-apt-repository ppa:ondrej/php -y
apt update
apt install -y \
  php8.3-fpm \
  php8.3-cli \
  php8.3-mysql \
  php8.3-xml \
  php8.3-curl \
  php8.3-mbstring \
  php8.3-zip \
  php8.3-bcmath \
  php8.3-gd \
  php8.3-intl \
  php8.3-tokenizer \
  php8.3-fileinfo \
  php8.3-ctype \
  php8.3-pdo

# ------------------------------
# 3. Composer
# ------------------------------
echo "[3/9] Instalando Composer..."
curl -sS https://getcomposer.org/installer | php
mv composer.phar /usr/local/bin/composer
chmod +x /usr/local/bin/composer

# ------------------------------
# 4. Nginx
# ------------------------------
echo "[4/9] Instalando Nginx..."
apt install -y nginx

# ------------------------------
# 5. Node.js 20 LTS + PM2
# ------------------------------
echo "[5/9] Instalando Node.js 20 + PM2..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm install -g pm2

# ------------------------------
# 6. MySQL 8
# ------------------------------
echo "[6/9] Instalando MySQL 8..."
apt install -y mysql-server
systemctl enable mysql
systemctl start mysql

# ------------------------------
# 7. Supervisor (queue:work)
# ------------------------------
echo "[7/9] Instalando Supervisor..."
apt install -y supervisor
systemctl enable supervisor
systemctl start supervisor

# ------------------------------
# 8. Certbot (SSL Let's Encrypt)
# ------------------------------
echo "[8/9] Instalando Certbot..."
apt install -y certbot python3-certbot-nginx

# ------------------------------
# 9. Firewall UFW
# ------------------------------
echo "[9/9] Configurando Firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# ------------------------------
# Criar estrutura de diretórios
# ------------------------------
echo "Criando diretórios do projeto..."
mkdir -p /var/www/bovino/api
mkdir -p /var/www/bovino/web
mkdir -p /var/www/bovino/admin

# ------------------------------
# Verificações finais
# ------------------------------
echo ""
echo "=========================================="
echo "  Instalação concluída! Versões:"
echo "=========================================="
php -v | head -1
node -v
npm -v
composer --version | head -1
nginx -v
mysql --version
echo ""
echo "Próximo passo: rode o script 2_mysql_setup.sh"
echo ""
