import type { SearchParamsModal } from './search'
import type { BaseResponse, DataResponse, PageResponse } from './axios'

export default interface APIModel<T = unknown> {
  get: (search?: SearchParamsModal) => Promise<PageResponse<T>>
  getOne: (id: number) => Promise<DataResponse<T>>
  post?: (data: T) => Promise<BaseResponse | DataResponse<T>>
  put?: (id: number, data: T) => Promise<BaseResponse | DataResponse<T>>
  delete?: (id: number) => Promise<BaseResponse | DataResponse<T>>
}
