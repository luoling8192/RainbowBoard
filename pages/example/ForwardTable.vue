<script setup lang="tsx">
import { isEmpty } from 'lodash-es'
import type { SelectOption } from 'naive-ui'

/**
 * Import Echarts
 */
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, PieChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TitleComponent, TooltipComponent } from 'echarts/components'
import VChart from 'vue-echarts'

/**
 * Import components and types
 */
import forwardConfig from '@/config/rules/forward'
import natConfig from '@/config/rules/nat'
import DpDataTable from '@/components/DpDataTable.vue'
import { NatForwardRulesAPI } from '@/api/rules/nat'
import { NodesAPI } from '@/api/nodes'
import { NatDevicesAPI } from '@/api/devices/nat'
import { ForwardRulesAPI } from '@/api/rules/forward'
import { SystemForwardRulesAPI } from '@/api/admin/rules/forward'
import { SystemNatForwardRulesAPI } from '@/api/admin/rules/nat'
import { TunnelDevicesAPI } from '@/api/devices/tunnel'
import type NodeModel from '@/types/api/node'
import DpIconButton from '@/components/DpIconButton.vue'
import type ForwardRulesModel from '@/types/api/rules/forward'
import { readableBytes } from '@/utils/readable'
import type DebugModel from '@/types/api/debug'
import DpText from '@/components/DpText.vue'
import DpStatusTag from '@/components/DpStatusTag.vue'
import { RULE_MSG } from '@/constants/msg'
import type { ProtocolModel } from '@/constants/rules'
import { FORWARD_MODE, FORWARD_MODE_OPTIONS, PROTOCOL, PROXY_PROTOCOL_OPTIONS } from '@/constants/rules'
import type StatisticsModel from '@/types/api/rules/statistics'
import type APIModel from '@/types/api/api'
import { SystemNatDevicesAPI } from '@/api/admin/devices/nat'
import { SystemTunnelDevicesAPI } from '@/api/admin/devices/tunnel'
import { diffDate, formatDate } from '@/utils/date'
import type TunnelDeviceModel from '@/types/api/devices/tunnel'
import type { UserPlanModel } from '@/types/api/plan'
import { PlanAPI } from '@/api/plan'
import { delay } from '@/utils/time'

/**
 * DpForwardTable component props
 */
const props = defineProps<Props>()

interface Props {
  type: 'forward' | 'nat'
  role: 'admin' | 'user'
}
const dataTable = ref(null)

const NMessage = useMessage()
const NDialog = useDialog()

/**
 * Debug Modal
 * todo: change this name
 */
const showDebugModal = ref(false)
const debugLoading = ref(false)
const debugData = ref({} as DebugModel)

/**
 * Statistics Modal
 */
const showStatisticsModal = ref(false)
const statisticsData = ref<StatisticsModel[]>([])

// fixme: node_id is required
const formRules = {
  name: { required: true, message: '请输入规则名称', trigger: 'blur' },
  node_id: { required: true, message: '请选择节点', trigger: 'change' },
  protocol: { required: true, message: '请选择协议', trigger: 'change' },
  dest_device: { required: true, message: '请选择设备', trigger: 'change' },
}

/**
 * Form columns data
 */
const nodes = ref<NodeModel[]>([])
const devices = ref<TunnelDeviceModel[]>([]) // dest_device
const statistics = ref<StatisticsModel[]>([])

/**
 * Change values
 */
const selectedNodeId = ref(null as number | null)
const selectedNodeData = ref({} as NodeModel)
const selectedProtocolString = ref('')
const loaded = ref(false)
/**
 * Multiple import
 */
const showImportModal = ref(false)
const importInputRef = ref<HTMLInputElement | null>(null)
const importData = ref([] as any)
const importLoading = ref(false)

