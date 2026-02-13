import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { RouterProvider } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { router } from './router'
import { queryClient } from './lib/api/queryClient'
import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import '@mantine/charts/styles.css'
import '@mantine/dates/styles.css'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <MantineProvider
        defaultColorScheme="light"
        theme={{ fontFamily: 'Space Grotesk, sans-serif' }}
      >
        <Notifications position="top-right" />
        <RouterProvider router={router} />
        {import.meta.env.DEV ? <ReactQueryDevtools initialIsOpen={false} /> : null}
        {import.meta.env.DEV ? <TanStackRouterDevtools router={router} /> : null}
      </MantineProvider>
    </QueryClientProvider>
  </StrictMode>,
)
