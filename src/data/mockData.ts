import type {
  User, LoginParams, DataSource, Dimension, Measure,
  PivotConfig, PivotQueryResult, PivotRowHeader, PivotColumnHeader,
  PivotCellValue,
} from '../types'

const USERS: Record<string, { password: string }> = {
  admin: { password: 'admin123' },
  demo: { password: 'demo123' },
}

const DATA_SOURCES: DataSource[] = [
  { id: 'ds_order', name: '订单模型', description: '包含全国各区域的销售订单数据，涵盖销售额、销量、订单日期、产品类别等维度' },
  { id: 'ds_customer', name: '客户模型', description: '客户基本信息与分析数据' },
]

const DIMENSIONS: Dimension[] = [
  { id: 'dim_region', name: '发货区域', field: 'region', dataType: 'string', category: '发货区域' },
  { id: 'dim_province', name: '省份', field: 'province', dataType: 'string', hierarchyGroup: 'region', parentField: 'region', category: '发货区域' },
  { id: 'dim_date_year', name: '订单年份', field: 'year', dataType: 'number', hierarchyGroup: 'date', category: '订单日期时间维' },
  { id: 'dim_year_quarter', name: '订单年季', field: 'year_quarter', dataType: 'string', hierarchyGroup: 'date', parentField: 'year', category: '订单日期时间维' },
  { id: 'dim_product', name: '产品名称', field: 'product', dataType: 'string', hierarchyGroup: 'category', parentField: 'category', category: '产品类别' },
  { id: 'dim_category', name: '产品类别', field: 'category', dataType: 'string', category: '产品类别' },
]

const MEASURES: Measure[] = [
  { id: 'mes_sales', name: '销售额', field: 'sales_amount', aggregation: 'sum', format: '#,##0.00', category: '订单明细' },
  { id: 'mes_quantity', name: '销售量', field: 'sales_quantity', aggregation: 'sum', format: '#,##0', category: '订单明细' },
  { id: 'mes_order_count', name: '订单量', field: 'order_count', aggregation: 'count', format: '#,##0', category: '订单表' },
]

interface RawRecord {
  region: string
  province: string
  year: string
  year_quarter: string
  category: string
  product: string
  sales_amount: number
  sales_quantity: number
}

function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return (s - 1) / 2147483646
  }
}

const regionProvinceMap: Record<string, string[]> = {
  '华东': ['上海', '江苏', '浙江', '安徽', '山东', '江西', '福建'],
  '华南': ['广东', '广西', '海南'],
  '华北': ['北京', '天津', '河北', '山西', '内蒙古'],
  '西南': ['四川', '重庆', '云南', '贵州', '西藏'],
  '西北': ['陕西', '甘肃', '青海', '宁夏', '新疆'],
  '东北': ['辽宁', '吉林', '黑龙江'],
}

const provinceCityMap: Record<string, string[]> = {
  '上海': ['浦东新区', '黄浦区', '徐汇区'],
  '江苏': ['南京', '苏州', '无锡'],
  '浙江': ['杭州', '宁波', '温州'],
  '安徽': ['合肥', '芜湖', '蚌埠'],
  '山东': ['济南', '青岛', '烟台'],
  '江西': ['南昌', '九江', '赣州'],
  '福建': ['福州', '厦门', '泉州'],
  '广东': ['广州', '深圳', '东莞'],
  '广西': ['南宁', '桂林', '柳州'],
  '海南': ['海口', '三亚', '儋州'],
  '北京': ['朝阳区', '海淀区', '东城区'],
  '天津': ['和平区', '南开区', '河西区'],
  '河北': ['石家庄', '唐山', '保定'],
  '山西': ['太原', '大同', '长治'],
  '内蒙古': ['呼和浩特', '包头', '赤峰'],
  '四川': ['成都', '绵阳', '德阳'],
  '重庆': ['渝中区', '江北区', '沙坪坝区'],
  '云南': ['昆明', '大理', '丽江'],
  '贵州': ['贵阳', '遵义', '六盘水'],
  '西藏': ['拉萨', '日喀则', '林芝'],
  '陕西': ['西安', '咸阳', '宝鸡'],
  '甘肃': ['兰州', '天水', '酒泉'],
  '青海': ['西宁', '海东', '格尔木'],
  '宁夏': ['银川', '石嘴山', '吴忠'],
  '新疆': ['乌鲁木齐', '克拉玛依', '吐鲁番'],
  '辽宁': ['沈阳', '大连', '鞍山'],
  '吉林': ['长春', '吉林', '四平'],
  '黑龙江': ['哈尔滨', '大庆', '齐齐哈尔'],
}

