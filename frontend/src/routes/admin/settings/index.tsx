import { api } from '@/config'
import { useBusiness } from '@/contexts/business-context'
import { useI18n } from '@/i18n'
import { AuthGuard } from '@/middlewares/AuthGuard'
import { createFileRoute } from '@tanstack/react-router'
import { Building2, Check, Store } from 'lucide-react'
import { useState } from 'react'

export const Route=createFileRoute('/admin/settings/')({
  component:()=>(
    <AuthGuard allowedRoles={['admin']}>
      <AdminSettings/>
    </AuthGuard>
  ),
})

export default function AdminSettings(){
  const {businessType,setBusinessType}=useBusiness()
  const [isSubmitting,setIsSubmitting]=useState(false)
  const [success, setSuccess] = useState(false)
  
  const {t} = useI18n()

  const handleUpdate=async(type:'restaurant'|'market')=>{
    setIsSubmitting(true)
    try{
      const res=await fetch(`${api.admin.base}/system-config/business-type`,{
        method:'PUT',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({business_type:type})
      })
      
      if(res.ok){
        setBusinessType(type)
        setSuccess(true)
        setTimeout(()=>setSuccess(false),3000)
      }
    }catch(err){
      console.error('Failed to update:',err)
      alert('Failed to update business type')
    }finally{
      setIsSubmitting(false)
    }
  }

  return(
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-3xl font-black mb-2 text-gray-900">{ t(`admin.settings.title`) }</h1>
          <p className="text-gray-600 mb-8">{ t(`admin.settings.selectBusinessType`) }</p>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <button
                onClick={()=>handleUpdate('restaurant')}
                disabled={isSubmitting}
                className={`relative p-8 rounded-2xl border-4 transition-all ${
                  businessType==='restaurant'
                    ?'border-blue-600 bg-blue-50 shadow-lg'
                    :'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                }`}
              >
                {businessType==='restaurant'&&(
                  <div className="absolute top-4 right-4 bg-blue-600 text-white rounded-full p-2">
                    <Check className="size-5"/>
                  </div>
                )}
                <Building2 className={`size-16 mx-auto mb-4 ${businessType==='restaurant'?'text-blue-600':'text-gray-400'}`}/>
                <h3 className="text-2xl font-black mb-2">{ t(`admin.settings.restaurant`) }</h3>
                <p className="text-gray-600">Stol bilan buyurtmalar</p>
                <ul className="mt-4 text-sm text-gray-700 text-left space-y-2">
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-green-600"/>
                    Stol tanlash majburiy
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-green-600"/>
                    Stol holati boshqaruvi
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-green-600"/>
                    Ofitsiant xizmati
                  </li>
                </ul>
              </button>

              <button
                onClick={()=>handleUpdate('market')}
                disabled={isSubmitting}
                className={`relative p-8 rounded-2xl border-4 transition-all ${
                  businessType==='market'
                    ?'border-green-600 bg-green-50 shadow-lg'
                    :'border-gray-200 hover:border-green-300 hover:bg-green-50'
                }`}
              >
                {businessType==='market'&&(
                  <div className="absolute top-4 right-4 bg-green-600 text-white rounded-full p-2">
                    <Check className="size-5"/>
                  </div>
                )}
                <Store className={`size-16 mx-auto mb-4 ${businessType==='market'?'text-green-600':'text-gray-400'}`}/>
                <h3 className="text-2xl font-black mb-2">{ t(`admin.settings.market`) }</h3>
                <p className="text-gray-600">{t(`admin.settings.simple_shopping`) }</p>
                <ul className="mt-4 text-sm text-gray-700 text-left space-y-2">
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-green-600"/>
                    Stolsiz buyurtmalar
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-green-600"/>
                    Tezkor xizmat
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-green-600"/>
                    Oddiy savdo
                  </li>
                </ul>
              </button>
            </div>

            <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 mt-6">
              <div className="flex gap-3">
                <div className="text-amber-600 text-xl">⚠️</div>
                <div>
                  <h4 className="font-bold text-amber-900 mb-1">Ogohlantirish</h4>
                  <p className="text-sm text-amber-800">
                    Biznes turini o'zgartirish barcha xodimlar uchun darhol qo'llaniladi. 
                    Faol buyurtmalar ta'sirlanmaydi.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-100 rounded-xl p-4 mt-6">
              <h4 className="font-bold mb-3">Joriy Holat</h4>
              <div className="flex items-center gap-3">
                {businessType==='restaurant'?(
                  <>
                    <Building2 className="size-6 text-blue-600"/>
                    <span className="font-bold text-blue-600">Restoran rejimi faol</span>
                  </>
                ):(
                  <>
                    <Store className="size-6 text-green-600"/>
                    <span className="font-bold text-green-600">Market rejimi faol</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {success&&(
        <div className="fixed top-8 right-8 bg-green-600 text-white px-8 py-6 rounded-2xl shadow-2xl flex items-center gap-4 animate-bounce z-50">
          <Check className="size-10"/>
          <span className="font-black text-2xl">Muvaffaqiyatli saqlandi!</span>
        </div>
      )}

      {isSubmitting&&(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-4">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="text-xl font-bold">Saqlanmoqda...</p>
          </div>
        </div>
      )}
    </div>
  )
}