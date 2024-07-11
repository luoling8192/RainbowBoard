export default function usePagination() {
  const pagination = ref({
    page: 1,
    pageSize: 10,
    showSizePicker: true,
    pageSizes: [10, 25, 50, 75, 100],
    onChange: (page: number) => {
      pagination.value.page = page
    },
    onUpdatePageSize: (pageSize: number) => {
      pagination.value.pageSize = pageSize
      pagination.value.page = 1
    },
  })

  return { pagination }
}