const categoryProductMap: Record<string, string[]> = {
  '电子产品': ['智能手机', '笔记本电脑', '平板电脑', '智能手表', '蓝牙耳机'],
  '家居用品': ['沙发', '餐桌', '床垫', '灯具', '收纳柜'],
  '服装': ['T恤', '牛仔裤', '连衣裙', '羽绒服', '运动鞋'],
  '食品': ['大米', '食用油', '坚果礼盒', '茶叶', '乳制品'],
}

function generateRawData(): RawRecord[] {
  const rand = seededRandom(42)
  const records: RawRecord[] = []
  const years = ['2023', '2024', '2025']
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4']

  for (const [region, provinces] of Object.entries(regionProvinceMap)) {
    const regionFactor = region === '华东' ? 1.3 : region === '华南' ? 1.15 : 1.0
    for (const province of provinces) {
      for (const year of years) {
        for (const quarter of quarters) {
          const yearQuarter = `${year}${quarter}`
          const seasonalFactor = quarter === 'Q4' ? 1.4 : quarter === 'Q1' ? 0.8 : 1.0
          for (const [category, products] of Object.entries(categoryProductMap)) {
            for (const product of products) {
              const orderCount = 1 + Math.floor(rand() * 5)
              for (let o = 0; o < orderCount; o++) {
                const baseAmount = 50000 + rand() * 450000
                const salesAmount = Math.round(baseAmount * seasonalFactor * regionFactor * 100) / 100
                const salesQuantity = Math.floor(10 + rand() * 490)

                records.push({
                  region, province, year,
                  year_quarter: yearQuarter,
                  category, product,
                  sales_amount: salesAmount,
                  sales_quantity: salesQuantity,
                })
              }
            }
          }
        }
      }
    }
  }
  return records
}

const RAW_DATA = generateRawData()

function delay<T>(ms: number, result: T): Promise<T> {
  return new Promise(resolve => setTimeout(() => resolve(result), ms))
}

export async function login(params: LoginParams): Promise<User> {
  await delay(300, null)
  const user = USERS[params.username]
  if (!user || user.password !== params.password) {
    throw new Error('用户名或密码错误')
  }
  return { username: params.username, token: `token_${params.username}_${Date.now()}` }
}

export async function getDataSources(): Promise<DataSource[]> {
  await delay(200, null)
  return [...DATA_SOURCES]
}

export async function getDimensions(_dataSourceId: string): Promise<Dimension[]> {
  await delay(150, null)
  return [...DIMENSIONS]
}

export async function getMeasures(_dataSourceId: string): Promise<Measure[]> {
  await delay(150, null)
  return [...MEASURES]
}

export async function getUniqueValues(_dataSourceId: string, field: string): Promise<string[]> {
  await delay(100, null)
  const values = [...new Set(RAW_DATA.map(r => String((r as unknown as Record<string, unknown>)[field])))]
  return values.sort()
}

function applyFilters(records: RawRecord[], filters: PivotConfig['filters']): RawRecord[] {
  if (filters.length === 0) return records
  return records.filter(record => {
    return filters.every(filter => {
      const recordValue = (record as unknown as Record<string, string>)[filter.field]
      if (!recordValue) return true
      switch (filter.operator) {
        case 'in': return filter.values.includes(recordValue)
        case 'notIn': return !filter.values.includes(recordValue)
        case 'gt': return parseFloat(recordValue) > parseFloat(filter.values[0])
        case 'lt': return parseFloat(recordValue) < parseFloat(filter.values[0])
        case 'gte': return parseFloat(recordValue) >= parseFloat(filter.values[0])
        case 'lte': return parseFloat(recordValue) <= parseFloat(filter.values[0])
        default: return true
      }
    })
  })
}

