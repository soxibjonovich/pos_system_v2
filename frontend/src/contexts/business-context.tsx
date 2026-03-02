import {createContext,useContext,useState,useEffect,type ReactNode} from 'react'
import {api, API_URL} from '@/config'

type BusinessType='restaurant'|'market'

interface BusinessContextType{
  businessType:BusinessType
  isRestaurant:boolean
  isMarket:boolean
  isLoading:boolean
  setBusinessType:(type:BusinessType)=>void
}

const BusinessContext=createContext<BusinessContextType|undefined>(undefined)

const BUSINESS_TYPE_KEY='businessType'

export function BusinessProvider({children}:{children:ReactNode}){
  const [businessType,setBusinessTypeState]=useState<BusinessType>('market')
  const [isLoading,setIsLoading]=useState(true)

  useEffect(()=>{
    const stored=localStorage.getItem(BUSINESS_TYPE_KEY) as BusinessType|null
    if(stored){
      setBusinessTypeState(stored)
      setIsLoading(false)
    }else{
      fetchBusinessType()
    }
  },[])

  const fetchBusinessType=async()=>{
    try{
      const res=await fetch(`${API_URL}${api.orders.base}/${api.orders.orders}/config`)
      if(res.ok){
        const data=await res.json()
        setBusinessType(data.business_type)
      }
    }catch(err){
      console.error('Failed to fetch business type:',err)
    }finally{
      setIsLoading(false)
    }
  }

  const setBusinessType=(type:BusinessType)=>{
    setBusinessTypeState(type)
    localStorage.setItem(BUSINESS_TYPE_KEY,type)
  }

  const value:BusinessContextType={
    businessType,
    isRestaurant:businessType==='restaurant',
    isMarket:businessType==='market',
    isLoading,
    setBusinessType
  }

  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>
}

export function useBusiness(){
  const context=useContext(BusinessContext)
  if(context===undefined){
    throw new Error('useBusiness must be used within a BusinessProvider')
  }
  return context
}