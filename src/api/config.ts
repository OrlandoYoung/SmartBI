/**
 * ==========================================
 * Smartbi API 配置
 * ==========================================
 *
 * 【替换真实 API 的方法】
 *
 * 1. 将 API_MODE 从 'mock' 改为 'real'
 * 2. 修改 API_BASE_URL 指向 Smartbi 在线体验中心
 * 3. 如需认证 token，修改 getAuthHeaders()
 * 4. 各模块的 real API 调用路径已在对应文件中预留
 *
 * 示例：
 *   API_MODE = 'real'
 *   API_BASE_URL = 'https://api.smartbi.com/v1'
 *   getAuthHeaders 返回 { Authorization: `Bearer ${token}` }
 */

/** API 模式：mock 使用本地模拟数据，real 请求远程接口 */
export const API_MODE: 'mock' | 'real' = 'mock'

/** Smartbi 在线体验中心 API 地址（替换为真实地址） */
export const API_BASE_URL = 'https://api.smartbi.com/v1'

/** 返回请求头，真实模式下在此注入认证 token */
export function getAuthHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    // Authorization: `Bearer ${yourToken}`,
  }
}
