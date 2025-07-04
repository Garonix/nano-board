import { useState, useEffect } from 'react';

/**
 * 客户端配置接口
 */
export interface ClientConfig {
  enablePasswordAuth: boolean;
  hasCustomPassword: boolean;
}

/**
 * 配置Hook状态接口
 */
export interface ConfigState {
  config: ClientConfig | null;
  loading: boolean;
  error: string | null;
}

/**
 * 获取应用配置的React Hook
 * 通过API从服务器端获取配置，解决Next.js环境变量传递问题
 */
export function useConfig(): ConfigState {
  const [state, setState] = useState<ConfigState>({
    config: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    /**
     * 从API获取配置信息
     */
    async function fetchConfig() {
      try {
        const response = await fetch('/api/config');
        
        if (!response.ok) {
          throw new Error(`配置获取失败: ${response.status}`);
        }

        const config: ClientConfig = await response.json();
        
        if (mounted) {
          setState({
            config,
            loading: false,
            error: null,
          });
        }
      } catch (error) {
        console.error('获取配置失败:', error);
        
        if (mounted) {
          // 发生错误时使用安全的默认配置
          setState({
            config: {
              enablePasswordAuth: true, // 默认启用密码验证，确保安全
              hasCustomPassword: false,
            },
            loading: false,
            error: error instanceof Error ? error.message : '配置获取失败',
          });
        }
      }
    }

    fetchConfig();

    // 清理函数，防止组件卸载后更新状态
    return () => {
      mounted = false;
    };
  }, []);

  return state;
}

/**
 * 获取配置的简化Hook，只返回配置对象
 * 如果配置尚未加载，返回安全的默认值
 */
export function useConfigValue(): ClientConfig {
  const { config } = useConfig();
  
  return config || {
    enablePasswordAuth: true, // 默认启用密码验证，确保安全
    hasCustomPassword: false,
  };
}
