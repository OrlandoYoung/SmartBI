/**
 * Pivot API 模块
 * ---------------
 * 真实接口替换说明：
 *   将 isMock 分支内的 mockXxx 调用替换为 apiClient 请求。
 *
 *   预期接口：
 *     POST /pivot/query          body: PivotConfig          → PivotQueryResult
 *     GET  /pivot/unique-values?datasource=:id&field=:field → string[]
 */

import type { PivotConfig, PivotQueryResult } from '../../types'
import { API_MODE } from '../config'
import { apiClient } from '../client'
import {
  queryPivotData as mockQueryPivotData,
  getUniqueValues as mockGetUniqueValues,
} from '../../data/mockData'

export async function queryPivotData(config: PivotConfig): Promise<PivotQueryResult> {
  if (API_MODE === 'mock') {
    return mockQueryPivotData(config)
  }

  // ===== 真实 API 调用（替换为 Smartbi 接口） =====
  return apiClient.post<PivotQueryResult>('/pivot/query', config)
}

export async function getUniqueValues(dataSourceId: string, field: string): Promise<string[]> {
  if (API_MODE === 'mock') {
    return mockGetUniqueValues(dataSourceId, field)
  }

  // ===== 真实 API 调用（替换为 Smartbi 接口） =====
  return apiClient.get<string[]>(
    `/pivot/unique-values?datasource=${encodeURIComponent(dataSourceId)}&field=${encodeURIComponent(field)}`
  )
}
