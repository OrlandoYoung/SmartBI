# SmartPivot — 自助透视分析工具

> 仿 Smartbi 透视分析前端演示系统，基于 React 18 + TypeScript + Vite + Tailwind CSS 构建。

SmartPivot 是一款交互式多维透视分析应用，支持字段拖拽配置、交叉表（合并单元格）渲染、字符串多选筛选、数值区间筛查、分类汇总、浏览模式及 Excel 导出。

---

## 技术栈

| 类别 | 技术 | 版本 |
|------|------|------|
| 框架 | React | 18.3 |
| 语言 | TypeScript | 5.6 |
| 构建工具 | Vite | 5.4 |
| 样式方案 | Tailwind CSS | 3.4 |
| 图标库 | lucide-react | 0.468 |
| Excel 导出 | xlsx (SheetJS) | 0.18 |
| E2E 测试 | Playwright | latest |

---

## 功能特性

### 核心流程
- **三页面状态机**：登录 → 数据源选择 → 透视分析，支持前后导航与退出
- **双栏侧栏布局**：「数据」面板（待选字段）与「设置」面板（已选配置）并列，表格居中
- **拖拽配置**：从数据面板拖拽维度和度量到行 / 列 / 度量放置区，支持移除

### 透视表渲染
- **合并单元格表**：行头 / 列表头通过 `rowSpan` / `colSpan` 呈现层级结构
- **分类汇总**：合计行、小计行自动生成，支持折叠展开
- **行头独立滚动**：行维度区域拥有独立横向滚动条（超过画幅一半时自动出现），垂直滚动与数据区域双向同步
- **表头固定**：所有表头（行头 + 列头）在垂直滚动时固定在顶端，不随内容移动

### 数据筛选
- **字符串多选筛选**：自动加载唯一值、搜索过滤、全选 / 清除
- **数值区间筛选**：最小值 / 最大值范围筛查

### 增强功能
- **浏览模式**：一键隐藏侧栏，表格全屏展示
- **Excel 导出**：含多级合并表头的完整数据导出
- **加载 / 空态 / 错误态**：每种交互状态均有对应 UI 反馈

### 数据层
- **Mock 数据**：内置 seed random 生成 7,500+ 条销售记录，覆盖 6 大区域、30 个省市区、4 个产品类别
- **API 抽象层**：通过 `src/api/config.ts` 中的 `API_MODE` 一键切换 mock / real 模式
- **演示字段**：发货区域、省份、订单年份、订单年季、销售额、销量

---

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 生产构建
npm run build

# 预览生产构建
npm run preview

# 运行 E2E 测试
npm run test:e2e
```

---

## 登录凭证

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | admin | admin123 |
| 演示用户 | demo | demo123 |

---

## 项目结构

```
src/
├── main.tsx                    # 应用入口
├── App.tsx                     # 根组件（三页面状态机）
├── index.css                   # Tailwind 基础样式 + 组件样式类
├── types/
│   └── index.ts                # 全局 TypeScript 类型定义
├── api/                        # ★ API 抽象层（mock / real 双模式）
│   ├── index.ts                # 统一导出入口
│   ├── config.ts               # 模式切换 & Base URL 配置
│   ├── client.ts               # 统一 fetch 封装（GET / POST）
│   └── modules/
│       ├── auth.ts             # 认证模块
│       ├── datasource.ts       # 数据源模块
│       └── pivot.ts            # 透视查询模块
├── data/
│   └── mockData.ts             # Mock 数据生成、筛选引擎、聚合引擎
└── components/
    ├── LoginPage.tsx           # 登录页面
    ├── DataSourcePage.tsx      # 数据源选择页面
    └── PivotAnalysisPage.tsx   # 透视分析主页面
e2e/
└── pivot-analysis.spec.ts      # Playwright E2E 测试用例
```

---

## 从 Mock 切换到真实 API

只需修改 `src/api/config.ts` 中的配置即可：

```typescript
// src/api/config.ts

export const API_MODE: 'mock' | 'real' = 'real';           // ← 改为 'real'
export const API_BASE_URL = 'https://api.smartbi.com/v1';   // ← 替换为真实 API 地址

export function getAuthHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: 'Bearer <your_token>',                   // ← 注入认证 token
  };
}
```

### 真实 API 接口约定

| 模块 | 路径 | 方法 | 说明 |
|------|------|------|------|
| auth | `POST /auth/login` | POST | 登录，返回 User + Token |
| datasource | `GET /datasources` | GET | 获取数据源列表 |
| datasource | `GET /datasources/:id/dimensions` | GET | 获取维度字段 |
| datasource | `GET /datasources/:id/measures` | GET | 获取度量字段 |
| pivot | `POST /pivot/query` | POST | 执行透视查询 |
| pivot | `GET /pivot/unique-values` | GET | 获取字段去重值列表 |

---

## E2E 测试

```bash
# 安装 Playwright 浏览器（首次运行前）
npx playwright install --with-deps chromium

# 运行 E2E 测试
npm run test:e2e

# UI 模式下运行（调试用）
npm run test:e2e:ui
```

---
