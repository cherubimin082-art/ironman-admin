#!/bin/bash
# ============================================================
# Smart Iron — Full Server Setup Script
# Run on fresh Ubuntu VPS as root:
#   sudo bash install.sh
# ============================================================
set -e

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
step() { echo -e "\n${YELLOW}[$1/9] $2...${NC}"; }
ok()   { echo -e "${GREEN}✓ $1${NC}"; }

CUSTOMER_DIR="/var/www/ironman-customer"
ADMIN_DIR="/var/www/ironman-admin"
CUSTOMER_REPO="https://github.com/cherubimin082-art/ironman-customer.git"
ADMIN_REPO="https://github.com/cherubimin082-art/ironman-admin.git"

echo -e "${GREEN}"
echo "╔══════════════════════════════════════╗"
echo "║   Smart Iron — Server Auto Setup     ║"
echo "╚══════════════════════════════════════╝"
echo -e "${NC}"

# ── DB credentials prompt ──────────────────────────────────
echo "Enter MySQL root password (used in .env):"
read -s DB_PASS
echo ""

# ── 1. System packages ────────────────────────────────────
step 1 "Installing system packages"
apt-get update -y -qq
apt-get install -y -qq curl git openjdk-17-jdk nginx
ok "System packages installed"

# ── 2. Node.js 20 ─────────────────────────────────────────
step 2 "Installing Node.js 20"
if ! command -v node &>/dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null
    apt-get install -y -qq nodejs
fi
ok "Node $(node -v) / NPM $(npm -v)"

# ── 3. PM2 ────────────────────────────────────────────────
step 3 "Installing PM2"
npm install -g pm2 --silent
ok "PM2 $(pm2 -v)"

# ── 4. Jenkins ────────────────────────────────────────────
step 4 "Installing Jenkins"
curl -fsSL https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key \
    | tee /usr/share/keyrings/jenkins-keyring.asc > /dev/null
echo "deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc] \
https://pkg.jenkins.io/debian-stable binary/" \
    | tee /etc/apt/sources.list.d/jenkins.list > /dev/null
apt-get update -y -qq
apt-get install -y -qq jenkins
systemctl enable jenkins
systemctl start jenkins
ok "Jenkins installed"

# Give Jenkins user permission to run PM2 + npm
echo "jenkins ALL=(ALL) NOPASSWD: $(which pm2), $(which npm), /usr/bin/npm" \
    > /etc/sudoers.d/jenkins-smart-iron
chmod 440 /etc/sudoers.d/jenkins-smart-iron

# ── 5. Clone repos ────────────────────────────────────────
step 5 "Cloning repositories"
mkdir -p /var/www

if [ -d "$CUSTOMER_DIR/.git" ]; then
    git -C "$CUSTOMER_DIR" pull origin main
else
    git clone "$CUSTOMER_REPO" "$CUSTOMER_DIR"
fi

if [ -d "$ADMIN_DIR/.git" ]; then
    git -C "$ADMIN_DIR" pull origin main
else
    git clone "$ADMIN_REPO" "$ADMIN_DIR"
fi
ok "Repos ready"

# ── 6. .env files ─────────────────────────────────────────
step 6 "Creating .env files"

write_env() {
    local dir=$1 port=$2
    [ -f "$dir/backend/.env" ] && { echo "  .env exists in $dir/backend — skipping"; return; }
    cat > "$dir/backend/.env" <<EOF
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=$DB_PASS
DB_NAME=iron_platform
DB_PORT=3306
JWT_SECRET=smartiron_secret_key
PORT=$port
EOF
    echo "  Created $dir/backend/.env (PORT=$port)"
}

write_env "$CUSTOMER_DIR" 5001
write_env "$ADMIN_DIR" 5002
ok ".env files ready"

# ── 7. Install deps + Build ───────────────────────────────
step 7 "Installing dependencies and building frontend"

for DIR in "$CUSTOMER_DIR" "$ADMIN_DIR"; do
    echo "  → $DIR"
    cd "$DIR"
    npm install --legacy-peer-deps --silent
    npm run build --silent
    cd backend
    npm install --legacy-peer-deps --silent
done
ok "Builds complete"

# ── 8. Run DB migrations ──────────────────────────────────
step 8 "Running DB migrations"
node "$CUSTOMER_DIR/backend/migrate.js" || true
node "$ADMIN_DIR/backend/migrate.js"    || true
ok "Migrations done"

# ── 9. PM2 processes ──────────────────────────────────────
step 9 "Starting backend processes with PM2"

start_or_restart() {
    local name=$1 script=$2
    pm2 describe "$name" > /dev/null 2>&1 \
        && pm2 restart "$name" \
        || pm2 start "$script" --name "$name"
}

start_or_restart smart-iron-customer "$CUSTOMER_DIR/backend/server.js"
start_or_restart smart-iron-admin    "$ADMIN_DIR/backend/server.js"

pm2 save
pm2 startup systemd -u root --hp /root | tail -1 | bash || true
ok "PM2 processes running"

# ── Nginx config ──────────────────────────────────────────
SERVER_IP=$(hostname -I | awk '{print $1}')

cat > /etc/nginx/sites-available/ironman-customer <<NGINX
server {
    listen 80;
    server_name $SERVER_IP;

    root $CUSTOMER_DIR/dist;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
    }

    location /socket.io/ {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
    }
}
NGINX

cat > /etc/nginx/sites-available/ironman-admin <<NGINX
server {
    listen 8090;
    server_name $SERVER_IP;

    root $ADMIN_DIR/dist;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:5002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
    }

    location /socket.io/ {
        proxy_pass http://localhost:5002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
    }
}
NGINX

ln -sf /etc/nginx/sites-available/ironman-customer /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/ironman-admin    /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

# ── Summary ───────────────────────────────────────────────
JENKINS_PASS=$(cat /var/lib/jenkins/secrets/initialAdminPassword 2>/dev/null || echo "Already set up")

echo ""
echo -e "${GREEN}"
echo "╔══════════════════════════════════════════════════╗"
echo "║           Setup Complete!                        ║"
echo "╠══════════════════════════════════════════════════╣"
echo "║  Customer App  : http://$SERVER_IP              ║"
echo "║  Admin App     : http://$SERVER_IP:8090         ║"
echo "║  Jenkins       : http://$SERVER_IP:8080         ║"
echo "║                                                  ║"
echo "║  Jenkins Initial Password:                       ║"
echo "║  $JENKINS_PASS"
echo "║                                                  ║"
echo "║  Next → run: bash ci/setup-jenkins-jobs.sh      ║"
echo "╚══════════════════════════════════════════════════╝"
echo -e "${NC}"
