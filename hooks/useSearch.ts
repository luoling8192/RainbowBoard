export function useSearch() {
  const searchProps = ref({
    search: null,
    filter: 'id',
    exact: false,
  } as SearchParamsModal)
  return { searchProps }
}
