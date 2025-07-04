#!/bin/bash

# Docker环境变量测试脚本
# 用于验证Docker部署后环境变量是否正确生效

set -e

echo "==================================="
echo "Docker环境变量测试脚本"
echo "==================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试函数
test_api() {
    local url=$1
    local method=${2:-GET}
    local data=${3:-}
    local expected_status=${4:-200}
    
    echo -n "测试 $method $url ... "
    
    if [ "$method" = "POST" ] && [ -n "$data" ]; then
        response=$(curl -s -w "%{http_code}" -X POST \
            -H "Content-Type: application/json" \
            -d "$data" "$url")
    else
        response=$(curl -s -w "%{http_code}" "$url")
    fi
    
    # 提取HTTP状态码和响应体
    http_code="${response: -3}"
    body="${response%???}"
    
    if [ "$http_code" = "$expected_status" ]; then
        echo -e "${GREEN}✓ 成功${NC} (HTTP $http_code)"
        echo "  响应: $body"
    else
        echo -e "${RED}✗ 失败${NC} (HTTP $http_code, 期望 $expected_status)"
        echo "  响应: $body"
        return 1
    fi
}

# 检查Docker容器状态
echo "1. 检查Docker容器状态..."
if ! docker ps | grep -q nano-board; then
    echo -e "${RED}错误: nano-board容器未运行${NC}"
    echo "请先启动容器: docker-compose up -d"
    exit 1
fi
echo -e "${GREEN}✓ 容器运行正常${NC}"

# 检查容器内环境变量
echo ""
echo "2. 检查容器内环境变量..."
echo "ENABLE_PASSWORD_AUTH=$(docker exec nano-board sh -c 'echo $ENABLE_PASSWORD_AUTH')"
echo "ACCESS_PASSWORD=$(docker exec nano-board sh -c 'echo $ACCESS_PASSWORD')"

# 检查.env文件挂载
echo ""
echo "3. 检查.env文件挂载..."
if docker exec nano-board test -f /app/.env; then
    echo -e "${GREEN}✓ .env文件已挂载${NC}"
    echo "内容预览:"
    docker exec nano-board head -5 /app/.env | sed 's/^/  /'
else
    echo -e "${YELLOW}⚠ .env文件未挂载${NC}"
fi

# 等待服务启动
echo ""
echo "4. 等待服务启动..."
sleep 3

# 测试API接口
echo ""
echo "5. 测试API接口..."

# 测试健康检查
test_api "http://localhost:9029/api/health"

# 测试密码验证状态
echo ""
test_api "http://localhost:9029/api/auth"

# 从响应中提取enablePasswordAuth状态
auth_status_response=$(curl -s http://localhost:9029/api/auth)
if echo "$auth_status_response" | grep -q '"enablePasswordAuth":true'; then
    echo -e "${GREEN}✓ 密码验证已启用${NC}"
    
    # 测试正确密码
    echo ""
    echo "测试密码验证功能..."
    
    # 获取当前设置的密码
    current_password=$(docker exec nano-board sh -c 'echo $ACCESS_PASSWORD')
    if [ -z "$current_password" ]; then
        current_password="nano2024"  # 默认密码
    fi
    
    echo "使用密码: $current_password"
    test_api "http://localhost:9029/api/auth" "POST" "{\"password\":\"$current_password\"}"
    
    # 测试错误密码
    echo ""
    echo "测试错误密码..."
    test_api "http://localhost:9029/api/auth" "POST" "{\"password\":\"wrong_password\"}" "401"
    
elif echo "$auth_status_response" | grep -q '"enablePasswordAuth":false'; then
    echo -e "${YELLOW}⚠ 密码验证已禁用${NC}"
    echo "如需启用，请设置 ENABLE_PASSWORD_AUTH=true"
else
    echo -e "${RED}✗ 无法确定密码验证状态${NC}"
    echo "响应: $auth_status_response"
fi

echo ""
echo "==================================="
echo "测试完成"
echo "==================================="

# 显示总结
echo ""
echo "总结:"
echo "- 容器状态: 运行中"
echo "- 环境变量: $(docker exec nano-board sh -c 'echo $ENABLE_PASSWORD_AUTH')"
echo "- 访问地址: http://localhost:9029"
echo ""
echo "如果测试失败，请检查:"
echo "1. 是否重新构建了镜像"
echo "2. .env文件配置是否正确"
echo "3. docker-compose.yaml配置是否正确"
echo "4. 容器日志: docker logs nano-board"
