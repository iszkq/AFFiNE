#!/usr/bin/env bash
set -Eeuo pipefail

# The image and deployment templates belong to the same source revision.
readonly source_ref=canary
readonly image=ghcr.io/iszkq/affine:zh-byok
readonly install_dir=${AFFINE_INSTALL_DIR:-/opt/affine}
readonly source_base=https://raw.githubusercontent.com/iszkq/AFFiNE/${source_ref}/.docker/selfhost

die() { echo "安装未完成：$*" >&2; exit 1; }

for command in curl docker od tr sed grep mktemp; do
  command -v "$command" >/dev/null 2>&1 || die "缺少命令：$command"
done
docker compose version >/dev/null 2>&1 || die '请先在 1Panel 中启用 Docker Compose'

[[ $# -le 1 ]] || die '用法：install-1panel.sh [https://你的域名]'
if [[ $# -eq 1 ]]; then
  public_url=${1%/}
else
  public_ip=$(curl -4fsSL --retry 2 --max-time 10 https://api.ipify.org) ||
    die '无法自动获取公网 IP；请传入 http://服务器IP:3010 或 https://你的域名'
  public_url="http://${public_ip}:3010"
fi
[[ "$public_url" =~ ^https?://[A-Za-z0-9.-]+(:[0-9]{1,5})?$ ]] ||
  die '访问地址应为 http://服务器IP:3010 或 https://你的域名'

if [[ -f "$install_dir/.installed-by-affine-1panel" ]]; then
  echo '检测到此前安装，继续启动现有编排。'
  cd "$install_dir"
  docker compose up -d
  docker compose ps -a
  exit 0
fi
if [[ -e "$install_dir/compose.yml" || -e "$install_dir/.env" ]]; then
  die "$install_dir 已有其他部署文件；为避免覆盖现有数据，请先检查该目录"
fi

temporary_dir=$(mktemp -d)
trap 'rm -rf "$temporary_dir"' EXIT
curl -fsSL --retry 3 "$source_base/compose.yml" -o "$temporary_dir/compose.yml" ||
  die '下载 Compose 文件失败'
curl -fsSL --retry 3 "$source_base/config.json.example" -o "$temporary_dir/config.json" ||
  die '下载配置文件失败'

[[ $(grep -Fc 'DATABASE_URL=postgresql://affine@postgres:5432/affine' "$temporary_dir/compose.yml") -eq 2 ]] ||
  die 'Compose 模板已变化，请检查安装脚本'
grep -Fq 'POSTGRES_HOST_AUTH_METHOD: trust' "$temporary_dir/compose.yml" ||
  die 'Compose 模板已变化，请检查安装脚本'
grep -Fq '"externalUrl": "http://localhost:3010"' "$temporary_dir/config.json" ||
  die '配置模板已变化，请检查安装脚本'

sed -i 's#postgresql://affine@postgres:5432/affine#postgresql://affine:${POSTGRES_PASSWORD}@postgres:5432/affine#g' "$temporary_dir/compose.yml"
sed -i 's/POSTGRES_HOST_AUTH_METHOD: trust/POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}/' "$temporary_dir/compose.yml"
sed -i "s#http://localhost:3010#$public_url#" "$temporary_dir/config.json"
if [[ "$public_url" == https://* ]]; then
  sed -i "s#'3010:3010'#'127.0.0.1:3010:3010'#" "$temporary_dir/compose.yml"
fi

umask 077
mkdir -p "$install_dir/config" "$install_dir/data/storage" "$install_dir/data/postgres"
mv "$temporary_dir/compose.yml" "$install_dir/compose.yml"
mv "$temporary_dir/config.json" "$install_dir/config/config.json"
password=$(od -An -N24 -tx1 /dev/urandom | tr -d '[:space:]')
{
  echo "AFFINE_IMAGE=$image"
  echo "POSTGRES_PASSWORD=$password"
} > "$install_dir/.env"
chmod 600 "$install_dir/.env"
touch "$install_dir/.installed-by-affine-1panel"

cd "$install_dir"
docker compose config --quiet || die 'Compose 配置检查失败'
if ! docker compose up -d; then
  docker compose logs --tail=80 affine_migration affine || true
  die '容器启动失败；请查看上面的日志'
fi
docker compose ps -a
echo "安装完成，访问：$public_url"
if [[ "$public_url" == https://* ]]; then
  echo '请在 1Panel 网站中添加反向代理到 http://127.0.0.1:3010 并配置 HTTPS。'
else
  echo '如果无法访问，请在 1Panel 防火墙放行 TCP 3010。'
fi
