<script setup lang="tsx">
import type { FormInst } from 'naive-ui'
import { NButton } from 'naive-ui'
import Batch from './Batch.vue'
import type DataTableProps from '@/types/props'
import useBatch from '~/hooks/useBatch'
import { useColumns } from '~/hooks/useColumns'
import usePagination from '~/hooks/usePagination'
import { useSearch } from '~/hooks/useSearch'

const props = defineProps<DataTableProps<unknown>>()
const emit = defineEmits(['interface', 'closeModal', 'submitted'])
const message = useMessage()

// Post means create, Put means update
const formType = ref<'post' | 'put'>('post')
const showModal = ref(false)
const { searchProps } = useSearch()

const formRef = ref<FormInst | null>(null)
const formValue = ref<Record<string, any>>({})
const intervalId = ref()

const formLoading = ref(true)
const submitLoading = ref(false)
const data = ref([] as any)
const { selectedRow, hasSelection } = useBatch()
const columns = useColumns()
const pagination = usePagination()

function prefix(data: { [key: string]: any }) {
  Object.keys(data).forEach((key) => {
    if (key === 'conf')
      data[key] = Object.entries(data[key]).map(([Key, Value]) => ({ Key, Value }))
  })

  if ('prefix' in props && typeof props.prefix === 'function')
    data = props.prefix(data)

  return data
}

function loadData() {
  formLoading.value = true

  props.api.get(searchProps.value).then((res) => {
    const { Data } = res
    data.value = Data
    data.value.forEach((item: any) => {
      prefix(item)
    })
  }).catch((err) => {
    message.error(err?.Msg ?? err?.message ?? '未知错误')
  }).finally(() => {
    formLoading.value = false
  })
}

function submit() {
  formValue.value = Object.fromEntries(
    Object.entries(formValue.value)
      .filter(([key, _]) => !(props.config.info.includes(key))),
  )
  console.log(formValue.value)

  submitLoading.value = true
  formRef.value?.validate((err) => {
    if (err) {
      message.error(err[0][0]?.message || '请补全所需信息!')
      submitLoading.value = false
    }
    else {
      let sendData = useCloneDeep(formValue.value)

      Object.keys(sendData).forEach((key) => {
        if (key === 'conf') {
          sendData[key] = sendData[key]?.reduce((acc: any, cur: any) => {
            acc[cur.Key] = cur.Value
            return acc
          }, {})
        }
      })

      if ('suffix' in props && typeof props.suffix === 'function')
        sendData = props.suffix(sendData)

      console.log(sendData)
      if (formType.value === 'post') {
        props.api.post!(sendData).then(() => {
          message.success('添加成功')
          showModal.value = false
          loadData()
        }).catch((err) => {
          message.error(err.Msg)
        }).finally(() => {
          submitLoading.value = false
        })
      }
      else {
        props.api.put!(formValue.value.id, sendData).then(() => {
          message.success('修改成功')
          showModal.value = false
          loadData()
        }).catch((err) => {
          message.error(err.Msg)
        }).finally(() => {
          submitLoading.value = false
        })
      }
    }
  })
  emit('submitted')
}

onMounted(() => {
  loadData()
  emit('interface', {
    loadData: () => loadData(),
  })
  intervalId.value = setInterval(loadData, 30000)
})

onBeforeUnmount(() => {
  clearInterval(intervalId.value)
})

defineExpose({
  props,
  formType,
  showModal,
  formValue,
  loadData,
})
</script>

<template>
  <NSpin :show="formLoading">
    <Search />
    <Batch />

    <div class="relative">
      <NDataTable
        :columns
        :data
        :scroll-x="1200"
        :pagination
        :row-key="(row) => row.id"
        @update:checked-row-keys="handleSelectRows"
      />
    </div>

    <NModal
      :show="showModal"
      preset="card"
      :title="formType === 'post' ? `新建${props.name}` : `编辑${props.name}`"
      class="w-[90%] rounded-md sm:w-3/4"
      @close="() => {
        showModal = false
        formValue = {}
        emit('closeModal')
      }"
    >
      <div class="max-h-[80vh] overflow-y-auto px-4">
        <NForm
          v-if="formType === 'put'"
          label-placement="left"
        >
          <NFormItem
            v-for="key in props.config.info"
            :key="`info-${key}`"
            :label="t(`${props.lang}.${key}`)"
          >
            {{ formValue[key] }}
          </NFormItem>
          <NDivider />
        </NForm>

        <NForm
          ref="formRef"
          label-placement="left"
          :model="formValue"
        >
          <template v-for="key in props.config.form" :key="`form-${key}`">
            <!-- 分割线 -->
            <NDivider v-if="key === '-'" />

            <!-- Collapse 展开 -->
            <NFormItem v-else-if="key.startsWith('--')">
              <NCollapse v-if="props.config.collapse">
                <NCollapseItem :title="key.split('--')[1]">
                  <div
                    v-for="collapseKey in props.config.collapse[key.split('--')[1]]"
                    :key="`collapse-${collapseKey}`"
                  >
                    <div v-if="props.config.custom && props.config.custom.includes(collapseKey)">
                      <slot
                        :key="`rule-${collapseKey}`"
                        :name="`rule-${collapseKey}`"
                        :value="formValue[collapseKey]"
                        :form-type="formType"
                        :data="formValue"
                        :update-value="(e) => formValue[collapseKey] = e"
                      />
                    </div>

                    <NFormItem
                      v-else
                      :label="t(`${props.lang}.${collapseKey}`)"
                    >
                      <slot
                        :key="`rule-${collapseKey}`"
                        :name="`rule-${collapseKey}`"
                        :value="formValue[collapseKey]"
                        :form-type="formType"
                        :data="formValue"
                        :update-value="(e) => formValue[collapseKey] = e"
                      >
                        <!-- 默认内容，如果父组件没有提供插槽内容，则渲染下面的 -->
                        <component :is="getDefaultComponent(collapseKey)" />
                      </slot>
                    </NFormItem>
                  </div>
                </NCollapseItem>
              </NCollapse>
            </NFormItem>

            <!-- 不渲染 NFomItem，自定义渲染 -->
            <div v-else-if="props.config.custom && props.config.custom.includes(key)">
              <slot
                :key="`rule-${key}`"
                :name="`rule-${key}`"
                :value="formValue[key]"
                :form-type="formType"
                :data="formValue"
                :update-value="(e) => formValue[key] = e"
              />
            </div>

            <!-- 正常渲染 NFomItem -->
            <NFormItem
              v-else
              :label="t(`${props.lang}.${key}`)"
            >
              <slot
                :key="`rule-${key}`"
                :name="`rule-${key}`"
                :value="formValue[key]"
                :form-type="formType"
                :data="formValue"
                :update-value="(e) => formValue[key] = e"
              >
                <!-- 默认内容，如果父组件没有提供插槽内容，则渲染下面的 -->
                <component :is="getDefaultComponent(key)" />
              </slot>
            </NFormItem>
          </template>

          <NFormItem>
            <NButton :disable="submitLoading" :loading="submitLoading" @click="submit">
              确认
            </NButton>
          </NFormItem>
        </NForm>
      </div>
    </NModal>
  </NSpin>
</template>
