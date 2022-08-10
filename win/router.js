import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/play',
      component: () => import('./Player.vue')
    }
  ]
})

export default router