<script setup lang="ts">
function handleSelectRows(row: DataTableRowKey[]) {
  selectedRows.value = row
  console.log(selectedRows.value)
}
function handleMultipleDelete() {
  if (selectedRows.value.length < 1) {
    message.error('请先选择一行!')
    return
  }

  dialog.warning({
    title: `批量删除${props.name}`,
    content: `确定删除所选${props.name}吗？批量删除之后无法恢复！`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: () => {
      for (const row of selectedRows.value) {
        props.api.delete!(row).then(() => {
          message.success('删除成功')
          loadData()
        }).catch((err) => {
          message.error(err?.Msg ?? err?.message ?? '删除失败')
        })
      }
    },
  })
}

function handleMultipleExport() {
  if (!selectedRows.value) {
    message.error('请先选择一行!')
    return
  }

  dialog.info({
    title: `导出${props.name}`,
    content: `导出文件不会包含当前选择的入口节点，流量出口，出口节点 / 设备，协议！`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: () => {
      const json = data.value
        .filter((item: { id: number }) => selectedRows.value.includes(item.id))
        .map((item) => {
          Object.keys(item).forEach((key) => {
            if (key === 'conf') {
              item[key] = item[key].reduce((acc: any, cur: any) => {
                acc[cur.Key] = cur.Value
                return acc
              }, {})
            }
          })

          return item
        })

      const blob = new Blob([JSON.stringify(json, null, 4)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      BrowserUtils.downloadFile(url, `${props.name}-${Date.now()}.json`)
    },
  })
}
</script>

<template>
  <template v-if="props.global === undefined">
    <NForm inline class="my-4 w-full">
      <NButtonGroup>
        <NButton
          v-if="!props.disableCreateModal"
          @click="() => {
            formType = 'post'
            showModal = true
            formValue = {}
          }"
        >
          添加{{ props.name }}
        </NButton>

        <template v-if="hasSelection">
          <NButton @click="handleMultipleDelete">
            批量删除
          </NButton>
          <NButton @click="handleMultipleExport">
            批量导出
          </NButton>
        </template>
      </NButtonGroup>
    </NForm>
  </template>

  <p v-if="hasSelection" class="absolute bottom-0 left-0">
    已选择 {{ selectedRows.length }} 条{{ props.name }}
  </p>

  <NForm inline class="py-2">
    <template v-if="hasSelection">
      <div class="flex-col md:flex-row space-y-4 md:space-x-4">
        <NButtonGroup>
          <NButton @click="handleMultipleStop">
            批量暂停
          </NButton>
          <NButton @click="handleMultipleStart">
            批量启动
          </NButton>
          <NButton @click="handleMultipleRestart">
            批量重启
          </NButton>
        </NButtonGroup>
        <NButtonGroup>
          <NButton @click="handleMultipleDelete">
            批量删除
          </NButton>
          <NButton @click="handleMultipleExport">
            批量导出
          </NButton>
        </NButtonGroup>
      </div>
    </template>
  </NForm>
</template>
