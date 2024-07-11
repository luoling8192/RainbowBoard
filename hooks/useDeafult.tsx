import { NButton, NDatePicker, NInput, NInputGroup, NInputNumber, NSwitch } from 'naive-ui'
import type ConfigModel from '~/types/config'

export const useDefaultType = computed(() => {
  return (config: ConfigModel) => {
    const boolean = [] as string[]
    const number = [] as string[]

    Object.values(config.example).forEach((item, index) => {
      if (typeof item === 'boolean')
        boolean.push(Object.keys(config.example)[index])
      else if (typeof item === 'number')
        number.push(Object.keys(config.example)[index])
    })

    return {
      boolean,
      number,
    }
  }
})

export function useDefaultComponent(defaultType: any, config: ConfigModel, key: string, formValue: Ref<any>) {
  if (defaultType.value.boolean.includes(key)) {
    return (<NSwitch v-model:value={formValue.value[key]} />)
  }
  else if (key === 'order' || key === 'balance') {
    return (
      <NInputNumber v-model:value={formValue.value[key]}>
        {{ suffix: () => config?.suffix[key] }}
      </NInputNumber>
    )
  }
  else if (key.match('traffic')) {
    if (formValue.value[key])
      formValue.value[key] = Number(Number(formValue.value[key]).toFixed(2))
    return (
      <NInputNumber v-model:value={formValue.value[key]} min="0.0001">
        {{ suffix: () => 'GB' }}
      </NInputNumber>
    )
  }
  else if (defaultType.value.number.includes(key)) {
    return (
      <NInputNumber v-model:value={formValue.value[key]} min="0">
        {{ suffix: () => config?.suffix[key] }}
      </NInputNumber>
    )
  }
  else if (key.match('date')) {
    if (formValue.value[key]?.match('0001-01-01'))
      formValue.value[key] = null
    return (
      <NDatePicker
        v-model:formatted-value={formValue.value[key]}
        value-format="yyyy-MM-dd"
        clearable
        type="date"
      />
    )
  }
  else if (key === 'conf') {
    if (!formValue.value[key])
      formValue.value[key] = []
    // console.log(formValue.value[key])
    return (
      <div>
        {formValue.value[key]?.map((item: { Key: string, Value: string }, index: number) => (
          <div key={`conf-${index}`}>
            <NInputGroup>
              <NInput v-model:value={item.Key} placeholder="键" />
              <NInput v-model:value={item.Value} placeholder="值" />
              <NButton onClick={() => {
                formValue.value[key] = formValue.value[key].filter((_, i) => i !== index)
                // 使用Vue.js的$set方法确保触发视图更新
                // this.$set(formValue.value, key, formValue.value[key])
              }}
              >
                删除
              </NButton>
            </NInputGroup>
          </div>
        ))}
        <NButton onClick={() => formValue.value[key] = [...formValue.value[key], { Key: '', Value: '' }]}>
          添加
        </NButton>
      </div>
    )
  }
  else {
    return (
      <NInput v-model:value={formValue.value[key]} placeholder={config?.placeholder[key]}>
        {{ suffix: () => config?.suffix[key] }}
      </NInput>
    )
  }
}
