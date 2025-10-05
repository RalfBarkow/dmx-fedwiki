// modules-external/dmx-fedwiki/src/main/js/fedwiki-store.js
export default {
  namespaced: true,
  state: {
    sitemap: []
  },
  mutations: {
    SET_SITEMAP(state, slugs) {
      state.sitemap = slugs;
    }
  },
  actions: {
    setSitemap({ commit }, slugs) {
      commit('SET_SITEMAP', slugs);
    }
  },
  getters: {
    getSitemap: state => state.sitemap
  }
};