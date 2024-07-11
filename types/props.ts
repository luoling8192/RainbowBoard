import type { DataTableColumn, FormRules } from 'naive-ui'
import type APIModel from './api'
import type ConfigModel from './config'

export default interface DataTableProps<T = unknown> {
  name: string
  config: ConfigModel
  lang: string
  disableCreateModal?: boolean
  selection?: boolean

  columns: string[] | DataTableColumn<T>[]
  actionSlot?: (row: any) => JSX.Element
  formRules?: FormRules

  prefix?: (data: any) => any
  suffix?: (data: any) => any

  api: APIModel<T>
  global?: {
    type: 'forward' | 'nat'
    role: 'admin' | 'user'
  }
  actions?: any[]
}
