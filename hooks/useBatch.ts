export default function useBatch() {
  const selectedRows = ref<any[]>([])
  const hasSelection = ref(false)
  return { selectedRows, hasSelection }
}
