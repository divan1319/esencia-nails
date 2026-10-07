import { authClient } from '~/utils/auth-client'

export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/admin/login') {
    return
  }

  const { data: session } = await authClient.useSession(useFetch)
  if (!session.value) {
    return navigateTo('/admin/login')
  }
})
