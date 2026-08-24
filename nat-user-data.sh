#!/bin/bash
set -euxo pipefail

# Install and enable persistent firewall rules
yum install -y iptables-services
systemctl enable --now iptables

# Enable IPv4 forwarding permanently
cat > /etc/sysctl.d/custom-ip-forwarding.conf <<'EOF'
net.ipv4.ip_forward=1
EOF

sysctl -p /etc/sysctl.d/custom-ip-forwarding.conf

# Detect the primary network interface
PRIMARY_INTERFACE=$(ip route show default | awk '{print $5; exit}')

# Configure network address translation
iptables -t nat -A POSTROUTING -o "$PRIMARY_INTERFACE" -j MASQUERADE
iptables -F FORWARD
iptables -P FORWARD ACCEPT

# Save rules so they survive a restart
service iptables save

# Ensure Systems Manager is available
systemctl enable --now amazon-ssm-agent