const apis = computed<APIModel>(() => {
  if (props.role === 'admin') {
    if (props.type === 'forward') {
      return {
        get: SystemForwardRulesAPI.getRules.bind(SystemForwardRulesAPI),
        getOne: SystemForwardRulesAPI.getRule.bind(SystemForwardRulesAPI),
        put: SystemForwardRulesAPI.editRule.bind(SystemForwardRulesAPI),
        delete: SystemForwardRulesAPI.deleteRule.bind(SystemForwardRulesAPI),
      } as APIModel
    }
    else {
      return {
        get: SystemNatForwardRulesAPI.getRules.bind(SystemNatForwardRulesAPI),
        getOne: SystemNatForwardRulesAPI.getRule.bind(SystemNatForwardRulesAPI),
        put: SystemNatForwardRulesAPI.editRule.bind(SystemNatForwardRulesAPI),
        delete: SystemNatForwardRulesAPI.deleteRule.bind(SystemNatForwardRulesAPI),
      } as APIModel
    }
  }
  else {
    if (props.type === 'forward') {
      return {
        get: ForwardRulesAPI.getRules.bind(ForwardRulesAPI),
        getOne: ForwardRulesAPI.getRule.bind(ForwardRulesAPI),
        post: ForwardRulesAPI.addRule.bind(ForwardRulesAPI),
        put: ForwardRulesAPI.editRule.bind(ForwardRulesAPI),
        delete: ForwardRulesAPI.deleteRule.bind(ForwardRulesAPI),
      } as APIModel
    }
    else {
      return {
        get: NatForwardRulesAPI.getRules.bind(NatForwardRulesAPI),
        getOne: NatForwardRulesAPI.getRule.bind(NatForwardRulesAPI),
        post: NatForwardRulesAPI.addRule.bind(NatForwardRulesAPI),
        put: NatForwardRulesAPI.editRule.bind(NatForwardRulesAPI),
        delete: NatForwardRulesAPI.deleteRule.bind(NatForwardRulesAPI),
      } as APIModel
    }
  }
})

async function handleImport() {
  importLoading.value = true

  const file = importInputRef.value?.files?.item(0)
  if (!file) {
    NMessage.error('请选择文件')
    importLoading.value = false
    return
  }

  const reader = new FileReader()
  reader.readAsText(file)

  reader.onload = () => {
    const result = JSON.parse(reader.result as string)
    importData.value = result
    showImportModal.value = true
    importLoading.value = false

    for (const rule of result) {
      delete rule.id
      delete rule.user_id
      delete rule.protocol
      delete rule.status
      delete rule.sync
      delete rule.dest_sync

      delete rule.node_id
      delete rule.outbound
      if (props.type === 'forward')
        delete rule.dest_node

      delete rule.dest_device

      rule.node_id = selectedNodeData.value.id
      rule.protocol = selectedProtocolString.value

      apis.value.post!(rule).then(() => {
        NMessage.success(`规则 ${rule.name} 导入成功`)
      }).catch((err) => {
        NMessage.error(`规则 ${rule.name} ${err?.Msg ?? err?.message ?? '导入失败'}`)
      })
    }

    importLoading.value = false
  }
}

/**
 * Dialog modal options
 */
const nodesOptions = ref<NodeModel[] | { label: string, value: string, data: NodeModel }[]>([])
const devicesOptions = ref<TunnelDeviceModel[]>([]) // dest_device & dest_node
const protocolOptions = ref<SelectOption[]>([])

/**
 * Tags display data
 */
const count = ref(0)
const plan = ref<UserPlanModel>({} as UserPlanModel)

const columns = computed(() => [
  { key: 'name', title: '名称', sorter: 'default' },
  {
    key: 'node_id',
    title: '节点',
    render: (row: ForwardRulesModel) => (
      <div>
        <p>{`${row.node_id} | ${nodes.value[row.node_id]?.name}`}</p>
        <DpText>{nodes.value[row.node_id]?.addr}</DpText>
      </div>
    ),
    sorter: (row: ForwardRulesModel) => row.node_id,
  },
  {
    key: 'bind',
    title: '监听端口',
    render: (row: ForwardRulesModel) => (
      <div>
        <p>{row.bind}</p>
        {statistics.value[row.id]?.traffic
          ? (
            <a
              class="cursor-pointer"
              onClick={async () => {
                const { Data } = await ForwardRulesAPI.statistics(row.id)
                statisticsData.value = Data
                statisticsData.value[0].rule_name = row.name
                showStatisticsModal.value = true
              }}
            >
              <DpText>{`已用流量: ${readableBytes(statistics.value[row.id]?.traffic as number)}`}</DpText>
            </a>
            )
          : null}
      </div>
    ),
    sorter: (row1: ForwardRulesModel, row2: ForwardRulesModel) => row1.bind - row2.bind,
  },
  {
    key: 'targets',
    title: '目标地址',
    render: (row: ForwardRulesModel) => (
      <div>
        {row.targets && row.targets.length > 0 ? (<p>{`${row.targets[0]?.Host}:${row.targets[0]?.Port}`}</p>) : null}
        {row.targets && row.targets.length > 1
          ? (<DpText>{`${FORWARD_MODE[row.mode]} (共${row.targets.length}个)`}</DpText>)
          : null}
      </div>
    ),
  },
  {
    key: 'protocol',
    title: '协议',
    render: (row: ForwardRulesModel) => (
      <div>
        <p>{PROTOCOL[row.protocol]}</p>
        <DpText>{row.dest_node ? `节点: ${nodes.value[row.dest_node]?.name}` : null}</DpText>
        <DpText>{row.dest_device ? `设备: ${devices.value[row.dest_device]?.name}` : null}</DpText>
      </div>
    ),
  },
  {
    key: 'status',
    title: '状态',
    render: (row: ForwardRulesModel) => {
      return <DpStatusTag status={row.status} />
    },
  },
])

