import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  BarChart3, Database, LogOut, ChevronRight, ChevronDown,
  ArrowLeft, Play, X, Plus, Trash2, Loader2,
  Table2, Filter, GripVertical, Check, FileSpreadsheet,
  Search, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react'
import type {
  User, DataSource, Dimension, Measure, DimensionCategory, MeasureCategory,
  FilterItem, PivotConfig,
  PivotQueryResult, PivotRowHeader,
} from '../types'
import { getDimensions, getMeasures, getUniqueValues, queryPivotData } from '../api'
import * as XLSX from 'xlsx'

interface Props {
  user: User
  dataSource: DataSource
  onBack: () => void
  onLogout: () => void
}

interface DraggedField {
  type: 'dimension' | 'measure'
  field: Dimension | Measure
}

let filterIdCounter = 0
function nextFilterId(): string {
  return `filter_${++filterIdCounter}`
}

function formatNumber(value: number, format?: string): string {
  if (format === '#,##0') {
    return value.toLocaleString('zh-CN', { maximumFractionDigits: 0 })
  }
  if (format === '#,##0.00') {
    return value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  if (typeof value === 'number' && !Number.isInteger(value)) {
    return value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  return value.toLocaleString('zh-CN')
}

export default function PivotAnalysisPage({ user, dataSource, onBack, onLogout }: Props) {
  const [dimensions, setDimensions] = useState<Dimension[]>([])
  const [measures, setMeasures] = useState<Measure[]>([])
  const [loadingMeta, setLoadingMeta] = useState(true)
  const [metaError, setMetaError] = useState('')

  const [rowDimensions, setRowDimensions] = useState<Dimension[]>([])
  const [columnDimensions, setColumnDimensions] = useState<Dimension[]>([])
  const [selectedMeasures, setSelectedMeasures] = useState<Measure[]>([])
  const [filters, setFilters] = useState<FilterItem[]>([])
  const [filterUniqueValues, setFilterUniqueValues] = useState<Record<string, string[]>>({})
  const [filterDropdownOpen, setFilterDropdownOpen] = useState<string | null>(null)
  const [filterSearchText, setFilterSearchText] = useState<Record<string, string>>({})

  const [draggedField, setDraggedField] = useState<DraggedField | null>(null)
  const [dragOverZone, setDragOverZone] = useState<string | null>(null)

  const [queryResult, setQueryResult] = useState<PivotQueryResult | null>(null)
  const [querying, setQuerying] = useState(false)
  const [queryError, setQueryError] = useState('')
  const [hasQueried, setHasQueried] = useState(false)
  const [browseMode, setBrowseMode] = useState(false)

  const splitContainerRef = useRef<HTMLDivElement>(null)
  const rowHeaderPanelRef = useRef<HTMLDivElement>(null)
  const dataPanelRef = useRef<HTMLDivElement>(null)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)
  const isSyncingRef = useRef(false)
  const [showRowHeaderScrollbar, setShowRowHeaderScrollbar] = useState(false)

  const syncVerticalScroll = useCallback(() => {
    if (isSyncingRef.current) return
    if (dataPanelRef.current && rowHeaderPanelRef.current) {
      isSyncingRef.current = true
      rowHeaderPanelRef.current.scrollTop = dataPanelRef.current.scrollTop
      isSyncingRef.current = false
    }
  }, [])

  const syncRowHeaderScroll = useCallback(() => {
    if (isSyncingRef.current) return
    if (dataPanelRef.current && rowHeaderPanelRef.current) {
      isSyncingRef.current = true
      dataPanelRef.current.scrollTop = rowHeaderPanelRef.current.scrollTop
      isSyncingRef.current = false
    }
  }, [])

  useEffect(() => {
    const container = splitContainerRef.current
    if (!container) return

    const checkScrollbar = () => {
      const leftPanel = rowHeaderPanelRef.current
      if (!leftPanel || !container) return
      const containerWidth = container.clientWidth
      const leftContentWidth = leftPanel.scrollWidth
      setShowRowHeaderScrollbar(leftContentWidth > containerWidth / 2)
    }

    const observer = new ResizeObserver(checkScrollbar)
    resizeObserverRef.current = observer
    observer.observe(container)

    return () => {
      observer.disconnect()
      resizeObserverRef.current = null
    }
  }, [])

  useEffect(() => {
    const observer = resizeObserverRef.current
    const leftPanel = rowHeaderPanelRef.current
    if (observer && leftPanel) {
      observer.observe(leftPanel)
      const container = splitContainerRef.current
      if (container) {
        const containerWidth = container.clientWidth
        const leftContentWidth = leftPanel.scrollWidth
        setShowRowHeaderScrollbar(leftContentWidth > containerWidth / 2)
      }
    }
  }, [queryResult])

  useEffect(() => {
    let cancelled = false
    setLoadingMeta(true)
    setMetaError('')

    Promise.all([getDimensions(dataSource.id), getMeasures(dataSource.id)])
      .then(([dims, meas]) => {
        if (!cancelled) {
          setDimensions(dims)
          setMeasures(meas)
          if (dims.length > 0) {
            setRowDimensions([dims[0]])
          }
          if (meas.length > 0) {
            setSelectedMeasures([meas[0]])
          }
        }
      })
      .catch(err => {
        if (!cancelled) setMetaError(err instanceof Error ? err.message : '加载字段信息失败')
      })
      .finally(() => {
        if (!cancelled) setLoadingMeta(false)
      })

    return () => { cancelled = true }
  }, [dataSource.id])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!filterDropdownOpen) return
      const target = e.target as HTMLElement
      if (!target.closest('.filter-dropdown')) {
        setFilterDropdownOpen(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [filterDropdownOpen])

  const availableDimensions = useMemo(
    () => dimensions.filter(d => !rowDimensions.includes(d) && !columnDimensions.includes(d)),
    [dimensions, rowDimensions, columnDimensions]
  )

  const availableMeasures = useMemo(
    () => measures.filter(m => !selectedMeasures.includes(m)),
    [measures, selectedMeasures]
  )

  const isDimUsed = useCallback((dim: Dimension) => {
    return rowDimensions.includes(dim) || columnDimensions.includes(dim)
  }, [rowDimensions, columnDimensions])

  const isMeasureUsed = useCallback((m: Measure) => {
    return selectedMeasures.includes(m)
  }, [selectedMeasures])

  const dimensionCategories = useMemo((): DimensionCategory[] => {
    const catMap = new Map<string, Dimension[]>()
    for (const dim of dimensions) {
      const cat = dim.category || '其他'
      if (!catMap.has(cat)) catMap.set(cat, [])
      catMap.get(cat)!.push(dim)
    }
    return Array.from(catMap.entries()).map(([name, dims]) => ({ name, dimensions: dims }))
  }, [dimensions])

  const measureCategories = useMemo((): MeasureCategory[] => {
    const catMap = new Map<string, Measure[]>()
    for (const m of measures) {
      const cat = m.category || '其他'
      if (!catMap.has(cat)) catMap.set(cat, [])
      catMap.get(cat)!.push(m)
    }
    return Array.from(catMap.entries()).map(([name, meas]) => ({ name, measures: meas }))
  }, [measures])

  const allDimCategoryNames = useMemo(() => dimensionCategories.map(c => c.name), [dimensionCategories])
  const allMeasureCategoryNames = useMemo(() => measureCategories.map(c => c.name), [measureCategories])

  const [expandedDimCats, setExpandedDimCats] = useState<Record<string, boolean>>({})
  const [expandedMeasureCats, setExpandedMeasureCats] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (allDimCategoryNames.length > 0) {
      setExpandedDimCats(prev => {
        const next = { ...prev }
        let changed = false
        for (const name of allDimCategoryNames) {
          if (!(name in prev)) {
            next[name] = true
            changed = true
          }
        }
        return changed ? next : prev
      })
    }
  }, [allDimCategoryNames])

  useEffect(() => {
    if (allMeasureCategoryNames.length > 0) {
      setExpandedMeasureCats(prev => {
        const next = { ...prev }
        let changed = false
        for (const name of allMeasureCategoryNames) {
          if (!(name in prev)) {
            next[name] = true
            changed = true
          }
        }
        return changed ? next : prev
      })
    }
  }, [allMeasureCategoryNames])

  const handleDragStart = useCallback((type: 'dimension' | 'measure', field: Dimension | Measure) => {
    setDraggedField({ type, field })
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, zone: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverZone(zone)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOverZone(null)
  }, [])

  const handleDropRow = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOverZone(null)
    if (!draggedField || draggedField.type !== 'dimension') return
    const dim = draggedField.field as Dimension
    if (!rowDimensions.includes(dim) && !columnDimensions.includes(dim)) {
      setRowDimensions(prev => [...prev, dim])
    }
    setDraggedField(null)
  }, [draggedField, rowDimensions, columnDimensions])

  const handleDropColumn = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOverZone(null)
    if (!draggedField || draggedField.type !== 'dimension') return
    const dim = draggedField.field as Dimension
    if (!rowDimensions.includes(dim) && !columnDimensions.includes(dim)) {
      setColumnDimensions(prev => [...prev, dim])
    }
    setDraggedField(null)
  }, [draggedField, rowDimensions, columnDimensions])

  const handleDropMeasure = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOverZone(null)
    if (!draggedField || draggedField.type !== 'measure') return
    const m = draggedField.field as Measure
    if (!selectedMeasures.includes(m)) {
      setSelectedMeasures(prev => [...prev, m])
    }
    setDraggedField(null)
  }, [draggedField, selectedMeasures])

  const removeRowDim = useCallback((dim: Dimension) => {
    setRowDimensions(prev => prev.filter(d => d !== dim))
  }, [])

  const removeColDim = useCallback((dim: Dimension) => {
    setColumnDimensions(prev => prev.filter(d => d !== dim))
  }, [])

  const removeMeasure = useCallback((m: Measure) => {
    setSelectedMeasures(prev => prev.filter(meas => meas !== m))
  }, [])

  const addFilter = useCallback(() => {
    const availableFields = dimensions.filter(d => !filters.some(f => f.field === d.field))
    if (availableFields.length === 0) return
    const dim = availableFields[0]
    setFilters(prev => [...prev, {
      id: nextFilterId(),
      field: dim.field,
      dataType: dim.dataType,
      mode: dim.dataType === 'number' ? 'range' : 'multiSelect',
      selectedValues: [],
      rangeMin: dim.dataType === 'number' ? '0' : '',
      rangeMax: '',
    }])
  }, [dimensions, filters])

  const updateFilter = useCallback((id: string, updates: Partial<FilterItem>) => {
    setFilters(prev => prev.map(f => {
      if (f.id !== id) return f
      const updated = { ...f, ...updates }
      if (updates.field !== undefined && updates.field !== f.field) {
        const dim = dimensions.find(d => d.field === updates.field)
        if (dim) {
          updated.dataType = dim.dataType
          updated.mode = dim.dataType === 'number' ? 'range' : 'multiSelect'
          updated.selectedValues = []
          updated.rangeMin = dim.dataType === 'number' ? '0' : ''
          updated.rangeMax = ''
        }
      }
      return updated
    }))
  }, [dimensions])

  const removeFilter = useCallback((id: string) => {
    setFilters(prev => prev.filter(f => f.id !== id))
    setFilterDropdownOpen(null)
  }, [])

  const loadUniqueValues = useCallback(async (field: string) => {
    if (filterUniqueValues[field]) return
    try {
      const values = await getUniqueValues(dataSource.id, field)
      setFilterUniqueValues(prev => ({ ...prev, [field]: values }))
    } catch {
      // ignore
    }
  }, [dataSource.id, filterUniqueValues])

  const handleRunQuery = useCallback(async () => {
    if (selectedMeasures.length === 0) {
      setQueryError('请至少选择一个度量')
      return
    }

    setQuerying(true)
    setQueryError('')
    setHasQueried(false)

    const convertedFilters: PivotConfig['filters'] = []
    for (const f of filters) {
      if (f.mode === 'multiSelect') {
        if (f.selectedValues.length > 0) {
          convertedFilters.push({ field: f.field, operator: 'in', values: f.selectedValues })
        }
      } else {
        if (f.rangeMin !== '') {
          convertedFilters.push({ field: f.field, operator: 'gte', values: [f.rangeMin] })
        }
        if (f.rangeMax !== '') {
          convertedFilters.push({ field: f.field, operator: 'lte', values: [f.rangeMax] })
        }
      }
    }

    const config: PivotConfig = {
      rowDimensions,
      columnDimensions,
      measures: selectedMeasures,
      filters: convertedFilters,
    }

    try {
      const result = await queryPivotData(config)
      setQueryResult(result)
      setHasQueried(true)
    } catch (err) {
      setQueryError(err instanceof Error ? err.message : '查询失败')
    } finally {
      setQuerying(false)
    }
  }, [rowDimensions, columnDimensions, selectedMeasures, filters])

  const handleExportExcel = useCallback(() => {
    if (!queryResult) return

    const { rowHeaders, columnHeaders, cells, rowTotals, columnTotals, grandTotal } = queryResult

    const hasColHeaders = columnHeaders.length > 0 && columnHeaders.some(h => h.children && h.children.length > 0)
    const hasColDims = columnDimensions.length > 0
    const isMultiMeasure = selectedMeasures.length > 1

    const showRow1 = hasColHeaders
    const showRow2 = columnHeaders.length > 0
    const showRow3 = !hasColHeaders && columnHeaders.length === 0
    const showRow4 = isMultiMeasure && hasColDims
    const headerRowCount = (showRow1 ? 1 : 0) + (showRow2 ? 1 : 0) + (showRow3 ? 1 : 0) + (showRow4 ? 1 : 0)

    const rawLeafCols = columnHeaders.length > 0
      ? columnHeaders.flatMap(h => h.children || [h])
      : [{ key: '__total__', label: '值' }]
    const measureLeafCols = !isMultiMeasure
      ? rawLeafCols.map(col => ({
          key: col.key,
          label: col.label,
          colLeafKey: col.key,
          measure: selectedMeasures[0],
        }))
      : rawLeafCols.flatMap(col =>
          selectedMeasures.map(m => ({
            key: `${col.key}::${m.field}`,
            label: m.name,
            colLeafKey: col.key,
            measure: m,
          }))
        )

    interface FlatRowItem {
      key: string
      levelCells: { key: string; label: string; rowSpan: number }[]
      isSubtotal?: boolean
      isTotal?: boolean
    }

    function collectLeaves(
      node: PivotRowHeader,
      ancestors: { key: string; label: string }[],
      result: FlatRowItem[]
    ) {
      if (!node.children || node.children.length === 0) {
        result.push({
          key: node.key,
          levelCells: [
            ...ancestors.map(a => ({ key: a.key, label: a.label, rowSpan: 0 })),
            { key: node.key, label: node.label, rowSpan: 0 },
          ],
          isSubtotal: node.isSubtotal,
          isTotal: node.isTotal,
        })
        return
      }
      const newAncestors = [...ancestors, { key: node.key, label: node.label }]
      for (const child of node.children) {
        collectLeaves(child, newAncestors, result)
      }
    }

    const flatRows: FlatRowItem[] = []
    if (rowHeaders.length > 0) {
      for (const header of rowHeaders) {
        collectLeaves(header, [], flatRows)
      }
      const numLevels = flatRows[0].levelCells.length
      for (let level = 0; level < numLevels; level++) {
        let i = 0
        while (i < flatRows.length) {
          const anchorKey = flatRows[i].levelCells[level].key
          let spanCount = 1
          while (i + spanCount < flatRows.length && flatRows[i + spanCount].levelCells[level].key === anchorKey) {
            spanCount++
          }
          flatRows[i].levelCells[level].rowSpan = spanCount
          i += spanCount
        }
      }
    }

    const numRowDimCols = Math.max(rowDimensions.length, 1)
    const numDataCols = measureLeafCols.length
    const numTotalCols = selectedMeasures.length
    const totalCols = numRowDimCols + numDataCols + numTotalCols
    const totalRows = headerRowCount + flatRows.length + 1

    const sheetData: (string | number | null)[][] = Array.from(
      { length: totalRows },
      () => Array(totalCols).fill(null)
    )
    const merges: { s: { r: number; c: number }; e: { r: number; c: number } }[] = []

    for (let r = 0; r < headerRowCount; r++) {
      for (let c = 0; c < numRowDimCols; c++) {
        if (r === headerRowCount - 1) {
          if (rowDimensions.length > 0) {
            sheetData[r][c] = rowDimensions[c]?.name || ''
          } else {
            sheetData[r][c] = columnDimensions.length > 0 ? '值' : ''
          }
        } else {
          sheetData[r][c] = ''
        }
      }
      if (r < headerRowCount - 1 && numRowDimCols > 1) {
        merges.push({ s: { r, c: 0 }, e: { r, c: numRowDimCols - 1 } })
      }
    }

    let headerRow = 0
    const totalStartCol = numRowDimCols + numDataCols

    if (showRow1) {
      for (const ch of columnHeaders) {
        const colSpan = isMultiMeasure && hasColDims
          ? ch.span * selectedMeasures.length
          : ch.span
        const startCol = numRowDimCols + columnHeaders.slice(0, columnHeaders.indexOf(ch)).reduce(
          (acc, prev) => acc + (isMultiMeasure && hasColDims ? prev.span * selectedMeasures.length : prev.span), 0
        )
        sheetData[headerRow][startCol] = ch.label
        if (colSpan > 1) {
          merges.push({ s: { r: headerRow, c: startCol }, e: { r: headerRow, c: startCol + colSpan - 1 } })
        }
      }
      const totalRowSpan = 2
      sheetData[headerRow][totalStartCol] = '合计'
      if (numTotalCols > 1 || totalRowSpan > 1) {
        merges.push({
          s: { r: headerRow, c: totalStartCol },
          e: { r: headerRow + totalRowSpan - 1, c: totalStartCol + numTotalCols - 1 }
        })
      }
      headerRow++
    }

    if (showRow2) {
      if (!hasColDims) {
        for (let mi = 0; mi < selectedMeasures.length; mi++) {
          sheetData[headerRow][numRowDimCols + mi] = selectedMeasures[mi].name
        }
      } else {
        let colOffset = numRowDimCols
        for (const leaf of rawLeafCols) {
          const colSpan = isMultiMeasure ? selectedMeasures.length : 1
          const startCol = colOffset
          sheetData[headerRow][startCol] = leaf.label
          if (colSpan > 1) {
            merges.push({ s: { r: headerRow, c: startCol }, e: { r: headerRow, c: startCol + colSpan - 1 } })
          }
          colOffset += colSpan
        }
      }
      if (!hasColHeaders) {
        sheetData[headerRow][totalStartCol] = '合计'
        if (numTotalCols > 1) {
          merges.push({
            s: { r: headerRow, c: totalStartCol },
            e: { r: headerRow, c: totalStartCol + numTotalCols - 1 }
          })
        }
      }
      headerRow++
    }

    if (showRow3) {
      for (let mi = 0; mi < selectedMeasures.length; mi++) {
        sheetData[headerRow][numRowDimCols + mi] = selectedMeasures[mi].name
      }
      sheetData[headerRow][totalStartCol] = '合计'
      if (numTotalCols > 1) {
        merges.push({
          s: { r: headerRow, c: totalStartCol },
          e: { r: headerRow, c: totalStartCol + numTotalCols - 1 }
        })
      }
      headerRow++
    }

    if (showRow4) {
      let colOffset = numRowDimCols
      for (const leaf of rawLeafCols) {
        for (const m of selectedMeasures) {
          sheetData[headerRow][colOffset] = m.name
          colOffset++
        }
      }
      for (const m of selectedMeasures) {
        sheetData[headerRow][totalStartCol + selectedMeasures.indexOf(m)] = m.name
      }
      headerRow++
    }

    for (let ri = 0; ri < flatRows.length; ri++) {
      const dataRow = headerRowCount + ri
      const row = flatRows[ri]

      for (let lv = 0; lv < row.levelCells.length && lv < numRowDimCols; lv++) {
        const cell = row.levelCells[lv]
        if (cell.rowSpan > 0) {
          sheetData[dataRow][lv] = cell.label
          if (cell.rowSpan > 1) {
            merges.push({
              s: { r: dataRow, c: lv },
              e: { r: dataRow + cell.rowSpan - 1, c: lv }
            })
          }
        }
      }

      for (let mi = 0; mi < measureLeafCols.length; mi++) {
        const mcol = measureLeafCols[mi]
        const cellValue = cells[row.key]?.[mcol.colLeafKey]
        if (cellValue && cellValue[mcol.measure.field] !== undefined) {
          sheetData[dataRow][numRowDimCols + mi] = cellValue[mcol.measure.field]
        }
      }

      for (let ti = 0; ti < selectedMeasures.length; ti++) {
        const m = selectedMeasures[ti]
        const rt = rowTotals[row.key]
        if (rt && rt[m.field] !== undefined) {
          sheetData[dataRow][totalStartCol + ti] = rt[m.field]
        }
      }
    }

    const totalRow = headerRowCount + flatRows.length
    sheetData[totalRow][0] = '合计'
    if (numRowDimCols > 1) {
      merges.push({ s: { r: totalRow, c: 0 }, e: { r: totalRow, c: numRowDimCols - 1 } })
    }

    for (let mi = 0; mi < measureLeafCols.length; mi++) {
      const mcol = measureLeafCols[mi]
      const colTotal = columnTotals[mcol.colLeafKey]
      if (colTotal && colTotal[mcol.measure.field] !== undefined) {
        sheetData[totalRow][numRowDimCols + mi] = colTotal[mcol.measure.field]
      }
    }

    for (let ti = 0; ti < selectedMeasures.length; ti++) {
      const m = selectedMeasures[ti]
      if (grandTotal[m.field] !== undefined) {
        sheetData[totalRow][totalStartCol + ti] = grandTotal[m.field]
      }
    }

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet(sheetData)
    ws['!merges'] = merges

    const headerEndRow = headerRowCount - 1
    const headerMerges = merges.filter(merge => merge.s.r <= headerEndRow)
    const dataMerges = merges.filter(merge => merge.s.r >= headerRowCount)
    ws['!merges'] = headerMerges.concat(dataMerges)

    XLSX.utils.book_append_sheet(wb, ws, '透视分析')
    XLSX.writeFile(wb, `${dataSource.name}_透视分析_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }, [queryResult, dataSource.name, selectedMeasures, rowDimensions, columnDimensions])

  const leafColKeys = useMemo(() => {
    if (!queryResult) return []
    return queryResult.columnHeaders.flatMap(h => h.children || [h])
  }, [queryResult])

  const hasColHeaders = useMemo(() => {
    if (!queryResult) return false
    return queryResult.columnHeaders.length > 0 && queryResult.columnHeaders.some(h => h.children && h.children.length > 0)
  }, [queryResult])

  const hasColDims = columnDimensions.length > 0

  const headerRowCount = useMemo(() => {
    if (!queryResult) return 1
    const showRow1 = hasColHeaders
    const showRow2 = queryResult.columnHeaders.length > 0
    const showRow3 = !hasColHeaders && queryResult.columnHeaders.length === 0
    const showRow4 = selectedMeasures.length > 1 && hasColDims
    return (showRow1 ? 1 : 0) + (showRow2 ? 1 : 0) + (showRow3 ? 1 : 0) + (showRow4 ? 1 : 0)
  }, [queryResult, hasColHeaders, selectedMeasures.length, hasColDims])

  const measureLeafCols = useMemo(() => {
    if (!queryResult) return []
    const rawLeafCols = queryResult.columnHeaders.length > 0
      ? queryResult.columnHeaders.flatMap(h => h.children || [h])
      : [{ key: '__total__', label: '值' }]
    if (selectedMeasures.length <= 1) {
      return rawLeafCols.map(col => ({
        key: col.key,
        label: col.label,
        colLeafKey: col.key,
        measure: selectedMeasures[0],
      }))
    }
    return rawLeafCols.flatMap(col =>
      selectedMeasures.map(m => ({
        key: `${col.key}::${m.field}`,
        label: m.name,
        colLeafKey: col.key,
        measure: m,
      }))
    )
  }, [queryResult, selectedMeasures])

  interface FlatRowItem {
    key: string
    levelCells: { key: string; label: string; rowSpan: number }[]
    isSubtotal?: boolean
    isTotal?: boolean
  }

  const flatRows = useMemo(() => {
    if (!queryResult) return [] as FlatRowItem[]

    const { rowHeaders } = queryResult
    if (rowHeaders.length === 0) return [] as FlatRowItem[]

    function countLeaves(node: PivotRowHeader): number {
      if (!node.children || node.children.length === 0) return 1
      return node.children.reduce((sum, c) => sum + countLeaves(c), 0)
    }

    function collectLeaves(
      node: PivotRowHeader,
      ancestors: { key: string; label: string }[],
      result: FlatRowItem[]
    ) {
      if (!node.children || node.children.length === 0) {
        result.push({
          key: node.key,
          levelCells: [
            ...ancestors.map(a => ({ key: a.key, label: a.label, rowSpan: 0 })),
            { key: node.key, label: node.label, rowSpan: 0 },
          ],
          isSubtotal: node.isSubtotal,
          isTotal: node.isTotal,
        })
        return
      }
      const newAncestors = [...ancestors, { key: node.key, label: node.label }]
      for (const child of node.children) {
        collectLeaves(child, newAncestors, result)
      }
    }

    const result: FlatRowItem[] = []
    for (const header of rowHeaders) {
      collectLeaves(header, [], result)
    }

    const numLevels = result.length > 0 ? result[0].levelCells.length : 0
    for (let level = 0; level < numLevels; level++) {
      let i = 0
      while (i < result.length) {
        const anchorKey = result[i].levelCells[level].key
        let spanCount = 1
        while (i + spanCount < result.length && result[i + spanCount].levelCells[level].key === anchorKey) {
          spanCount++
        }
        result[i].levelCells[level].rowSpan = spanCount
        i += spanCount
      }
    }

    return result
  }, [queryResult])

  const [expandedSections, setExpandedSections] = useState({
    rowDims: true,
    colDims: true,
    measures: true,
    filters: true,
  })

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  return (
    <div className="min-h-screen bg-surface-50">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-surface-200/60">
        <div className="max-w-full mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="btn-ghost">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <span className="text-surface-900 font-bold tracking-tight">SmartPivot</span>
            <span className="text-surface-300 text-xs font-medium mx-1">|</span>
            <span className="text-surface-500 text-sm">透视分析</span>
            <span className="text-surface-300 text-xs font-medium mx-1">|</span>
            <div className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-brand-500" />
              <span className="text-surface-700 text-sm font-medium">{dataSource.name}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center">
                <span className="text-brand-700 text-xs font-bold">
                  {user.username.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-surface-600 text-sm">{user.username}</span>
            </div>
            <button
              onClick={onLogout}
              className="btn-ghost text-surface-400 hover:text-red-500"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">退出</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-3.5rem)]">
        {!browseMode && (
        <div className="w-1/4 min-w-[280px] max-w-[360px] shrink-0 border-r border-surface-200 bg-white flex flex-col">
          <div className="flex flex-col flex-[1] min-h-0 overflow-hidden">
            <div className="px-3 py-2.5 border-b border-surface-200/60 bg-surface-50/30">
              <div className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-brand-500" />
                <span className="text-xs font-semibold text-surface-700">数据</span>
              </div>
            </div>
            <div className="p-3 space-y-3 flex-1 overflow-y-auto scrollbar-thin">
              {loadingMeta && (
                <div className="space-y-2.5">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="skeleton-pulse h-7 w-full" />
                  ))}
                </div>
              )}

              {!loadingMeta && metaError && (
                <div className="text-center py-6">
                  <p className="text-surface-500 text-sm mb-3">{metaError}</p>
                  <button onClick={() => window.location.reload()} className="btn-secondary btn-sm">
                    重新加载
                  </button>
                </div>
              )}

              {!loadingMeta && !metaError && (
                <>
                  <div>
                    <p className="text-2xs font-semibold text-surface-500 uppercase tracking-wider mb-1">
                      维度 <span className="text-surface-400">{availableDimensions.length}</span>
                    </p>
                  <div className="space-y-1">
                    {dimensionCategories.map(cat => (
                      <div key={cat.name}>
                        <button
                          onClick={() => setExpandedDimCats(prev => ({ ...prev, [cat.name]: !prev[cat.name] }))}
                          className="flex items-center gap-1 w-full text-left py-0.5"
                        >
                          {expandedDimCats[cat.name] ? (
                            <ChevronDown className="w-3 h-3 text-surface-400" />
                          ) : (
                            <ChevronRight className="w-3 h-3 text-surface-400" />
                          )}
                          <span className="text-2xs font-medium text-surface-500">{cat.name}</span>
                          <span className="text-2xs text-surface-400 ml-auto">
                            {cat.dimensions.filter(d => !isDimUsed(d)).length}
                          </span>
                        </button>
                        {expandedDimCats[cat.name] && (
                          <div className="ml-3 space-y-0.5">
                            {cat.dimensions.map(dim => {
                              const used = isDimUsed(dim)
                              return (
                                <div
                                  key={dim.id}
                                  draggable={!used}
                                  onDragStart={used ? undefined : () => handleDragStart('dimension', dim)}
                                  className={`drag-chip ${used ? 'opacity-60' : 'cursor-grab active:cursor-grabbing'}`}
                                >
                                  {used ? (
                                    <Check className="w-3 h-3 text-brand-500" />
                                  ) : (
                                    <GripVertical className="w-3 h-3 text-surface-300" />
                                  )}
                                  <span>{dim.name}</span>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                    {availableDimensions.length === 0 && (
                      <p className="text-surface-400 text-2xs px-1">所有维度已使用</p>
                    )}
                  </div>
                  </div>

                  <div>
                    <p className="text-2xs font-semibold text-surface-500 uppercase tracking-wider mb-1">
                      度量 <span className="text-surface-400">{availableMeasures.length}</span>
                    </p>
                  <div className="space-y-1">
                    {measureCategories.map(cat => (
                      <div key={cat.name}>
                        <button
                          onClick={() => setExpandedMeasureCats(prev => ({ ...prev, [cat.name]: !prev[cat.name] }))}
                          className="flex items-center gap-1 w-full text-left py-0.5"
                        >
                          {expandedMeasureCats[cat.name] ? (
                            <ChevronDown className="w-3 h-3 text-surface-400" />
                          ) : (
                            <ChevronRight className="w-3 h-3 text-surface-400" />
                          )}
                          <span className="text-2xs font-medium text-surface-500">{cat.name}</span>
                          <span className="text-2xs text-surface-400 ml-auto">
                            {cat.measures.filter(m => !isMeasureUsed(m)).length}
                          </span>
                        </button>
                        {expandedMeasureCats[cat.name] && (
                          <div className="ml-3 space-y-0.5">
                            {cat.measures.map(m => {
                              const used = isMeasureUsed(m)
                              return (
                                <div
                                  key={m.id}
                                  draggable={!used}
                                  onDragStart={used ? undefined : () => handleDragStart('measure', m)}
                                  className={`drag-chip ${used ? 'opacity-60' : 'cursor-grab active:cursor-grabbing'}`}
                                >
                                  {used ? (
                                    <Check className="w-3 h-3 text-brand-500" />
                                  ) : (
                                    <GripVertical className="w-3 h-3 text-surface-300" />
                                  )}
                                  <span>{m.name}</span>
                                  <span className="text-2xs text-surface-400 ml-auto">{m.aggregation}</span>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                    {availableMeasures.length === 0 && (
                      <p className="text-surface-400 text-2xs px-1">所有度量已使用</p>
                    )}
                  </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col flex-[1] min-h-0 border-t border-surface-200">
            <div className="px-3 py-2.5 border-b border-surface-200/60 bg-surface-50/30">
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-brand-500" />
                <span className="text-xs font-semibold text-surface-700">设置</span>
              </div>
            </div>
            <div className="p-3 space-y-3 flex-1 overflow-y-auto scrollbar-thin">
              <div>
                <button
                  onClick={() => toggleSection('rowDims')}
                  className="flex items-center gap-1 w-full text-left mb-1.5"
                >
                  {expandedSections.rowDims ? (
                    <ChevronDown className="w-3 h-3 text-surface-400" />
                  ) : (
                    <ChevronRight className="w-3 h-3 text-surface-400" />
                  )}
                  <span className="text-2xs font-medium text-surface-600">行维度</span>
                  <span className="text-2xs text-surface-400 ml-auto">{rowDimensions.length}</span>
                </button>
                {expandedSections.rowDims && (
                  <div
                    className={`drag-zone ${dragOverZone === 'row' ? 'drag-zone-active' : ''}`}
                    onDragOver={(e) => handleDragOver(e, 'row')}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDropRow}
                  >
                    {rowDimensions.map(dim => (
                      <div key={dim.id} className="drag-chip drag-chip-active text-xs">
                        <span>{dim.name}</span>
                        <button
                          onClick={() => removeRowDim(dim)}
                          className="text-surface-400 hover:text-red-500 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {rowDimensions.length === 0 && (
                      <span className="text-surface-400 text-2xs px-1">拖拽维度到此处</span>
                    )}
                  </div>
                )}
              </div>

              <div>
                <button
                  onClick={() => toggleSection('colDims')}
                  className="flex items-center gap-1 w-full text-left mb-1.5"
                >
                  {expandedSections.colDims ? (
                    <ChevronDown className="w-3 h-3 text-surface-400" />
                  ) : (
                    <ChevronRight className="w-3 h-3 text-surface-400" />
                  )}
                  <span className="text-2xs font-medium text-surface-600">列维度</span>
                  <span className="text-2xs text-surface-400 ml-auto">{columnDimensions.length}</span>
                </button>
                {expandedSections.colDims && (
                  <div
                    className={`drag-zone ${dragOverZone === 'column' ? 'drag-zone-active' : ''}`}
                    onDragOver={(e) => handleDragOver(e, 'column')}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDropColumn}
                  >
                    {columnDimensions.map(dim => (
                      <div key={dim.id} className="drag-chip drag-chip-active text-xs">
                        <span>{dim.name}</span>
                        <button
                          onClick={() => removeColDim(dim)}
                          className="text-surface-400 hover:text-red-500 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {columnDimensions.length === 0 && (
                      <span className="text-surface-400 text-2xs px-1">拖拽维度到此处</span>
                    )}
                  </div>
                )}
              </div>

              <div>
                <button
                  onClick={() => toggleSection('measures')}
                  className="flex items-center gap-1 w-full text-left mb-1.5"
                >
                  {expandedSections.measures ? (
                    <ChevronDown className="w-3 h-3 text-surface-400" />
                  ) : (
                    <ChevronRight className="w-3 h-3 text-surface-400" />
                  )}
                  <span className="text-2xs font-medium text-surface-600">度量</span>
                  <span className="text-2xs text-surface-400 ml-auto">{selectedMeasures.length}</span>
                </button>
                {expandedSections.measures && (
                  <div
                    className={`drag-zone ${dragOverZone === 'measure' ? 'drag-zone-active' : ''}`}
                    onDragOver={(e) => handleDragOver(e, 'measure')}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDropMeasure}
                  >
                    {selectedMeasures.map(m => (
                      <div key={m.id} className="drag-chip drag-chip-active text-xs">
                        <span>{m.name}</span>
                        <button
                          onClick={() => removeMeasure(m)}
                          className="text-surface-400 hover:text-red-500 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {selectedMeasures.length === 0 && (
                      <span className="text-surface-400 text-2xs px-1">拖拽度量到此处</span>
                    )}
                  </div>
                )}
              </div>

              <div>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleSection('filters')}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSection('filters') } }}
                  className="flex items-center gap-1 w-full text-left mb-1.5 cursor-pointer"
                >
                  {expandedSections.filters ? (
                    <ChevronDown className="w-3 h-3 text-surface-400" />
                  ) : (
                    <ChevronRight className="w-3 h-3 text-surface-400" />
                  )}
                  <span className="text-2xs font-medium text-surface-600">筛选器</span>
                  <button onClick={(e) => { e.stopPropagation(); addFilter() }} className="btn-ghost btn-xs ml-auto text-brand-600 hover:text-brand-700">
                    <Plus className="w-2.5 h-2.5" />
                    <span>添加</span>
                  </button>
                </div>
                {expandedSections.filters && (
                  <div className="space-y-1.5">
                    {filters.map(f => {
                      const dim = dimensions.find(d => d.field === f.field)
                      const isMultiSelect = f.mode === 'multiSelect'
                      const uniqueValues = filterUniqueValues[f.field] || []
                      const filteredValues = uniqueValues.filter(v =>
                        !filterSearchText[f.id] ||
                        v.toLowerCase().includes(filterSearchText[f.id].toLowerCase())
                      )
                      const selectedCount = f.selectedValues.length

                      return (
                        <div key={f.id} className="flex flex-col gap-1 filter-dropdown">
                          <div className="flex items-center gap-1">
                            <select
                              value={f.field}
                              onChange={e => {
                                updateFilter(f.id, { field: e.target.value })
                                loadUniqueValues(e.target.value)
                              }}
                              className="input-field !py-1 text-xs flex-1"
                            >
                              {dimensions.map(d => (
                                <option key={d.field} value={d.field}>{d.name}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => removeFilter(f.id)}
                              className="btn-ghost btn-xs text-surface-400 hover:text-red-500 shrink-0"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>

                          {isMultiSelect ? (
                            <div className="relative">
                              <button
                                onClick={() => {
                                  loadUniqueValues(f.field)
                                  setFilterDropdownOpen(filterDropdownOpen === f.id ? null : f.id)
                                  setFilterSearchText(prev => ({ ...prev, [f.id]: '' }))
                                }}
                                className="input-field !py-1 text-xs w-full text-left flex items-center justify-between"
                              >
                                <span className={selectedCount > 0 ? 'text-surface-900' : 'text-surface-400'}>
                                  {selectedCount > 0
                                    ? `已选 ${selectedCount} 项`
                                    : dim ? `选择${dim.name}` : '选择值'}
                                </span>
                                <ChevronDown className={`w-3 h-3 text-surface-400 transition-transform ${filterDropdownOpen === f.id ? 'rotate-180' : ''}`} />
                              </button>

                              {filterDropdownOpen === f.id && (
                                <div className="absolute top-full left-0 right-0 mt-0.5 bg-white border border-surface-200 rounded-lg shadow-lg z-50 max-h-48 overflow-hidden flex flex-col">
                                  <div className="flex items-center gap-1 px-2 py-1.5 border-b border-surface-100">
                                    <Search className="w-3 h-3 text-surface-400 shrink-0" />
                                    <input
                                      type="text"
                                      value={filterSearchText[f.id] || ''}
                                      onChange={e => setFilterSearchText(prev => ({ ...prev, [f.id]: e.target.value }))}
                                      placeholder="搜索..."
                                      className="flex-1 text-xs bg-transparent border-none outline-none placeholder-surface-300"
                                      onClick={e => e.stopPropagation()}
                                    />
                                  </div>
                                  <div className="flex items-center gap-1 px-2 py-1 border-b border-surface-100">
                                    <button
                                      onClick={() => {
                                        updateFilter(f.id, { selectedValues: [...uniqueValues] })
                                      }}
                                      className="text-2xs text-brand-600 hover:text-brand-700"
                                    >
                                      全选
                                    </button>
                                    <button
                                      onClick={() => updateFilter(f.id, { selectedValues: [] })}
                                      className="text-2xs text-surface-400 hover:text-surface-600"
                                    >
                                      清除
                                    </button>
                                  </div>
                                  <div className="overflow-y-auto flex-1">
                                    {filteredValues.length === 0 ? (
                                      <p className="text-2xs text-surface-400 px-2 py-2">无匹配项</p>
                                    ) : (
                                      filteredValues.map(v => {
                                        const isChecked = f.selectedValues.includes(v)
                                        return (
                                          <label
                                            key={v}
                                            className="flex items-center gap-1.5 px-2 py-1 hover:bg-surface-50 cursor-pointer text-xs"
                                            onClick={() => {
                                              setFilters(prev => prev.map(item => {
                                                if (item.id !== f.id) return item
                                                const idx = item.selectedValues.indexOf(v)
                                                return {
                                                  ...item,
                                                  selectedValues: idx >= 0
                                                    ? item.selectedValues.filter(x => x !== v)
                                                    : [...item.selectedValues, v]
                                                }
                                              }))
                                            }}
                                          >
                                            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                              isChecked
                                                ? 'bg-brand-600 border-brand-600'
                                                : 'border-surface-300 bg-white'
                                            }`}>
                                              {isChecked && <Check className="w-2.5 h-2.5 text-white" />}
                                            </div>
                                            <span className="text-surface-700 truncate">{v}</span>
                                          </label>
                                        )
                                      })
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={f.rangeMin}
                                onChange={e => updateFilter(f.id, { rangeMin: e.target.value })}
                                placeholder="最小值"
                                className="input-field !py-1 text-xs flex-1"
                              />
                              <span className="text-surface-400 text-xs shrink-0">-</span>
                              <input
                                type="number"
                                value={f.rangeMax}
                                onChange={e => updateFilter(f.id, { rangeMax: e.target.value })}
                                placeholder="最大值"
                                className="input-field !py-1 text-xs flex-1"
                              />
                            </div>
                          )}
                        </div>
                      )
                    })}
                    {filters.length === 0 && (
                      <p className="text-surface-400 text-2xs px-1">暂无筛选条件</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        )}

        <div className="flex-1 flex flex-col min-w-0">
          <div className="px-4 py-3 border-b border-surface-200 bg-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Table2 className="w-4 h-4 text-surface-400" />
              <span className="text-sm font-medium text-surface-600">透视表</span>
              {queryResult && (
                <span className="text-2xs text-surface-400 bg-surface-100 px-1.5 py-0.5 rounded">
                  {flatRows.length} 行
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRunQuery}
                disabled={querying || selectedMeasures.length === 0}
                className="btn-primary btn-sm"
              >
                {querying ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    查询中...
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    执行查询
                  </>
                )}
              </button>

              <button
                onClick={() => setBrowseMode(v => !v)}
                className="btn-ghost btn-sm text-surface-500 hover:text-brand-600"
              >
                {browseMode ? (
                  <PanelLeftOpen className="w-3.5 h-3.5" />
                ) : (
                  <PanelLeftClose className="w-3.5 h-3.5" />
                )}
                <span>{browseMode ? '退出浏览' : '浏览模式'}</span>
              </button>

              {queryResult && (
                <button onClick={handleExportExcel} className="btn-secondary btn-sm">
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>导出 Excel</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-auto scrollbar-thin p-4">
            {queryError && (
              <div className="card p-8 text-center animate-fade-in mb-4">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
                  <Filter className="w-5 h-5 text-red-500" />
                </div>
                <p className="text-surface-600 text-sm mb-4">{queryError}</p>
                <button onClick={handleRunQuery} className="btn-secondary btn-sm">重试</button>
              </div>
            )}

            {!queryResult && !queryError && !querying && !hasQueried && (
              <div className="card p-12 text-center animate-fade-in h-full flex flex-col items-center justify-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-surface-100 flex items-center justify-center">
                  <Table2 className="w-7 h-7 text-surface-300" />
                </div>
                <h3 className="text-surface-700 font-semibold mb-2">配置分析视图</h3>
                <p className="text-surface-400 text-sm max-w-sm">
                  从左侧「数据」面板拖拽维度和度量到「设置」面板，然后点击「执行查询」生成透视表。
                </p>
              </div>
            )}

            {querying && (
              <div className="card p-12 text-center animate-fade-in h-full flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin mb-4" />
                <p className="text-surface-500 text-sm">正在查询数据...</p>
              </div>
            )}

            {queryResult && hasQueried && !querying && (
              <div className="card overflow-hidden animate-fade-in">
                <div
                  ref={splitContainerRef}
                  className="pivot-split-container max-h-[calc(100vh-14rem)]"
                >
                  <div
                    ref={rowHeaderPanelRef}
                    className={`pivot-row-header-panel pivot-row-header-scroll ${showRowHeaderScrollbar ? 'scrollbar-thin' : ''}`}
                    onScroll={syncRowHeaderScroll}
                  >
                    <table className="pivot-table pivot-row-header-table">
                      <thead>
                        {Array.from({ length: headerRowCount }).map((_, idx) => {
                          const isLastRow = idx === headerRowCount - 1
                          if (isLastRow) {
                            if (rowDimensions.length > 0) {
                              return (
                                <tr key={idx}>
                                  {rowDimensions.map(dim => (
                                    <th key={dim.id} className="top-left px-4 py-2">
                                      {dim.name}
                                    </th>
                                  ))}
                                </tr>
                              )
                            }
                            return (
                              <tr key={idx}>
                                <th className="top-left px-4 py-2">
                                  {columnDimensions.length > 0 ? '值' : ''}
                                </th>
                              </tr>
                            )
                          }
                          return (
                            <tr key={idx}>
                              <th
                                className="top-left px-4 py-2"
                                colSpan={rowDimensions.length > 0 ? rowDimensions.length : 1}
                              >
                                &nbsp;
                              </th>
                            </tr>
                          )
                        })}
                      </thead>
                      <tbody>
                        {flatRows.length > 0 ? (
                          flatRows.map(row => (
                            <tr key={row.key}>
                              {row.levelCells.map(cell =>
                                cell.rowSpan > 0 ? (
                                  <td
                                    key={cell.key}
                                    className={`row-header ${row.isTotal ? 'total-row' : row.isSubtotal ? 'subtotal-row' : ''}`}
                                    rowSpan={cell.rowSpan}
                                  >
                                    <span>{cell.label}</span>
                                  </td>
                                ) : null
                              )}
                            </tr>
                          ))
                        ) : queryResult.rowHeaders.length === 0 ? (
                          <tr>
                            <td
                              className="px-4 py-8 text-center text-surface-400 text-sm"
                              colSpan={rowDimensions.length || 1}
                            >
                              选中的维度和度量组合暂无数据
                            </td>
                          </tr>
                        ) : null}
                        <tr>
                          <td
                            className="total-row px-4 py-2 font-bold text-surface-800"
                            colSpan={rowDimensions.length || 1}
                          >
                            合计
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div
                    ref={dataPanelRef}
                    className="pivot-data-panel scrollbar-thin"
                    onScroll={syncVerticalScroll}
                  >
                    <table className="pivot-table pivot-data-table">
                      <thead>
                        {hasColHeaders && (
                          <tr>
                            {queryResult.columnHeaders.map(ch => (
                              <th
                                key={ch.key}
                                className="px-4 py-2 text-center"
                                colSpan={
                                  selectedMeasures.length > 1 && hasColDims
                                    ? ch.span * selectedMeasures.length
                                    : ch.span
                                }
                              >
                                {ch.label}
                              </th>
                            ))}
                            <th
                              className="px-4 py-2 text-center"
                              colSpan={selectedMeasures.length > 1 ? selectedMeasures.length : 1}
                              rowSpan={2}
                            >
                              合计
                            </th>
                          </tr>
                        )}
                        {queryResult.columnHeaders.length > 0 && (
                          <tr>
                            {!hasColDims
                              ? selectedMeasures.map(m => (
                                  <th key={m.id} className="px-4 py-2 text-center">
                                    {m.name}
                                  </th>
                                ))
                              : leafColKeys.map(leaf => (
                                  <th
                                    key={leaf.key}
                                    className="px-4 py-2 text-center"
                                    colSpan={
                                      selectedMeasures.length > 1
                                        ? selectedMeasures.length
                                        : 1
                                    }
                                  >
                                    {leaf.label}
                                  </th>
                                ))}
                            {!hasColHeaders && (
                              <th
                                className="px-4 py-2 text-center"
                                colSpan={selectedMeasures.length > 1 ? selectedMeasures.length : 1}
                                rowSpan={1}
                              >
                                合计
                              </th>
                            )}
                          </tr>
                        )}
                        {!hasColHeaders && queryResult.columnHeaders.length === 0 && (
                          <tr>
                            {selectedMeasures.map(m => (
                              <th key={m.id} className="px-4 py-2 text-center">
                                {m.name}
                              </th>
                            ))}
                            <th
                              className="px-4 py-2 text-center"
                              colSpan={selectedMeasures.length > 1 ? selectedMeasures.length : 1}
                            >
                              合计
                            </th>
                          </tr>
                        )}
                        {selectedMeasures.length > 1 && hasColDims && (
                          <tr>
                            {leafColKeys.flatMap(leaf =>
                              selectedMeasures.map(m => (
                                <th
                                  key={`${leaf.key}::${m.field}`}
                                  className="px-4 py-2 text-center text-2xs text-surface-500"
                                >
                                  {m.name}
                                </th>
                              ))
                            )}
                            {selectedMeasures.map(m => (
                              <th
                                key={`subtotal::${m.field}`}
                                className="px-4 py-2 text-center text-2xs text-surface-500"
                              >
                                {m.name}
                              </th>
                            ))}
                          </tr>
                        )}
                      </thead>
                      <tbody>
                        {flatRows.length > 0 ? (
                          flatRows.map(row => (
                            <tr key={row.key}>
                              {measureLeafCols.map(mcol => {
                                const cellValue =
                                  queryResult.cells[row.key]?.[mcol.colLeafKey]
                                return (
                                  <td
                                    key={mcol.key}
                                    className={`num-cell ${row.isTotal ? 'total-cell' : ''}`}
                                  >
                                    {cellValue &&
                                    cellValue[mcol.measure.field] !== undefined
                                      ? formatNumber(
                                          cellValue[mcol.measure.field],
                                          mcol.measure.format
                                        )
                                      : <span className="text-surface-300">-</span>}
                                  </td>
                                )
                              })}
                              {selectedMeasures.map(m => {
                                const rt = queryResult.rowTotals[row.key]
                                return (
                                  <td
                                    key={`${row.key}::${m.field}`}
                                    className="num-cell total-cell"
                                  >
                                    {rt && rt[m.field] !== undefined
                                      ? formatNumber(rt[m.field], m.format)
                                      : <span className="text-surface-300">-</span>}
                                  </td>
                                )
                              })}
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              className="px-4 py-8 text-center text-surface-400 text-sm"
                              colSpan={measureLeafCols.length + selectedMeasures.length}
                            >
                              &nbsp;
                            </td>
                          </tr>
                        )}
                        <tr>
                          {measureLeafCols.map(mcol => {
                            const colTotal =
                              queryResult.columnTotals[mcol.colLeafKey]
                            return (
                              <td key={mcol.key} className="num-cell total-cell">
                                {colTotal &&
                                colTotal[mcol.measure.field] !== undefined
                                  ? formatNumber(
                                      colTotal[mcol.measure.field],
                                      mcol.measure.format
                                    )
                                  : <span className="text-surface-300">-</span>}
                              </td>
                            )
                          })}
                          {selectedMeasures.map(m => (
                            <td
                              key={`grand::${m.field}`}
                              className="num-cell total-cell"
                            >
                              {formatNumber(
                                queryResult.grandTotal[m.field] || 0,
                                m.format
                              )}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
