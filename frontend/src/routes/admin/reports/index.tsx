import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { api, API_URL } from '@/config'
import { useAuth } from '@/contexts/auth-context'
import { AuthGuard } from '@/middlewares/AuthGuard'
import { createFileRoute } from '@tanstack/react-router'
import {
    AlertTriangle,
    BarChart3,
    Calendar,
    DollarSign,
    Download,
    Package,
    RefreshCw,
    ShoppingCart,
    TrendingUp
} from 'lucide-react'
import { useEffect, useState } from 'react'
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts'

interface SalesSummary{
  total_sales:number
  total_orders:number
  total_items:number
  average_order_value:number
  top_products:TopProduct[]
  sales_by_day:SalesByDay[]
  sales_by_hour:SalesByHour[]
}

interface TopProduct{
  product_name:string
  quantity:number
  revenue:number
}

interface SalesByDay{
  date:string
  total:number
}

interface SalesByHour{
  hour:number
  total:number
}

interface InventoryReport{
  total_products:number
  low_stock_count:number
  out_of_stock_count:number
  total_value:number
  products:InventoryItem[]
}

interface InventoryItem{
  product_name:string
  quantity:number
  price:number
  value:number
  status:'in_stock'|'low_stock'|'out_of_stock'|'unlimited'
}

const COLORS=['#0088FE','#00C49F','#FFBB28','#FF8042','#8884D8','#82CA9D','#FFC658','#FF6B6B','#4ECDC4','#45B7D1']

const formatPrice=(n:number)=>`${Math.floor(n).toLocaleString('uz-UZ')} so'm`

export const Route=createFileRoute('/admin/reports/')({
  component:()=>(
    <AuthGuard allowedRoles={['admin']}>
      <ReportsPage/>
    </AuthGuard>
  ),
})