function actions(row: ForwardRulesModel) {
  const stopRule = (props.type === 'forward')
    ? (props.role === 'admin'
        ? SystemForwardRulesAPI.stopRule.bind(SystemForwardRulesAPI)
        : ForwardRulesAPI.stopRule.bind(ForwardRulesAPI))
    : (props.role === 'admin'
        ? SystemNatForwardRulesAPI.stopRule.bind(SystemNatForwardRulesAPI)
        : NatForwardRulesAPI.stopRule.bind(NatForwardRulesAPI))
  const startRule = (props.type === 'forward')
    ? (props.role === 'admin'
        ? SystemForwardRulesAPI.startRule.bind(SystemForwardRulesAPI)
        : ForwardRulesAPI.startRule.bind(ForwardRulesAPI))
    : (props.role === 'admin'
        ? SystemNatForwardRulesAPI.startRule.bind(SystemNatForwardRulesAPI)
        : NatForwardRulesAPI.startRule.bind(NatForwardRulesAPI))
  const restartRule = (props.type === 'forward')
    ? (props.role === 'admin'
        ? SystemForwardRulesAPI.restartRule.bind(SystemForwardRulesAPI)
        : ForwardRulesAPI.restartRule.bind(ForwardRulesAPI))
    : (props.role === 'admin'
        ? SystemNatForwardRulesAPI.restartRule.bind(SystemNatForwardRulesAPI)
        : NatForwardRulesAPI.restartRule.bind(NatForwardRulesAPI))
  const debugRule = (props.type === 'forward')
    ? (props.role === 'admin'
        ? SystemForwardRulesAPI.debug.bind(SystemForwardRulesAPI)
        : ForwardRulesAPI.debug.bind(ForwardRulesAPI))
    : (props.role === 'admin'
        ? SystemNatForwardRulesAPI.debug.bind(SystemNatForwardRulesAPI)
        : NatForwardRulesAPI.debug.bind(NatForwardRulesAPI))

  return (
    <>
      <DpIconButton
        icon="mdi:pause"
        title="暂停"
        v-show={row.status !== 'Disabled'}
        type="warning"
        onClick={() => {
          NDialog.warning({
            title: '真的要暂停规则吗?',
            positiveText: '确定',
            negativeText: '取消',
            onPositiveClick: async () => {
              stopRule(row.id).then(() => {
                NMessage.success('暂停成功')
              }).catch((err) => {
                NMessage.error(err.Msg)
              })
              await delay(1000)
              loadData()
            },
          })
        }}
      />
      <DpIconButton
        icon="mdi:play"
        title="启动"
        v-show={row.status === 'Disabled'}
        type="success"
        onClick={() => {
          NDialog.warning({
            title: '真的要启动规则吗?',
            positiveText: '确定',
            negativeText: '取消',
            onPositiveClick: async () => {
              startRule(row.id).then(() => {
                NMessage.success('启动成功')
              }).catch((err) => {
                NMessage.error(err.Msg)
              })
              await delay(1000)
              loadData()
            },
          })
        }}
      />
      <DpIconButton
        icon="mdi:restart"
        title="重启"
        type="warning"
        onClick={() => {
          NDialog.warning({
            title: '真的要重启规则吗?',
            positiveText: '确定',
            negativeText: '取消',
            onPositiveClick: async () => {
              restartRule(row.id).then(() => {
                NMessage.success('重启成功')
              }).catch((err) => {
                NMessage.error(err.Msg)
              })
              await delay(1000)
              loadData()
            },
          })
        }}
      />
      <DpIconButton
        icon="mdi:android-debug-bridge"
        title="诊断"
        type="warning"
        loading={debugLoading.value}
        onClick={() => {
          // debugLoading.value = true
          debugRule(row.id).then((res) => {
            debugData.value = res
            showDebugModal.value = true
          }).catch((err) => {
            NMessage.error(err?.Msg)
          }).finally(() => {
            debugLoading.value = false
          })
        }}
      />
    </>
  )
}

