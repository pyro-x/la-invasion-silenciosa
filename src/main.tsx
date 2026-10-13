import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router/dom'
import '@/styles/globals.css'
import { Providers } from '@/app/providers'
import { SampleDataBanner } from '@/components/ui/SampleDataBanner'
import { router } from '@/app/router'
import { handleRouterError, rootErrorOptions } from '@/app/errorHandlers'

createRoot(document.getElementById('root')!, rootErrorOptions).render(
  <StrictMode>
    <Providers>
      <SampleDataBanner />
      <RouterProvider router={router} onError={handleRouterError} />
    </Providers>
  </StrictMode>,
)
