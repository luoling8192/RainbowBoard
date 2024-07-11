<script setup lang="ts">
import { Icon } from '@iconify/vue'

interface Props {
  icon: string
  type?: 'default' | 'tertiary' | 'primary' | 'success' | 'info' | 'warning' | 'error'
  title: string
  onClick: () => void
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), { type: 'primary' })
</script>

<template>
  <NButton
    circle
    strong
    size="large"
    class="!mr-2"
    :type
    :on-click="onClick"
    :loading="loading"
  >
    <NIcon size="1.6rem">
      <Icon :icon="props.icon" color="rgba(255, 255, 255, 0.9)" />
    </NIcon>
  </NButton>
</template>
