/**
 * Auth API 模块
 * ---------------
 * 真实接口替换说明：
 *   将 isMock 分支内的 mockLogin 调用替换为 apiClient 请求。
 *   预期接口：POST /auth/login  body: { username, password }
 *   返回：{ username, token }
 */

import type { User, LoginParams } from '../../types'
import { API_MODE } from '../config'
import { apiClient } from '../client'
import { login as mockLogin } from '../../data/mockData'

export async function login(params: LoginParams): Promise<User> {
  if (API_MODE === 'mock') {
    return mockLogin(params)
  }

  // ===== 真实 API 调用（替换为 Smartbi 接口） =====
  return apiClient.post<User>('/auth/login', params)
}
