import { test, expect } from '@playwright/test'

test.describe('SmartPivot E2E', () => {

  test('登录页面 - 默认凭据登录成功', async ({ page }) => {
    await page.goto('/')

    await expect(page.locator('h2')).toContainText('欢迎回来')

    await page.fill('#username', 'admin')
    await page.fill('#password', 'admin123')
    await page.getByRole('button', { name: '登录' }).click()

    await expect(page.locator('h1')).toContainText('选择数据源')
  })

  test('登录页面 - 错误凭据提示错误', async ({ page }) => {
    await page.goto('/')

    await page.fill('#username', 'bad')
    await page.fill('#password', 'wrong')
    await page.getByRole('button', { name: '登录' }).click()

    await expect(page.locator('.bg-red-50')).toContainText('用户名或密码错误')
  })

  test('数据源页面 - 选择数据源进入透视分析', async ({ page }) => {
    await page.goto('/')
    await page.fill('#username', 'admin')
    await page.fill('#password', 'admin123')
    await page.getByRole('button', { name: '登录' }).click()

    await expect(page.locator('h1')).toContainText('选择数据源')

    await page.getByText('订单模型').first().click()

    await expect(page.locator('header')).toContainText('透视分析')
  })

  test('透视分析页面 - 执行查询并显示结果', async ({ page }) => {
    await page.goto('/')
    await page.fill('#username', 'admin')
    await page.fill('#password', 'admin123')
    await page.getByRole('button', { name: '登录' }).click()
    await page.getByText('订单模型').first().click()

    await page.waitForSelector('button:has-text("执行查询")')

    await page.getByRole('button', { name: '执行查询' }).click()

    await expect(page.locator('table.pivot-table').first()).toBeVisible({ timeout: 10000 })
  })

  test('透视分析页面 - 浏览模式切换', async ({ page }) => {
    await page.goto('/')
    await page.fill('#username', 'admin')
    await page.fill('#password', 'admin123')
    await page.getByRole('button', { name: '登录' }).click()
    await page.getByText('订单模型').first().click()

    await page.waitForSelector('button:has-text("浏览模式")')

    await page.getByRole('button', { name: '浏览模式' }).click()

    await expect(page.getByRole('button', { name: '退出浏览' })).toBeVisible()

    await page.getByRole('button', { name: '退出浏览' }).click()

    await expect(page.getByRole('button', { name: '浏览模式' })).toBeVisible()
  })

  test('筛选器 - 添加字符串多选筛选', async ({ page }) => {
    await page.goto('/')
    await page.fill('#username', 'admin')
    await page.fill('#password', 'admin123')
    await page.getByRole('button', { name: '登录' }).click()
    await page.getByText('订单模型').first().click()

    await page.waitForSelector('text=筛选器')

    const filterSection = page.locator('text=筛选器').locator('..')
    const chevronDown = filterSection.locator('svg.lucide-chevron-down')
    if (await chevronDown.count() === 0) {
      await page.locator('button:has-text("筛选器")').first().click()
    }

    await page.waitForTimeout(300)

    const addBtn = page.locator('button:has-text("添加")').first()
    await addBtn.click()

    await expect(page.locator('.filter-dropdown')).toBeVisible({ timeout: 5000 })
  })

  test('Excel 导出 - 查询后导出按钮可用', async ({ page }) => {
    await page.goto('/')
    await page.fill('#username', 'admin')
    await page.fill('#password', 'admin123')
    await page.getByRole('button', { name: '登录' }).click()
    await page.getByText('订单模型').first().click()

    await page.waitForSelector('button:has-text("执行查询")')
    await page.getByRole('button', { name: '执行查询' }).click()

    await expect(page.getByRole('button', { name: '导出 Excel' })).toBeVisible({ timeout: 10000 })
  })

  test('退出登录 - 返回登录页', async ({ page }) => {
    await page.goto('/')
    await page.fill('#username', 'admin')
    await page.fill('#password', 'admin123')
    await page.getByRole('button', { name: '登录' }).click()

    await expect(page.locator('h1')).toContainText('选择数据源')

    await page.getByRole('button', { name: '退出' }).click()

    await expect(page.locator('h2')).toContainText('欢迎回来')
  })

})