function ReportsPage(){
  const {token}=useAuth()
  
  const [activeTab,setActiveTab]=useState<'sales'|'inventory'>('sales')
  const [salesData,setSalesData]=useState<SalesSummary|null>(null)
  const [inventoryData,setInventoryData]=useState<InventoryReport|null>(null)
  const [isLoading,setIsLoading]=useState(false)
  const [error,setError]=useState<string|null>(null)
  
  const [startDate,setStartDate]=useState('')
  const [endDate,setEndDate]=useState('')
  const [isDownloading,setIsDownloading]=useState(false)

  const fetchSalesReport=async()=>{
    setIsLoading(true)
    setError(null)
    try{
      const params=new URLSearchParams()
      if(startDate)params.append('start_date',new Date(startDate).toISOString())
      if(endDate)params.append('end_date',new Date(endDate).toISOString())
      
      const response=await fetch(`${API_URL}${api.admin.base}/${api.admin.reports}/sales?${params}`,{
        headers:{'Authorization':`Bearer ${token}`}
      })
      
      if(!response.ok)throw new Error('Failed to fetch sales report')
      
      const data=await response.json()
      setSalesData(data)
    }catch(err){
      setError(err instanceof Error?err.message:'Failed to load report')
    }finally{
      setIsLoading(false)
    }
  }

  const fetchInventoryReport=async()=>{
    setIsLoading(true)
    setError(null)
    try{
      const response=await fetch(`${api.admin.base}/${api.admin.reports}/inventory`,{
        headers:{'Authorization':`Bearer ${token}`}
      })
      
      if(!response.ok)throw new Error('Failed to fetch inventory report')
      
      const data=await response.json()
      setInventoryData(data)
    }catch(err){
      setError(err instanceof Error?err.message:'Failed to load report')
    }finally{
      setIsLoading(false)
    }
  }

  const downloadExcelReport=async()=>{
    setIsDownloading(true)
    try{
      const response=await fetch(`${api.admin.base}/${api.admin.reports}/sales/excel`,{
        method:'POST',
        headers:{
          'Content-Type':'application/json',
          'Authorization':`Bearer ${token}`
        },
        body:JSON.stringify({
          start_date:startDate?new Date(startDate).toISOString():null,
          end_date:endDate?new Date(endDate).toISOString():null
        })
      })
      
      if(!response.ok)throw new Error('Failed to download report')
      
      const blob=await response.blob()
      const url=window.URL.createObjectURL(blob)
      const a=document.createElement('a')
      a.href=url
      a.download=`sales_report_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    }catch(err){
      alert('Failed to download report')
    }finally{
      setIsDownloading(false)
    }
  }

  useEffect(()=>{
    if(token){
      if(activeTab==='sales'){
        fetchSalesReport()
      }else{
        fetchInventoryReport()
      }
    }
  },[token,activeTab])

  const getStatusBadge=(status:string)=>{
    const badges={
      in_stock:'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400',
      low_stock:'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400',
      out_of_stock:'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400',
      unlimited:'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400'
    }
    const labels={
      in_stock:'Omborda',
      low_stock:'Kam qoldi',
      out_of_stock:'Tugagan',
      unlimited:'Cheksiz'
    }
    return(
      <span className={`px-2 py-1 rounded text-xs font-semibold ${badges[status]}`}>
        {labels[status]}
      </span>
    )
  }

  return(
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="size-7 text-blue-600"/>
          <h1 className="text-2xl font-bold">Hisobotlar</h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant={activeTab==='sales'?'default':'outline'}
            onClick={()=>setActiveTab('sales')}
          >
            <TrendingUp className="size-4 mr-2"/>
            Savdo
          </Button>
          <Button
            variant={activeTab==='inventory'?'default':'outline'}
            onClick={()=>setActiveTab('inventory')}
          >
            <Package className="size-4 mr-2"/>
            Ombor
          </Button>
        </div>
      </div>

      {/* Sales Report */}
      {activeTab==='sales'&&(
        <div className="space-y-6">
          {/* Date Filter */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="size-5"/>
                Davr tanlash
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <Label htmlFor="start-date">Boshlanish</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e)=>setStartDate(e.target.value)}
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <Label htmlFor="end-date">Tugash</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e)=>setEndDate(e.target.value)}
                />
              </div>
              <div className="flex items-end gap-2">
                <Button onClick={fetchSalesReport} disabled={isLoading}>
                  <RefreshCw className={`size-4 mr-2 ${isLoading?'animate-spin':''}`}/>
                  Yangilash
                </Button>
                <Button onClick={downloadExcelReport} disabled={isDownloading} variant="outline">
                  <Download className={`size-4 mr-2 ${isDownloading?'animate-spin':''}`}/>
                  Excel
                </Button>
              </div>
            </CardContent>
          </Card>

          {isLoading?(
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="size-10 animate-spin text-blue-600"/>
            </div>
          ):error?(
            <div className="flex items-center justify-center h-64 text-destructive">
              {error}
            </div>
          ):salesData?(
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Jami savdo</CardTitle>
                    <DollarSign className="size-4 text-muted-foreground"/>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatPrice(salesData.total_sales)}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Buyurtmalar</CardTitle>
                    <ShoppingCart className="size-4 text-muted-foreground"/>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{salesData.total_orders}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Sotilgan mahsulotlar</CardTitle>
                    <Package className="size-4 text-muted-foreground"/>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{salesData.total_items}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">O'rtacha chek</CardTitle>
                    <TrendingUp className="size-4 text-muted-foreground"/>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatPrice(salesData.average_order_value)}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Daily Sales Chart */}
                {salesData.sales_by_day.length>0&&(
                  <Card>
                    <CardHeader>
                      <CardTitle>Kunlik savdo</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={salesData.sales_by_day}>
                          <CartesianGrid strokeDasharray="3 3"/>
                          <XAxis dataKey="date"/>
                          <YAxis/>
                          <Tooltip/>
                          <Line type="monotone" dataKey="total" stroke="#8884d8" strokeWidth={2}/>
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

                {/* Hourly Sales Chart */}
                {salesData.sales_by_hour.length>0&&(
                  <Card>
                    <CardHeader>
                      <CardTitle>Soatlik savdo</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={salesData.sales_by_hour}>
                          <CartesianGrid strokeDasharray="3 3"/>
                          <XAxis dataKey="hour"/>
                          <YAxis/>
                          <Tooltip/>
                          <Bar dataKey="total" fill="#82ca9d"/>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Top Products */}
              {salesData.top_products.length>0&&(
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Top mahsulotlar</CardTitle>
                      <CardDescription>Eng ko'p sotilgan mahsulotlar</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {salesData.top_products.slice(0,5).map((product,idx)=>(
                          <div key={idx} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="font-bold text-lg text-muted-foreground">#{idx+1}</div>
                              <div>
                                <div className="font-semibold">{product.product_name}</div>
                                <div className="text-sm text-muted-foreground">{product.quantity} dona</div>
                              </div>
                            </div>
                            <div className="font-bold text-green-600">{formatPrice(product.revenue)}</div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Mahsulotlar bo'yicha taqsimot</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={salesData.top_products.slice(0,5)}
                            dataKey="revenue"
                            nameKey="product_name"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            label
                          >
                            {salesData.top_products.slice(0,5).map((_,index)=>(
                              <Cell key={`cell-${index}`} fill={COLORS[index%COLORS.length]}/>
                            ))}
                          </Pie>
                          <Tooltip/>
                          <Legend/>
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              )}
            </>
          ):null}
        </div>
      )}

      {/* Inventory Report */}
      {activeTab==='inventory'&&(
        <div className="space-y-6">
          {isLoading?(
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="size-10 animate-spin text-blue-600"/>
            </div>
          ):error?(
            <div className="flex items-center justify-center h-64 text-destructive">
              {error}
            </div>
          ):inventoryData?(
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Jami mahsulotlar</CardTitle>
                    <Package className="size-4 text-muted-foreground"/>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{inventoryData.total_products}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Kam qolgan</CardTitle>
                    <AlertTriangle className="size-4 text-yellow-600"/>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-600">{inventoryData.low_stock_count}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Tugagan</CardTitle>
                    <AlertTriangle className="size-4 text-red-600"/>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">{inventoryData.out_of_stock_count}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Umumiy qiymat</CardTitle>
                    <DollarSign className="size-4 text-muted-foreground"/>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatPrice(inventoryData.total_value)}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Inventory Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Ombor holati</CardTitle>
                  <CardDescription>Barcha mahsulotlar ro'yxati</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Mahsulot</TableHead>
                          <TableHead>Miqdor</TableHead>
                          <TableHead>Narx</TableHead>
                          <TableHead>Qiymat</TableHead>
                          <TableHead>Holat</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {inventoryData.products.map((product,idx)=>(
                          <TableRow key={idx}>
                            <TableCell className="font-semibold">{product.product_name}</TableCell>
                            <TableCell>
                              {product.quantity===-1?'∞ Cheksiz':`${product.quantity} dona`}
                            </TableCell>
                            <TableCell>{formatPrice(product.price)}</TableCell>
                            <TableCell className="font-bold text-green-600">
                              {product.quantity===-1?'-':formatPrice(product.value)}
                            </TableCell>
                            <TableCell>{getStatusBadge(product.status)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          ):null}
        </div>
      )}
    </div>
  )
}

export default ReportsPage