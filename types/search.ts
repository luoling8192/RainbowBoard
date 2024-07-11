export interface SearchParamsModal {
  limit: number
  offset: number

  filter: string
  search: string
  exact: boolean | 0 | 1

  order: string
  sort: 'asc' | 'desc'
}

export interface SearchItem {
  type: SearchType
  name: string
  fuzzy: boolean
  searchList: string[]
}

export enum SearchType {
  Filter,
  Keyword,
}
