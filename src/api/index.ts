/**
 * Smartbi API 统一入口
 *
 * 所有组件通过此入口调用 API，不直接依赖 data/mockData.ts
 *
 * 切换为真实 API 的方法：
 *   修改 src/api/config.ts 中的 API_MODE = 'real' 并设置 API_BASE_URL
 */

export { login } from './modules/auth'
export { getDataSources, getDimensions, getMeasures } from './modules/datasource'
export { queryPivotData, getUniqueValues } from './modules/pivot'
export { API_MODE, API_BASE_URL } from './config'