function handleNodeChanged(index: number, data: NodeModel, updateValue: (e: any) => void) {
  updateValue(index)
  selectedNodeData.value = data

  // todo: Need use permission?
  let protocols: any[]
  if (props.type === 'forward')
    protocols = selectedNodeData.value.protocol.split('|').filter(Boolean) as ProtocolModel[]
  else
    protocols = selectedNodeData.value.nat_protocol.split('|').filter(Boolean) as ProtocolModel[]
  protocolOptions.value = protocols.map((key: ProtocolModel) => ({
    label: PROTOCOL[key],
    value: key,
  }))
}

function handleProtocolChanged(index: number, data: ProtocolModel, updateValue: (e: any) => void) {
  updateValue(index)
  selectedProtocolString.value = data

  loadDestDevice()

  if (data.match('http'))
    return

  loadDestNode(data)
}

function loadDestDevice() {
  devicesOptions.value = Object.values(devices.value).map(item => ({
    label: `[设备] ${item.name}`,
    value: { id: item.id, type: 'device' },
    ...item,
  }))
}

function loadDestNode(data?: ProtocolModel) {
  const unshiftDevices: TunnelDeviceModel[] = Object.values(nodes.value)
    .filter((node: NodeModel) => ((`${data}_port`) in node && node[`${data}_port`] !== 0))
    .map((item: NodeModel) => ({
      label: `[节点] ${item.name} (${item.speed}倍速率  ${item.traffic}倍消耗)`,
      value: { id: item.id, type: 'node' },
      ...item,
    } as TunnelDeviceModel))

  // devicesOptions.value.unshift({ label: '设备', value: '', disabled: true })
  devicesOptions.value.unshift(...unshiftDevices)
}

async function reload() {
  /**
   * Define apis
   */
  const getNodes = (props.type === 'forward') ? NodesAPI.getNodes.bind(NodesAPI) : NodesAPI.getNatNodes.bind(NodesAPI)
  const getDevices = (props.type === 'forward'
    ? (props.role === 'admin'
        ? SystemTunnelDevicesAPI.getDevices.bind(SystemTunnelDevicesAPI)
        : TunnelDevicesAPI.getDevices.bind(TunnelDevicesAPI))
    : (props.role === 'admin'
        ? SystemNatDevicesAPI.getDevices.bind(SystemNatDevicesAPI)
        : NatDevicesAPI.getDevices.bind(NatDevicesAPI)))
  const getStatistics = (props.type === 'forward'
    ? (props.role === 'admin'
        ? SystemForwardRulesAPI.statistics.bind(SystemForwardRulesAPI)
        : ForwardRulesAPI.statistics.bind(ForwardRulesAPI))
    : (props.role === 'admin'
        ? SystemNatForwardRulesAPI.statistics.bind(SystemNatForwardRulesAPI)
        : NatForwardRulesAPI.statistics.bind(NatForwardRulesAPI)))

  /**
   * Load data
   */
  getNodes().then((res) => {
    const { Data } = res

    nodes.value = Data.reduce((obj: any, item) => {
      obj[item.id] = item
      return obj
    }, {})

    nodesOptions.value = Data.filter(item => item.permission !== 0 && item.permission !== 2)
      .map((item) => {
        return {
          label: `${item.name} (${item.speed}倍速率 ${item.traffic}倍消耗)`,
          value: item.id,
          ...item,
        }
      })
  }).catch((err) => {
    NMessage.error(err?.Msg ?? err?.message ?? '获取节点列表失败')
  })

  getDevices().then((res) => {
    const { Data } = res

    devices.value = Data.reduce((obj: any, item) => {
      obj[item.id] = item
      return obj
    }, {})

    loadDestDevice()
  }).catch((err: any) => {
    NMessage.error(err?.Msg ?? err?.message ?? '获取设备列表失败')
  })

  getStatistics().then(({ Data }) => {
    // fixme: 累加计算
    statistics.value = Data.reduce((obj: any, item: StatisticsModel) => {
      obj[item.rule_id] = item
      return obj
    }, {})
  }).catch((err) => {
    NMessage.error(err?.Msg ?? err?.message ?? '获取统计信息失败')
  })

  if (props.role === 'user') {
    if (props.type === 'forward')
      count.value = (await ForwardRulesAPI.getRules({ limit: 0 })).Count
    else if (props.type === 'nat')
      count.value = (await NatForwardRulesAPI.getRules({ limit: 0 })).Count

    plan.value = await PlanAPI.getCurrent()
  }
}

