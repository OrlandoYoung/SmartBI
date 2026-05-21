/**
 * DataSource API 模块
 * ---------------
 * 真实接口替换说明：
 *   将 isMock 分支内的 mockXxx 调用替换为 apiClient 请求。
 *
 *   预期接口：
 *     GET  /datasources                → DataSource[]
 *     GET  /datasources/:id/dimensions → Dimension[]
 *     GET  /datasources/:id/measures   → Measure[]
 */

import type { DataSource, Dimension, Measure } from '../../types'
import { API_MODE } from '../config'
import { apiClient } from '../client'
import {
  getDataSources as mockGetDataSources,
  getDimensions as mockGetDimensions,
  getMeasures as mockGetMeasures,
} from '../../data/mockData'

export async function getDataSources(): Promise<DataSource[]> {
  if (API_MODE === 'mock') {
    return mockGetDataSources()
  }

  // ===== 真实 API 调用（替换为 Smartbi 接口） =====
  return apiClient.get<DataSource[]>('/datasources')
}

export async function getDimensions(dataSourceId: string): Promise<Dimension[]> {
  if (API_MODE === 'mock') {
    return mockGetDimensions(dataSourceId)
  }

  // ===== 真实 API 调用（替换为 Smartbi 接口） =====
  return apiClient.get<Dimension[]>(`/datasources/${dataSourceId}/dimensions`)
}

export async function getMeasures(dataSourceId: string): Promise<Measure[]> {
  if (API_MODE === 'mock') {
    return mockGetMeasures(dataSourceId)
  }

  // ===== 真实 API 调用（替换为 Smartbi 接口） =====
  return apiClient.get<Measure[]>(`/datasources/${dataSourceId}/measures`)
}
