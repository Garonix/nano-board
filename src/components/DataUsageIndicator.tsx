/**
 * 数据使用情况指示器组件
 * 显示data目录的存储使用情况
 */

import React, { useState, useEffect } from 'react';

interface DataSizeInfo {
  totalSize: number;
  maxSize: number;
  usagePercentage: number;
  formattedTotalSize: string;
  formattedMaxSize: string;
  isOverLimit: boolean;
  remainingSpace: number;
  formattedRemainingSpace: string;
}

interface DataUsageIndicatorProps {
  /** 是否显示详细信息 */
  showDetails?: boolean;
  /** 自定义样式类名 */
  className?: string;
  /** 刷新间隔（毫秒），0表示不自动刷新 */
  refreshInterval?: number;
}

/**
 * 数据使用情况指示器组件
 */
export const DataUsageIndicator: React.FC<DataUsageIndicatorProps> = ({
  showDetails = false,
  className = '',
  refreshInterval = 0
}) => {
  const [dataInfo, setDataInfo] = useState<DataSizeInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * 获取数据使用情况
   */
  const fetchDataUsage = async () => {
    try {
      setError(null);
      const response = await fetch('/api/data-size');
      
      if (!response.ok) {
        throw new Error(`获取数据失败: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setDataInfo(result.data);
      } else {
        throw new Error(result.error || '获取数据失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setLoading(false);
    }
  };

  // 初始加载和定时刷新
  useEffect(() => {
    fetchDataUsage();
    
    if (refreshInterval > 0) {
      const interval = setInterval(fetchDataUsage, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval]);

  /**
   * 获取使用率对应的颜色类
   */
  const getUsageColorClass = (percentage: number): string => {
    if (percentage >= 90) return 'text-red-600 bg-red-100';
    if (percentage >= 75) return 'text-orange-600 bg-orange-100';
    if (percentage >= 50) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  /**
   * 获取进度条颜色类
   */
  const getProgressColorClass = (percentage: number): string => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-orange-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (loading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm text-gray-600">加载中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-sm text-red-600 ${className}`}>
        <span>⚠ {error}</span>
      </div>
    );
  }

  if (!dataInfo) {
    return null;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* 基础使用率显示 */}
      <div className="flex items-center space-x-3">
        <div className={`px-2 py-1 rounded text-xs font-medium ${getUsageColorClass(dataInfo.usagePercentage)}`}>
          {dataInfo.usagePercentage}%
        </div>
        
        {/* 进度条 */}
        <div className="flex-1 bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${getProgressColorClass(dataInfo.usagePercentage)}`}
            style={{ width: `${Math.min(dataInfo.usagePercentage, 100)}%` }}
          ></div>
        </div>
        
        <span className="text-xs text-gray-600">
          {dataInfo.formattedTotalSize} / {dataInfo.formattedMaxSize}
        </span>
      </div>

      {/* 详细信息 */}
      {showDetails && (
        <div className="text-xs text-gray-600 space-y-1">
          <div className="flex justify-between">
            <span>已使用:</span>
            <span>{dataInfo.formattedTotalSize}</span>
          </div>
          <div className="flex justify-between">
            <span>总限制:</span>
            <span>{dataInfo.formattedMaxSize}</span>
          </div>
          <div className="flex justify-between">
            <span>剩余空间:</span>
            <span className={dataInfo.remainingSpace < dataInfo.maxSize * 0.1 ? 'text-red-600' : ''}>
              {dataInfo.formattedRemainingSpace}
            </span>
          </div>
          {dataInfo.isOverLimit && (
            <div className="text-red-600 font-medium">
              ⚠ 已超出存储限制
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * 简化版数据使用指示器
 * 只显示使用率和进度条
 */
export const SimpleDataUsageIndicator: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <DataUsageIndicator 
      showDetails={false}
      className={className}
      refreshInterval={30000} // 30秒刷新一次
    />
  );
};

/**
 * 详细版数据使用指示器
 * 显示完整的使用情况信息
 */
export const DetailedDataUsageIndicator: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <DataUsageIndicator 
      showDetails={true}
      className={className}
      refreshInterval={10000} // 10秒刷新一次
    />
  );
};