/**
 * Vue-Echarts
 */

use([
  GridComponent,
  CanvasRenderer,
  PieChart,
  BarChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
])

// todo: 切换主题
// provide(THEME_KEY, 'dark')

const chartOptions = computed(() => {
  return (dateType: 7 | 30) => {
    const xData = []
    const yData = []

    const now = new Date()
    now.setHours(0)
    now.setMinutes(0)
    now.setSeconds(0)
    now.setMilliseconds(0)

    const date = new Date(now)
    date.setHours(-30 * 24)

    for (let i = 0; i < dateType; i++) {
      date.setHours(24)

      xData.push(formatDate(date))
      yData.push(0)
    }

    for (const statistic of statisticsData.value) {
      const diff = diffDate(now, statistic.date)

      if (diff > (dateType - 1) || diff < 0)
        continue
      yData[(dateType - 1) - diff] = statistic.traffic
    }

    const seriesData = statisticsData.value.map((item: StatisticsModel) => item.traffic)
    const sortedData = seriesData.sort((a, b) => b - a)

    return {
      backgroundColor: 'transparent',
      title: {
        text: `#${statisticsData.value[0].rule_id} ${statisticsData.value[0].rule_name} 近 ${dateType} 天用量`,
        textAlign: 'left',
        x: 'center',
        y: 'top',
      },
      tooltip: {
        formatter(params: { seriesName: string, name: string, value: number }) {
          return `${params.seriesName}<br>${params.name}: ${readableBytes(params.value)}`
        },
      },
      xAxis: {
        name: '日期',
        type: 'category',
        axisLabel: dateType === 30
          ? {
              interval: 1,
              rotate: 45,
            }
          : {},
        data: xData,
      },
      yAxis: {
        name: '流量 (不含倍率)',
        type: 'value',
        axisLabel: {
          formatter(bytes: number) {
            return readableBytes(bytes)
          },
        },
      },
      series: [{
        name: '流量 (不含倍率)',
        type: 'bar',
        label: {
          show: true,
          position: 'top',
          formatter(params: { value: number }) {
            if (params.value === 0 || (params.value < sortedData[2] && dateType === 30))
              return ''
            return readableBytes(params.value)
          },
        },
        data: yData,
      }],
    }
  }
})

onBeforeMount(() => {
  reload()
  if (dataTable.value)
    loaded.value = true
})

const dataTableInterface = ref({
  loadData: () => {},
})

function getDataTableInterface(interfaceFromTable) {
  dataTableInterface.value = interfaceFromTable
}

function loadData() {
  dataTableInterface.value.loadData()
}
</script>

