export interface User {
  username: string
  token: string
}

export interface LoginParams {
  username: string
  password: string
}

export interface DataSource {
  id: string
  name: string
  description: string
}

export interface Dimension {
  id: string
  name: string
  field: string
  dataType: 'string' | 'number'
  hierarchyGroup?: string
  parentField?: string
  category?: string
}

export interface DimensionCategory {
  name: string
  dimensions: Dimension[]
}

export interface Measure {
  id: string
  name: string
  field: string
  aggregation: 'sum' | 'count' | 'avg'
  format?: string
  category?: string
}

export interface MeasureCategory {
  name: string
  measures: Measure[]
}

export type FilterOperator = 'in' | 'notIn' | 'gt' | 'lt' | 'gte' | 'lte'

export interface Filter {
  field: string
  operator: FilterOperator
  values: string[]
}

export type FilterMode = 'multiSelect' | 'range'

export interface FilterItem {
  id: string
  field: string
  dataType: 'string' | 'number'
  mode: FilterMode
  selectedValues: string[]
  rangeMin: string
  rangeMax: string
}

export interface PivotConfig {
  rowDimensions: Dimension[]
  columnDimensions: Dimension[]
  measures: Measure[]
  filters: Filter[]
}

export interface PivotCellValue {
  [measureField: string]: number
}

export interface PivotQueryResult {
  rowHeaders: PivotRowHeader[]
  columnHeaders: PivotColumnHeader[]
  cells: Record<string, Record<string, PivotCellValue>>
  rowTotals: Record<string, PivotCellValue>
  columnTotals: Record<string, PivotCellValue>
  grandTotal: PivotCellValue
}

export interface PivotRowHeader {
  key: string
  label: string
  level: number
  isSubtotal?: boolean
  isTotal?: boolean
  children?: PivotRowHeader[]
}

export interface PivotColumnHeader {
  key: string
  label: string
  level: number
  span: number
  isSubtotal?: boolean
  isTotal?: boolean
  children?: PivotColumnHeader[]
}

export interface FlatRow {
  key: string
  label: string
  level: number
  isSubtotal: boolean
  isTotal: boolean
  parentKey: string | null
  hasChildren: boolean
  expanded: boolean
}

export interface FlatCol {
  key: string
  label: string
  level: number
  span: number
  isSubtotal: boolean
  isTotal: boolean
  leafKeys: string[]
}

export type AppPage = 'login' | 'dataSource' | 'pivotAnalysis'

export interface AppState {
  page: AppPage
  user: User | null
  selectedDataSource: DataSource | null
}