function groupAndAggregate(
  records: RawRecord[],
  rowDims: Dimension[],
  colDims: Dimension[],
  measures: Measure[]
): {
  rowKeys: Map<string, Record<string, string>>
  colKeys: Map<string, Record<string, string>>
  cellData: Map<string, Map<string, PivotCellValue>>
} {
  const rowKeyMap = new Map<string, Record<string, string>>()
  const colKeyMap = new Map<string, Record<string, string>>()
  const cellMap = new Map<string, Map<string, PivotCellValue>>()
  const cellCountMap = new Map<string, Map<string, Record<string, number>>>()

  for (const record of records) {
    const rowKeyParts: string[] = []
    const rowValues: Record<string, string> = {}
    for (const dim of rowDims) {
      const val = (record as unknown as Record<string, string>)[dim.field]
      rowKeyParts.push(val)
      rowValues[dim.field] = val
    }
    const rowKey = rowDims.length > 0 ? rowKeyParts.join('|||') : '__total__'

    const colKeyParts: string[] = []
    const colValues: Record<string, string> = {}
    for (const dim of colDims) {
      const val = (record as unknown as Record<string, string>)[dim.field]
      colKeyParts.push(val)
      colValues[dim.field] = val
    }
    const colKey = colDims.length > 0 ? colKeyParts.join('|||') : '__total__'

    rowKeyMap.set(rowKey, rowValues)
    colKeyMap.set(colKey, colValues)

    if (!cellMap.has(rowKey)) {
      cellMap.set(rowKey, new Map())
    }
    if (!cellCountMap.has(rowKey)) {
      cellCountMap.set(rowKey, new Map())
    }
    const rowCellMap = cellMap.get(rowKey)!
    const rowCountMap = cellCountMap.get(rowKey)!
    if (!rowCellMap.has(colKey)) {
      const initCell: PivotCellValue = {}
      for (const m of measures) {
        initCell[m.field] = 0
      }
      rowCellMap.set(colKey, initCell)
      const initCount: Record<string, number> = {}
      for (const m of measures) {
        initCount[m.field] = 0
      }
      rowCountMap.set(colKey, initCount)
    }
    const cell = rowCellMap.get(colKey)!
    const counts = rowCountMap.get(colKey)!

    for (const m of measures) {
      if (m.aggregation === 'count') {
        cell[m.field] = (cell[m.field] || 0) + 1
      } else if (m.aggregation === 'avg') {
        cell[m.field] = (cell[m.field] || 0) + (record as unknown as Record<string, number>)[m.field]
        counts[m.field] = (counts[m.field] || 0) + 1
      } else {
        cell[m.field] = (cell[m.field] || 0) + (record as unknown as Record<string, number>)[m.field]
      }
    }
  }

  for (const [rowKey, rowCellMap] of cellMap) {
    const rowCountMap = cellCountMap.get(rowKey)
    for (const [colKey, cell] of rowCellMap) {
      const counts = rowCountMap?.get(colKey)
      for (const m of measures) {
        if (m.aggregation === 'avg' && counts && counts[m.field] > 0) {
          cell[m.field] = Math.round((cell[m.field] / counts[m.field]) * 100) / 100
        }
      }
    }
  }

  return { rowKeys: rowKeyMap, colKeys: colKeyMap, cellData: cellMap }
}

interface RowNode {
  key: string
  label: string
  level: number
  values: Record<string, string>
  children: Map<string, RowNode>
  isSubtotal: boolean
}

function getHierarchyKey(values: Record<string, string>, dims: Dimension[], level: number): string {
  const parts: string[] = []
  for (let i = 0; i <= level; i++) {
    parts.push(values[dims[i].field])
  }
  for (let i = level + 1; i < dims.length; i++) {
    parts.push('*')
  }
  return parts.join('|||')
}

