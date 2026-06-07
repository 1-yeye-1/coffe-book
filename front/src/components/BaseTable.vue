<script setup>
defineProps({
  columns: { type: Array, default: () => [] },
  rows: { type: Array, default: () => [] },
  rowKey: { type: String, default: "id" },
  emptyText: { type: String, default: "暂无数据" }
});
</script>

<template>
  <table>
    <thead>
      <tr>
        <th v-for="column in columns" :key="column.key">{{ column.label }}</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(row, index) in rows" :key="row[rowKey] ?? index">
        <td v-for="column in columns" :key="column.key">
          <slot :name="`cell-${column.key}`" :row="row" :value="row[column.key]" :index="index">
            {{ row[column.key] }}
          </slot>
        </td>
      </tr>
      <tr v-if="!rows.length">
        <td :colspan="columns.length || 1">{{ emptyText }}</td>
      </tr>
    </tbody>
  </table>
</template>