<template>
  <div class="p-4">
    <NSpace v-if="props.role === 'user' && plan.Plan && plan.User">
      <NTag
        v-if="props.type === 'forward'"
        :type="(count / plan.User.rule < 0.7) ? 'success' : (count / plan.User.rule < 1) ? 'warning' : 'error'"
        round
      >
        规则 {{ `${count} / ${plan.User.rule}` }} 条
      </NTag>
      <NTag
        v-else-if="props.type === 'nat'"
        :type="(count / plan.User.nat_rule < 0.7) ? 'success' : (count / plan.User.nat_rule < 1) ? 'warning' : 'error'"
        round
      >
        规则 {{ `${count} / ${plan.User.nat_rule}` }} 条
      </NTag>
      <NTag
        :type="(plan.User.traffic_used / plan.User.traffic < 0.7) ? 'success' : (plan.User.traffic_used / plan.User.traffic < 1) ? 'warning' : 'error'"
        round
      >
        流量 {{ `${readableBytes(plan.User.traffic_used)} / ${readableBytes(plan.User.traffic)}` }}
      </NTag>
      <NTag v-if="plan.Plan.speed !== 0" round>
        {{ `${plan.Plan.speed}倍速率` }}
      </NTag>
      <NTag v-if="plan.Plan.qps !== 0" round>
        {{ `QPS 限制 ${plan.Plan.qps}` }}
      </NTag>
      <NTag v-if="plan.Plan.max_ips !== 0" round>
        {{ `IP 限制 ${plan.Plan.max_ips}` }}
      </NTag>
      <NTag v-if="plan.Plan.max_conn !== 0" round>
        {{ `连接限制 ${plan.Plan.max_conn}` }}
      </NTag>
      <NTag v-if="plan.User.reset_date !== '0001-01-01'" round>
        {{ `重置时间 ${formatDate(new Date(plan.User.reset_date))}` }}
      </NTag>
      <NTag v-if="plan.User.expire_date !== '0001-01-01'" round>
        {{ `到期时间 ${formatDate(new Date(plan.User.expire_date))}` }}
      </NTag>
    </NSpace>

    <NForm inline class="w-full my-4">
      <NButtonGroup>
        <NButton
          v-if="props.role !== 'admin'"
          @click="() => {
            dataTable.formType = 'post'
            dataTable.showModal = true
            dataTable.formValue = {}
          }"
        >
          添加{{ dataTable.props.name }}
        </NButton>
        <NButton
          v-if="loaded && props.role === 'user'"
          @click="() => showImportModal = true"
        >
          导入数据
        </NButton>
      </NButtonGroup>
    </NForm>

    <DpDataTable
      ref="dataTable"
      :disable-create-modal="props.role === 'admin'"
      :action-slot="actions"
      :config="props.type === 'forward' ? forwardConfig : natConfig"
      lang="USER.FORWARD"
      :columns="columns"
      :form-rules="formRules"
      :api="apis"
      :name="props.type === 'forward' ? '转发规则' : '内网穿透'"
      :selection="true"
      :global="props"
      @interface="getDataTableInterface"
      @close-modal="() => {
        selectedNodeData = {}
        selectedProtocolString = ''
      }"
    >
      <template #rule-node_id="{ value, formType, updateValue }">
        <NSelect
          :options="nodesOptions"
          :value="value"
          :disabled="formType === 'put'"
          @update:value="(index, _data) => handleNodeChanged(index, _data, updateValue)"
        />
      </template>
      <!--TODO: Editable in future-->

      <template #rule-node_message="{ formType }">
        <NFormItem v-if="formType === 'post'" label="节点信息">
          <div v-if="!isEmpty(selectedNodeData)">
            <p>端口范围: {{ selectedNodeData.port_range }}</p>
            <p v-if="selectedNodeData.icp">
              此节点HTTP/HTTPS转发需要备案域名
            </p>
            <p v-if="selectedNodeData.blocked_protocol">
              屏蔽协议: {{ selectedNodeData.blocked_protocol }}
            </p>
            <P v-if="selectedNodeData.blocked_hostname">
              屏蔽SNI: {{ selectedNodeData.blocked_hostname }}
            </p>
            <p v-if="selectedNodeData.blocked_path">
              屏蔽Path: {{ selectedNodeData.blocked_path }}
            </p>
          </div>
          <div v-else>
            <p>请先选择节点</p>
          </div>
        </NFormItem>
      </template>

      <!-- Nat -->
      <template #rule-mode="{ value, updateValue }">
        <NSelect
          :options="FORWARD_MODE_OPTIONS"
          :value="value"
          @update:value="(e) => updateValue(e)"
        />
      </template>

      <template #rule-protocol="{ value, formType, updateValue }">
        <NSelect
          :options="protocolOptions"
          :value="value"
          :disabled="formType === 'put'"
          @update:value="(index, _data: {label: string, value: ProtocolModel}) =>
            handleProtocolChanged(index, _data.value, updateValue)"
        />
      </template>

      <!-- Nat -->
      <template #rule-proxy_protocol="{ value = 0, updateValue }">
        <NSelect
          :options="PROXY_PROTOCOL_OPTIONS"
          :value="value"
          @update:value="(e: number) => updateValue(e)"
          @vue:mounted="() => updateValue(value)"
        />
      </template>

      <template #rule-bind="{ value, formType, updateValue }">
        <NFormItem v-if="selectedProtocolString.match('http')" label="绑定域名">
          <NInput
            :disabled="formType === 'put'"
            :value="value"
            @update:value="(e: string) => updateValue(e)"
          />
        </NFormItem>
        <NFormItem v-else label="监听端口">
          <NInput
            placeholder="留空系统自动分配"
            :disabled="formType === 'put'"
            :value="value"
            @update:value="(e: number) => updateValue(e)"
          />
        </NFormItem>
      </template>

      <template #rule-targets="{ value = [{ Host: '', Port: null }], updateValue }">
        <!-- Forward -->
        <template v-if="props.type === 'forward'">
          <NFormItem
            v-for="(item, index) in value"
            :key="`targets-${index}`"
            @update:value="(e) => updateValue(e)"
            @vue:mounted="() => updateValue(value)"
          >
            <NInputGroup>
              <NInput v-model:value="item.Host" placeholder="目标地址" />
              <NInputNumber v-model:value="item.Port" max="65535" min="1" placeholder="目标端口" />
              <NButton @click="() => updateValue(value.filter((_: any, i: number) => i !== index))">
                删除
              </NButton>
            </NInputGroup>
          </NFormItem>
          <NButton @click="() => updateValue([...(value || []), { Host: '', Port: null }])">
            添加
          </NButton>
        </template>

        <!-- Nat -->
        <template v-else>
          <NFormItem label="内网地址">
            <NInputGroup>
              <NInput
                v-model:value="value[0].Host"
                placeholder="127.0.0.1"
                @update:value="() => updateValue(value)"
              />
              <NInputNumber
                v-model:value="value[0].Port"
                max="65535" min="1"
                placeholder="8080"
                @update:value="() => updateValue(value)"
              />
            </NInputGroup>
          </NFormItem>
        </template>
      </template>

      <!-- Forward -->
      <template #rule-dest_node="{ value, updateValue }">
        <NFormItem v-if="selectedProtocolString === 'tls' || selectedProtocolString === 'secure' || selectedProtocolString === 'securex'" label="出口">
          <NSelect
            :options="devicesOptions"
            :value="value"
            @update:value="(e: string) => updateValue(e)"
          />
        </NFormItem>
      </template>

      <!-- Nat -->
      <template #rule-dest_device="{ value, updateValue }">
        <NSelect
          :options="devicesOptions"
          :value="value"
          @update:value="(e: string) => updateValue(e)"
        />
      </template>

      <!-- Forward -->
      <template #rule-outbound="{ value, updateValue }">
        <NSelect
          :options="[{ label: '系统默认', value: '' }]"
          :value="value"
          @update:value="(e: string) => updateValue(e)"
        />
      </template>
    </DpDataTable>

    <NModal
      :show="showDebugModal"
      preset="card"
      title="规则诊断"
      class="w-[90%] sm:w-3/4 rounded-md"
      @close="() => (showDebugModal = false)"
    >
      <NCollapse :default-expanded-names="['in', 'out']">
        <NCollapseItem title="入口规则" name="in">
          <NDescriptions v-if="debugData.InBound" :bordered="true" :column="1" label-placement="left">
            <NDescriptionsItem label="当前时间">
              {{ debugData.InBound.Data.Timestarp }}
            </NDescriptionsItem>
            <NDescriptionsItem label="上次错误代码">
              {{ RULE_MSG[debugData.InBound.Data.Error] }}
            </NDescriptionsItem>
            <NDescriptionsItem label="规则状态">
              <DpStatusTag :status="debugData.InBound.Data.Status" />
            </NDescriptionsItem>
            <NDescriptionsItem label="最大连接数">
              {{ debugData.InBound.Data.MaxConn > 0 ? debugData.InBound.Data.MaxConn : '无限制' }}
            </NDescriptionsItem>
            <NDescriptionsItem label="已连接数量">
              {{ debugData.InBound.Data.Connected }}
            </NDescriptionsItem>
            <NDescriptionsItem label="目标诊断">
              <template v-for="(item, index) in debugData.InBound.Data.Targets">
                <div v-if="item.Ok" :key="`target-${index}`">
                  <p>- {{ index }}</p>
                  <template v-for="(value, key) in item.Data" :key="`item-${key}`">
                    {{ `&nbsp;&nbsp;[${key}]: ${value}` }}
                    <br>
                  </template>
                </div>
                <div v-else :key="`error-${index}`">
                  <p>{{ index }}</p>
                  <p>错误信息: {{ item.Error }}</p>
                </div>
              </template>
            </NDescriptionsItem>
          </NDescriptions>
          <template v-else>
            <p>入口连接失败</p>
          </template>
        </NCollapseItem>
        <NCollapseItem v-if="debugData.ShowOutbound" title="出口规则" name="out">
          <NDescriptions v-if="debugData.OutBound" :bordered="true" :column="1" label-placement="left">
            <NDescriptionsItem label="当前时间">
              {{ debugData.OutBound.Data.Timestarp }}
            </NDescriptionsItem>
            <NDescriptionsItem label="上次错误信息">
              {{ RULE_MSG[debugData.OutBound.Data.Error] }}
            </NDescriptionsItem>
            <NDescriptionsItem label="规则状态">
              {{ debugData.OutBound.Data.Status }}
            </NDescriptionsItem>
            <NDescriptionsItem label="最大连接数">
              {{ debugData.OutBound.Data.MaxConn > 0 ? debugData.InBound.Data.MaxConn : '无限制' }}
            </NDescriptionsItem>
            <NDescriptionsItem label="已连接数量">
              {{ debugData.OutBound.Data.Connected }}
            </NDescriptionsItem>
            <NDescriptionsItem label="目标诊断">
              <template v-for="(item, index) in debugData.OutBound.Data.Targets">
                <div v-if="item.Ok" :key="`target-${index}`">
                  <p>- {{ index }}</p>
                  <template v-for="(value, key) in item.Data" :key="`item-${key}`">
                    {{ `  [${key}]: ${value}` }}
                  </template>
                </div>
                <div v-else :key="`error-${index}`">
                  <p>{{ index }}</p>
                  <p>错误信息: {{ item.Error }}</p>
                </div>
              </template>
            </NDescriptionsItem>
          </NDescriptions>
          <template v-else>
            <p>出口连接失败</p>
          </template>
        </NCollapseItem>
      </NCollapse>
    </NModal>

    <NModal
      :show="showStatisticsModal"
      preset="card"
      title="流量统计"
      class="w-[90%] sm:w-3/4 rounded-md"
      @close="() => (showStatisticsModal = false)"
    >
      <NTabs type="segment" animated>
        <NTabPane name="7 天">
          <VChart
            :option="chartOptions(7)"
            class="h-[80vh]"
          />
        </NTabPane>
        <NTabPane name="30 天">
          <VChart
            :option="chartOptions(30)"
            class="h-[80vh]"
          />
        </NTabPane>
      </NTabs>
    </NModal>

    <NModal
      v-if="props.role === 'user'"
      preset="card"
      :show="showImportModal"
      title="导入数据"
      class="w-[90%] sm:w-3/4 rounded-md"
      @close="() => { showImportModal = false }"
    >
      <NForm label-placement="left">
        <NFormItem label="入口节点">
          <NSelect
            v-model:value="selectedNodeId"
            :options="nodesOptions"
            @update:value="(index, _data) => handleNodeChanged(index, _data, () => {})"
          />
        </NFormItem>
        <NFormItem label="节点信息">
          <div v-if="!isEmpty(selectedNodeData)">
            <p>端口范围: {{ selectedNodeData.port_range }}</p>
            <p v-if="selectedNodeData.icp">
              此节点HTTP/HTTPS转发需要备案域名
            </p>
            <p v-if="selectedNodeData.blocked_protocol">
              屏蔽协议: {{ selectedNodeData.blocked_protocol }}
            </p>
            <P v-if="selectedNodeData.blocked_hostname">
              屏蔽SNI: {{ selectedNodeData.blocked_hostname }}
            </P>
            <p v-if="selectedNodeData.blocked_path">
              屏蔽Path: {{ selectedNodeData.blocked_path }}
            </p>
          </div>
          <div v-else>
            <p>请先选择节点</p>
          </div>
        </NFormItem>
        <NFormItem label="协议">
          <NSelect v-model:value="selectedProtocolString" :options="protocolOptions" />
        </NFormItem>

        <NDivider />

        <NFormItem label="选择文件">
          <input ref="importInputRef" type="file">
        </NFormItem>

        <NDivider />

        <NCollapse>
          <NCollapseItem name="advanced" title="高级设置">
            <NFormItem label="流量出口">
              <NSelect :options="[{ label: '系统默认', value: '' }]" default-value="" />
            </NFormItem>
          </NCollapseItem>
        </NCollapse>

        <NDivider />

        <NFormItem>
          <NButton
            :disabled="importLoading"
            :loading="importLoading"
            @click="handleImport"
          >
            导入
          </NButton>
        </NFormItem>
      </NForm>
    </NModal>
  </div>
</template>
