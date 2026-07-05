import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router/dom'
import '@/styles/globals.css'
import { Providers } from '@/app/providers'
import { SampleDataBanner } from '@/components/ui/SampleDataBanner'
import { router } from '@/app/router'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Providers>
      <SampleDataBanner />
      <RouterProvider router={router} />
    </Providers>
  </StrictMode>,
)
