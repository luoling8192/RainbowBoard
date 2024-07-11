export default interface ConfigModel {
  form: string[]
  info: string[]
  search?: string[]

  number?: string[]
  boolean?: string[]

  example: Record<string, any>

  placeholder: Record<string, string>
  suffix: Record<string, string>
  collapse?: Record<string, string[]>

  custom?: string[]
}
