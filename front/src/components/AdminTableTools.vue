<script setup>
const props = defineProps({
  query: { type: String, default: "" },
  status: { type: String, default: "all" },
  page: { type: Number, default: 1 },
  pageSize: { type: Number, default: 8 },
  total: { type: Number, default: 0 },
  pages: { type: Number, default: 1 },
  statusOptions: {
    type: Array,
    default: () => [{ value: "all", label: "全部状态" }]
  },
  searchLabel: { type: String, default: "搜索" },
  searchPlaceholder: { type: String, default: "输入名称、手机号、状态或编号" },
  filterLabel: { type: String, default: "筛选" }
});

const emit = defineEmits(["update:query", "update:status", "update:page", "update:pageSize"]);

function previous() {
  emit("update:page", Math.max(1, props.page - 1));
}

function next() {
  emit("update:page", Math.min(props.pages, props.page + 1));
}
</script>

<template>
  <div class="admin-table-tools">
    <label class="admin-search">
      <span>{{ searchLabel }}</span>
      <input
        :value="query"
        data-testid="admin-search-input"
        type="search"
        :placeholder="searchPlaceholder"
        @input="$emit('update:query', $event.target.value)"
      />
    </label>

    <label class="admin-filter">
      <span>{{ filterLabel }}</span>
      <select :value="status" data-testid="admin-status-filter" @change="$emit('update:status', $event.target.value)">
        <option v-for="option in statusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
      </select>
    </label>

    <label class="admin-filter">
      <span>每页</span>
      <select :value="pageSize" data-testid="admin-page-size" @change="$emit('update:pageSize', Number($event.target.value))">
        <option :value="5">5</option>
        <option :value="8">8</option>
        <option :value="12">12</option>
        <option :value="20">20</option>
      </select>
    </label>

    <div class="admin-pagination">
      <button class="icon-button" type="button" :disabled="page <= 1" @click="previous">‹</button>
      <strong>{{ page }} / {{ pages }}</strong>
      <button class="icon-button" type="button" :disabled="page >= pages" @click="next">›</button>
      <span>共 {{ total }} 条</span>
    </div>
  </div>
</template>
