#!/bin/bash
# =============================================================
# BOVINO - Configuração do MySQL
# Rodar após 1_provision.sh
# =============================================================

set -e

DB_NAME="bovino"
DB_USER="bovino_user"
DB_PASS="Bov1n0@2026#Secure"

echo ""
echo "=========================================="
echo "  BOVINO - Configuração MySQL"
echo "=========================================="
echo ""

mysql -u root <<EOF
-- Criar banco
CREATE DATABASE IF NOT EXISTS \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Criar usuário
CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASS';

-- Dar permissões
GRANT ALL PRIVILEGES ON \`$DB_NAME\`.* TO '$DB_USER'@'localhost';
FLUSH PRIVILEGES;
EOF

echo ""
echo "Banco de dados configurado com sucesso!"
echo ""
echo "  Database: $DB_NAME"
echo "  Usuario:  $DB_USER"
echo "  Senha:    $DB_PASS"
echo ""
echo "Guarde essas credenciais para o .env do Laravel!"
echo ""
