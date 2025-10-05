<!-- modules-external/dmx-fedwiki/src/main/js/components/FedWikiBrowser.vue -->
<template>
  <div class="fedwiki-browser">
    <h3>FedWiki Pages</h3>
    <ul>
      <li v-for="slug in sitemap" :key="slug">
        {{ slug }}
      </li>
    </ul>
  </div>
</template>

<script>
export default {
  name: 'FedWikiBrowser',
  computed: {
    sitemap() {
      return this.$store.state.fedwiki.sitemap;
    }
  }
};
</script>