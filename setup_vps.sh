#!/bin/bash
set -e

# Setup Wine wrappers
cat << 'EOF' > /tmp/wine
#!/bin/bash
exec box64 /home/ubuntu/wine/wine-9.0-amd64/bin/wine64 "$@"
EOF
sudo mv /tmp/wine /usr/local/bin/wine
sudo chmod +x /usr/local/bin/wine
sudo ln -sf /usr/local/bin/wine /usr/local/bin/wine64

cat << 'EOF' > /tmp/wineserver
#!/bin/bash
exec box64 /home/ubuntu/wine/wine-9.0-amd64/bin/wineserver "$@"
EOF
sudo mv /tmp/wineserver /usr/local/bin/wineserver
sudo chmod +x /usr/local/bin/wineserver

echo "Wine wrapper installed:"
wine --version

# Initialize wine prefix in background
export WINEARCH=win64
wineboot -u || true

echo "VPS Environment Ready!"
