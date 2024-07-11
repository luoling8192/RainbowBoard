<script setup lang="ts">
const searchType = computed(() => {
  let ret: { label: string, value: string }[]

  if (props.config?.search) {
    ret = props.config.search.map(item => ({ label: t(`${props.lang}.${item}`), value: item }))
  }
  else {
    if (typeof props.columns[0] === 'string')
      ret = (props.columns as string[]).map(item => ({ label: t(`${props.lang}.${item}`), value: item }))
    else
      ret = props.columns.map(item => ({ label: (item as unknown)?.title, value: (item as unknown)?.key }))
  }

  ret.unshift({ label: 'ID', value: 'id' })
  return ret
})
</script>

<template>
  <div class="hidden lg:flex md:flex">
    <NForm inline class="w-full">
      <NFormItem label="搜索列">
        <NSelect
          v-model:value="searchProps.filter"
          :options="searchType"
          class="min-w-28"
        />
      </NFormItem>
      <NFormItem label="关键词">
        <NInput
          v-model:value="searchProps.search"
          placeholder="搜索"
          clearable
        />
      </NFormItem>
      <NFormItem label="精确搜索">
        <NSwitch v-model:value="searchProps.exact" />
      </NFormItem>
      <NFormItem>
        <NButton @click="() => loadData()">
          搜索
        </NButton>
      </NFormItem>
    </NForm>
  </div>
  <div class="lg:hidden md:hidden">
    <NForm class="w-full">
      <NFormItem label="搜索列">
        <NSelect
          v-model:value="searchProps.filter"
          :options="searchType"
          class="min-w-28"
        />
      </NFormItem>
      <NFormItem label="关键词">
        <NInput
          v-model:value="searchProps.search"
          placeholder="搜索"
          clearable
        />
      </NFormItem>
      <NFormItem label="精确搜索">
        <NSwitch v-model:value="searchProps.exact" />
      </NFormItem>
      <NFormItem>
        <NButton @click="() => loadData()">
          搜索
        </NButton>
      </NFormItem>
    </NForm>
  </div>
</template>