function buildRowHeaders(
  rowKeyMap: Map<string, Record<string, string>>,
  rowDims: Dimension[],
): { headers: PivotRowHeader[]; flatList: Map<string, PivotRowHeader> } {
  const headers: PivotRowHeader[] = []

  if (rowDims.length === 0) {
    const totalHeader: PivotRowHeader = {
      key: '__total__',
      label: '值',
      level: 0,
    }
    return { headers: [totalHeader], flatList: new Map([['__total__', totalHeader]]) }
  }

  const sortedKeys = Array.from(rowKeyMap.entries()).sort((a, b) => {
    for (const dim of rowDims) {
      const cmp = a[1][dim.field].localeCompare(b[1][dim.field], 'zh')
      if (cmp !== 0) return cmp
    }
    return 0
  })

  const rootChildrenMap = new Map<string, RowNode>()
  const allNodes: RowNode[] = []

  for (const [key, values] of sortedKeys) {
    let currentMap = rootChildrenMap
    let parentNode: RowNode | null = null
    for (let level = 0; level < rowDims.length; level++) {
      const dim = rowDims[level]
      const partVal = values[dim.field]
      if (!currentMap.has(partVal)) {
        const hKey = getHierarchyKey(values, rowDims, level)
        const node: RowNode = {
          key: hKey,
          label: partVal,
          level,
          values: Object.fromEntries(rowDims.slice(0, level + 1).map(d => [d.field, values[d.field]])),
          children: new Map(),
          isSubtotal: false,
        }
        currentMap.set(partVal, node)
        allNodes.push(node)
      }
      parentNode = currentMap.get(partVal)!
      currentMap = parentNode.children
    }
  }

  function nodeToHeader(node: RowNode): PivotRowHeader {
    const children = Array.from(node.children.values()).map(nodeToHeader)
    return {
      key: node.key,
      label: node.label,
      level: node.level,
      children: children.length > 0 ? children : undefined,
    }
  }

  for (const [, node] of rootChildrenMap) {
    headers.push(nodeToHeader(node))
  }

  const flatList = new Map<string, PivotRowHeader>()
  function flatten(headers: PivotRowHeader[]) {
    for (const h of headers) {
      flatList.set(h.key, h)
      if (h.children) flatten(h.children)
    }
  }
  flatten(headers)

  return { headers, flatList }
}

function buildLeafColKeys(
  colKeyMap: Map<string, Record<string, string>>,
  colDims: Dimension[],
): string[] {
  if (colDims.length === 0) return ['__total__']

  const sorted = Array.from(colKeyMap.entries()).sort((a, b) => {
    for (const dim of colDims) {
      const cmp = a[1][dim.field].localeCompare(b[1][dim.field], 'zh')
      if (cmp !== 0) return cmp
    }
    return 0
  })

  return sorted.map(([key]) => key)
}

function buildColumnHeaders(
  colKeyMap: Map<string, Record<string, string>>,
  colDims: Dimension[],
): PivotColumnHeader[] {
  if (colDims.length === 0) {
    return [{ key: '__total__', label: '值', level: 0, span: 1 }]
  }

  if (colDims.length === 1) {
    const sorted = Array.from(colKeyMap.entries()).sort((a, b) => {
      return a[1][colDims[0].field].localeCompare(b[1][colDims[0].field], 'zh')
    })
    return sorted.map(([key, values]) => ({
      key,
      label: values[colDims[0].field],
      level: 0,
      span: 1,
    }))
  }

  const sorted = Array.from(colKeyMap.entries()).sort((a, b) => {
    for (const dim of colDims) {
      const cmp = a[1][dim.field].localeCompare(b[1][dim.field], 'zh')
      if (cmp !== 0) return cmp
    }
    return 0
  })

  const level1Map = new Map<string, { label: string; children: string[] }>()
  for (const [key, values] of sorted) {
    const l1Val = values[colDims[0].field]
    if (!level1Map.has(l1Val)) {
      level1Map.set(l1Val, { label: l1Val, children: [] })
    }
    level1Map.get(l1Val)!.children.push(key)
  }

  const headers: PivotColumnHeader[] = []
  for (const [, info] of level1Map) {
    const children: PivotColumnHeader[] = info.children.map(key => {
      const values = colKeyMap.get(key)!
      return {
        key,
        label: values[colDims[1].field],
        level: 1,
        span: 1,
      }
    })
    headers.push({
      key: info.label,
      label: info.label,
      level: 0,
      span: children.length,
      children,
    })
  }

  return headers
}

