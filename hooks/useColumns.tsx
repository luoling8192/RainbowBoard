import { IconButton } from "#build/components"

const dialog = useDialog()

export const useColumns = computed(() => {
  const actions = {
    key: 'action',
    title: '操作',
    render: (row: { id: number }) => {
      return (
        <div>
          <IconButton
            v-show={props.api.put}
            icon="mdi:edit"
            title="修改"
            type="primary"
            onClick={async () => {
              try {
                formType.value = 'put'
                formValue.value = prefix((await props.api.getOne(row.id)).Data)

                console.log(formValue.value)
                showModal.value = true
              }
              catch (err) {
                message.error(err?.Msg ?? err?.message ?? '获取数据失败')
              }
            }}
          />

          {props.actionSlot ? props.actionSlot(row) : null}

          <IconButton
            v-show={props.api.delete}
            icon="mdi:delete"
            type="error"
            title="删除"
            onClick={() => {
              dialog.warning({
                title: `删除${props.name}`,
                content: `确定删除此${props.name}吗?`,
                positiveText: '确定',
                negativeText: '取消',
                onPositiveClick: () => {
                  props.api.delete!(row.id).then(() => {
                    message.success('删除成功')
                    loadData()
                  }).catch((err) => {
                    message.error(err?.Msg ?? err?.message ?? '删除失败')
                  })
                },
              })
            }}
          />
        </div>
      )
    },
  }

  const pre = [{
    key: 'id',
    title: 'ID',
    sorter: 'default',
    // defaultSortOrder: 'descend',
    render: (row: { id: number }) => `#${row.id}`,
  }]

  if (props.selection) {
    hasSelection.value = true
    pre.unshift({ type: 'selection' }) // Necessary?
  }

  if (typeof props.columns[0] === 'string') {
    return [
      ...pre,
      ...props.columns.map((item) => {
        if (item === 'updated') {
          return {
            key: 'updated',
            title: '更新时间',
            render: (row: { updated: string }) => (
              <span>
                {row.updated !== '0001-01-01 00:00:00' && new Date(row.updated).toLocaleString()}
              </span>
            ),
            sorter: (row: { updated: string }) => new Date(row.updated).toLocaleString(),
          }
        }

        if (item === 'traffic') {
          return {
            key: 'traffic',
            title: '流量',
            render: (row: { traffic: number }) => (
              <span>
                {readableBytes(row.traffic * 1024 ** 3)}
              </span>
            ),
            sorter: (row: { traffic: number }) => row.traffic,
          }
        }

        if (item === 'status_permission') {
          return {
            key: 'status_permission',
            title: '状态权限',
            render: (row: { status_permission: number }) => (['登录可见', '仅拥有相关套餐用户可见', '仅管理员可见'][row.status_permission]),
          }
        }

        return {
          key: item,
          title: t(`${props.lang}.${item}`),
          sorter: 'default',
        }
      }),
      actions,
    ] as DataTableColumn[]
  }

  return [
    ...pre,
    ...props.columns,
    actions,
  ] as DataTableColumn[]
})
