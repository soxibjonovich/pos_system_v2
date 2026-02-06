import {RouterProvider,createRouter} from '@tanstack/react-router'
import {StrictMode} from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import {I18nProvider} from './i18n'
import {routeTree} from './routeTree.gen'
import {BusinessProvider} from './contexts/business-context'

const router=createRouter({routeTree})

declare module '@tanstack/react-router'{
  interface Register{
    router:typeof router
  }
}

const rootElement=document.getElementById('root')!
if(!rootElement.innerHTML){
  const root=ReactDOM.createRoot(rootElement)
  root.render(
    <StrictMode>
      <I18nProvider>
        <BusinessProvider>
          <RouterProvider router={router}/>
        </BusinessProvider>
      </I18nProvider>
    </StrictMode>,
  )
}