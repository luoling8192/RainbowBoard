// 响应类型
export interface BaseResponse {
  Ok: boolean
  Msg?: string
}

// 响应类型（数据）
export interface DataResponse<T = any> extends BaseResponse {
  Data: T
}

// 响应类型（分页）
export interface PageResponse<T = any> extends BaseResponse {
  Data: T
  Count: number
}