function calculateSubtotalsAndTotals(
  rowKeyMap: Map<string, Record<string, string>>,
  colKeyMap: Map<string, Record<string, string>>,
  cellData: Map<string, Map<string, PivotCellValue>>,
  rowDims: Dimension[],
  colDims: Dimension[],
  measures: Measure[],
  leafColKeys: string[],
): {
  rowTotals: Map<string, PivotCellValue>
  colTotals: Map<string, PivotCellValue>
  grandTotal: PivotCellValue
} {
  const rowTotals = new Map<string, PivotCellValue>()
  const colTotals = new Map<string, PivotCellValue>()
  const grandTotal: PivotCellValue = {}
  for (const m of measures) {
    grandTotal[m.field] = 0
  }

  for (const [rowKey, rowCellMap] of cellData) {
    const rt: PivotCellValue = {}
    for (const m of measures) rt[m.field] = 0
    for (const colKey of leafColKeys) {
      const cell = rowCellMap.get(colKey)
      if (cell) {
        for (const m of measures) {
          rt[m.field] = (rt[m.field] || 0) + (cell[m.field] || 0)
        }
      }
    }
    rowTotals.set(rowKey, rt)
    for (const m of measures) {
      grandTotal[m.field] = (grandTotal[m.field] || 0) + (rt[m.field] || 0)
    }
  }

  for (const colKey of leafColKeys) {
    const ct: PivotCellValue = {}
    for (const m of measures) ct[m.field] = 0
    for (const [, rowCellMap] of cellData) {
      const cell = rowCellMap.get(colKey)
      if (cell) {
        for (const m of measures) {
          ct[m.field] = (ct[m.field] || 0) + (cell[m.field] || 0)
        }
      }
    }
    colTotals.set(colKey, ct)
  }

  return { rowTotals, colTotals, grandTotal }
}

export async function queryPivotData(config: PivotConfig): Promise<PivotQueryResult> {
  await delay(500, null)

  const filteredData = applyFilters(RAW_DATA, config.filters)

  const { rowKeys: rowKeyMap, colKeys: colKeyMap, cellData } = groupAndAggregate(
    filteredData,
    config.rowDimensions,
    config.columnDimensions,
    config.measures,
  )

  const { headers: rowHeaders } = buildRowHeaders(rowKeyMap, config.rowDimensions)
  const columnHeaders = buildColumnHeaders(colKeyMap, config.columnDimensions)
  const leafColKeys = buildLeafColKeys(colKeyMap, config.columnDimensions)

  const { rowTotals, colTotals, grandTotal } = calculateSubtotalsAndTotals(
    rowKeyMap, colKeyMap, cellData,
    config.rowDimensions, config.columnDimensions,
    config.measures, leafColKeys,
  )

  const cells: Record<string, Record<string, PivotCellValue>> = {}
  for (const [rowKey, rowCellMap] of cellData) {
    cells[rowKey] = {}
    for (const [colKey, cell] of rowCellMap) {
      cells[rowKey][colKey] = cell
    }
  }

  const rowTotalsObj: Record<string, PivotCellValue> = {}
  for (const [key, val] of rowTotals) {
    rowTotalsObj[key] = val
  }
  const colTotalsObj: Record<string, PivotCellValue> = {}
  for (const [key, val] of colTotals) {
    colTotalsObj[key] = val
  }

  return {
    rowHeaders,
    columnHeaders,
    cells,
    rowTotals: rowTotalsObj,
    columnTotals: colTotalsObj,
    grandTotal,
  }
}
