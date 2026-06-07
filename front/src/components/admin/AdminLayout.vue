<template>
  <div class="admin-shell-pro">
    <slot name="sidebar"></slot>
    <section class="admin-stage">
      <slot name="header"></slot>
      <slot></slot>
    </section>
  </div>
</template>
