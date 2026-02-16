import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/config'
import { useAuth } from '@/contexts/auth-context'
import { AuthGuard } from '@/middlewares/AuthGuard'
import { createFileRoute, Link } from '@tanstack/react-router'
import {
    AlertTriangle,
    ArrowDown,
    ArrowUp,
    BarChart3,
    Calendar,
    Clock,
    DollarSign, Minus,
    Package,
    RefreshCw,
    ShoppingCart, Users
} from 'lucide-react'
import { useEffect, useState } from 'react'
import {
    CartesianGrid, Line,
    LineChart, ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts'

interface DashboardStats{
  sales:SalesStats
  inventory:InventoryStats
  orders:OrderStats
  users:UserStats
}

interface SalesStats{
  today:number
  yesterday:number
  thisWeek:number
  thisMonth:number
  trend:number
}

interface InventoryStats{
  totalProducts:number
  lowStock:number
  outOfStock:number
  totalValue:number
}

interface OrderStats{
  todayOrders:number
  pendingOrders:number
  completedToday:number
  averageOrderValue:number
}

interface UserStats{
  totalUsers:number
  activeUsers:number
  staffCount:number
  adminCount:number
}

interface RecentOrder{
  id:number
  total:number
  status:string
  created_at:string
  user?:{full_name:string}
  table?:{number:string}
}

interface TopProduct{
  product_name:string
  quantity:number
  revenue:number
}

const COLORS=['#0088FE','#00C49F','#FFBB28','#FF8042','#8884D8']

const formatPrice=(n:number)=>`${Math.floor(n).toLocaleString('uz-UZ')} so'm`

export const Route=createFileRoute('/admin')({
  component:()=>(
    <AuthGuard allowedRoles={['admin']}>
      <DashboardPage/>
    </AuthGuard>
  ),
})

// Mock t() function - replace with your actual i18n implementation
const t=(key:string)=>{
  const translations:{[key:string]:string}={
    // Dashboard
    'dashboard.title':'Boshqaruv Paneli',
    'dashboard.welcome':'Xush kelibsiz',
    'dashboard.overview':'Umumiy ko\'rsatkichlar',
    'dashboard.refresh':'Yangilash',
    'dashboard.lastUpdated':'Oxirgi yangilanish',
    
    // Stats Cards
    'dashboard.stats.sales':'Bugungi savdo',
    'dashboard.stats.orders':'Bugungi buyurtmalar',
    'dashboard.stats.products':'Jami mahsulotlar',
    'dashboard.stats.users':'Foydalanuvchilar',
    'dashboard.stats.averageOrder':'O\'rtacha chek',
    'dashboard.stats.pending':'Kutilmoqda',
    'dashboard.stats.completed':'Bajarildi',
    'dashboard.stats.lowStock':'Kam qoldi',
    'dashboard.stats.outOfStock':'Tugagan',
    'dashboard.stats.inventoryValue':'Ombor qiymati',
    
    // Trends
    'dashboard.trend.up':'Oshdi',
    'dashboard.trend.down':'Tushdi',
    'dashboard.trend.same':'O\'zgarmadi',
    'dashboard.trend.vsYesterday':'Kechaga nisbatan',
    
    // Sections
    'dashboard.section.recentOrders':'So\'nggi buyurtmalar',
    'dashboard.section.topProducts':'Top mahsulotlar',
    'dashboard.section.salesTrend':'Savdo tendensiyasi',
    'dashboard.section.quickActions':'Tezkor harakatlar',
    
    // Quick Actions
    'dashboard.action.newOrder':'Yangi buyurtma',
    'dashboard.action.addProduct':'Mahsulot qo\'shish',
    'dashboard.action.manageUsers':'Foydalanuvchilar',
    'dashboard.action.viewReports':'Hisobotlar',
    'dashboard.action.settings':'Sozlamalar',
    
    // Recent Orders
    'dashboard.order.id':'ID',
    'dashboard.order.time':'Vaqt',
    'dashboard.order.table':'Stol',
    'dashboard.order.server':'Xizmatchi',
    'dashboard.order.total':'Summa',
    'dashboard.order.status':'Holat',
    'dashboard.order.view':'Ko\'rish',
    'dashboard.order.noOrders':'Buyurtmalar yo\'q',
    
    // Status
    'status.pending':'Kutilmoqda',
    'status.completed':'Bajarildi',
    'status.cancelled':'Bekor qilindi',
    
    // Common
    'common.viewAll':'Barchasini ko\'rish',
    'common.loading':'Yuklanmoqda...',
    'common.error':'Xatolik',
  }
  return translations[key]||key
}

function DashboardPage(){
  const {token}=useAuth()
  
  const [isLoading,setIsLoading]=useState(true)
  const [error,setError]=useState<string|null>(null)
  const [lastUpdated,setLastUpdated]=useState<Date>(new Date())
  
  const [salesStats,setSalesStats]=useState<SalesStats>({
    today:0,
    yesterday:0,
    thisWeek:0,
    thisMonth:0,
    trend:0
  })
  
  const [inventoryStats,setInventoryStats]=useState<InventoryStats>({
    totalProducts:0,
    lowStock:0,
    outOfStock:0,
    totalValue:0
  })
  
  const [orderStats,setOrderStats]=useState<OrderStats>({
    todayOrders:0,
    pendingOrders:0,
    completedToday:0,
    averageOrderValue:0
  })
  
  const [userStats,setUserStats]=useState<UserStats>({
    totalUsers:0,
    activeUsers:0,
    staffCount:0,
    adminCount:0
  })
  
  const [recentOrders,setRecentOrders]=useState<RecentOrder[]>([])
  const [topProducts,setTopProducts]=useState<TopProduct[]>([])
  const [salesTrend,setSalesTrend]=useState<{date:string;total:number}[]>([])

  const fetchDashboardData=async()=>{
    setIsLoading(true)
    setError(null)
    
    try{
      // Get today's date range
      const today=new Date()
      const startOfToday=new Date(today.setHours(0,0,0,0))
      const endOfToday=new Date(today.setHours(23,59,59,999))
      
      const yesterday=new Date()
      yesterday.setDate(yesterday.getDate()-1)
      const startOfYesterday=new Date(yesterday.setHours(0,0,0,0))
      const endOfYesterday=new Date(yesterday.setHours(23,59,59,999))
      
      // Fetch sales summary for today
      const todayParams=new URLSearchParams({
        start_date:startOfToday.toISOString(),
        end_date:endOfToday.toISOString()
      })
      
      const yesterdayParams=new URLSearchParams({
        start_date:startOfYesterday.toISOString(),
        end_date:endOfYesterday.toISOString()
      })
      
      const [todaySales,yesterdaySales,inventory,orders,users,topProds]=await Promise.all([
        fetch(`${api.admin.base}/${api.admin.reports}/sales?${todayParams}`,{
          headers:{'Authorization':`Bearer ${token}`}
        }).then(r=>r.json()),
        
        fetch(`${api.admin.base}/${api.admin.reports}/sales?${yesterdayParams}`,{
          headers:{'Authorization':`Bearer ${token}`}
        }).then(r=>r.json()),
        
        fetch(`${api.admin.base}/${api.admin.reports}/inventory`,{
          headers:{'Authorization':`Bearer ${token}`}
        }).then(r=>r.json()),
        
        fetch(`${api.orders.base}/${api.orders.orders}`,{
          headers:{'Authorization':`Bearer ${token}`}
        }).then(r=>r.json()),
        
        fetch(`${api.admin.base}/${api.admin.users}`,{
          headers:{'Authorization':`Bearer ${token}`}
        }).then(r=>r.json()),
        
        // Get top products for last 7 days
        (()=>{
          const last7Days=new Date()
          last7Days.setDate(last7Days.getDate()-7)
          const params=new URLSearchParams({
            start_date:last7Days.toISOString()
          })
          return fetch(`${api.admin.base}/${api.admin.reports}/sales?${params}`,{
            headers:{'Authorization':`Bearer ${token}`}
          }).then(r=>r.json())
        })()
      ])
      
      // Process sales stats
      const todayTotal=todaySales.total_sales||0
      const yesterdayTotal=yesterdaySales.total_sales||0
      const trend=yesterdayTotal>0?((todayTotal-yesterdayTotal)/yesterdayTotal)*100:0
      
      setSalesStats({
        today:todayTotal,
        yesterday:yesterdayTotal,
        thisWeek:0,
        thisMonth:0,
        trend
      })
      
      // Process inventory stats
      setInventoryStats({
        totalProducts:inventory.total_products||0,
        lowStock:inventory.low_stock_count||0,
        outOfStock:inventory.out_of_stock_count||0,
        totalValue:inventory.total_value||0
      })
      
      // Process order stats
      const todayOrders=orders.orders?.filter((o:any)=>{
        const orderDate=new Date(o.created_at)
        return orderDate>=startOfToday&&orderDate<=endOfToday
      })||[]
      
      const pending=orders.orders?.filter((o:any)=>o.status==='pending')||[]
      const completedToday=todayOrders.filter((o:any)=>o.status==='completed')
      
      setOrderStats({
        todayOrders:todayOrders.length,
        pendingOrders:pending.length,
        completedToday:completedToday.length,
        averageOrderValue:todaySales.average_order_value||0
      })
      
      // Process user stats
      const allUsers=users.users||[]
      const active=allUsers.filter((u:any)=>u.status==='active')
      const staff=allUsers.filter((u:any)=>u.role==='staff')
      const admins=allUsers.filter((u:any)=>u.role==='admin')
      
      setUserStats({
        totalUsers:allUsers.length,
        activeUsers:active.length,
        staffCount:staff.length,
        adminCount:admins.length
      })
      
      // Recent orders
      const recent=(orders.orders||[]).slice(0,5)
      setRecentOrders(recent)
      
      // Top products
      setTopProducts(topProds.top_products?.slice(0,5)||[])
      
      // Sales trend (last 7 days)
      setSalesTrend(topProds.sales_by_day?.slice(-7)||[])
      
      setLastUpdated(new Date())
      
    }catch(err){
      console.error('Dashboard error:',err)
      setError(t('common.error'))
    }finally{
      setIsLoading(false)
    }
  }

  useEffect(()=>{
    if(token){
      fetchDashboardData()
    }
  },[token])

  const getTrendIcon=(trend:number)=>{
    if(trend>5)return<ArrowUp className="size-4 text-green-600"/>
    if(trend<-5)return<ArrowDown className="size-4 text-red-600"/>
    return<Minus className="size-4 text-gray-600"/>
  }

  const getTrendColor=(trend:number)=>{
    if(trend>5)return'text-green-600'
    if(trend<-5)return'text-red-600'
    return'text-gray-600'
  }

  const getStatusBadge=(status:string)=>{
    const badges={
      pending:'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400',
      completed:'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400',
      cancelled:'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
    }
    return(
      <span className={`px-2 py-1 rounded text-xs font-semibold ${badges[status]||badges.pending}`}>
        {t(`status.${status}`)}
      </span>
    )
  }

  const formatTime=(dateStr:string)=>{
    const date=new Date(dateStr)
    return date.toLocaleTimeString('uz-UZ',{hour:'2-digit',minute:'2-digit'})
  }

  if(isLoading){
    return(
      <div className="flex items-center justify-center h-screen">
        <RefreshCw className="size-10 animate-spin text-blue-600"/>
      </div>
    )
  }

  return(
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('dashboard.title')}</h1>
          <p className="text-muted-foreground flex items-center gap-2 mt-1">
            <Clock className="size-4"/>
            {t('dashboard.lastUpdated')}: {lastUpdated.toLocaleTimeString('uz-UZ')}
          </p>
        </div>
        <Button onClick={fetchDashboardData} disabled={isLoading}>
          <RefreshCw className={`size-4 mr-2 ${isLoading?'animate-spin':''}`}/>
          {t('dashboard.refresh')}
        </Button>
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Sales */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.stats.sales')}</CardTitle>
            <DollarSign className="size-4 text-muted-foreground"/>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(salesStats.today)}</div>
            <div className={`flex items-center gap-1 text-xs mt-1 ${getTrendColor(salesStats.trend)}`}>
              {getTrendIcon(salesStats.trend)}
              <span>{Math.abs(salesStats.trend).toFixed(1)}%</span>
              <span className="text-muted-foreground">{t('dashboard.trend.vsYesterday')}</span>
            </div>
          </CardContent>
        </Card>

        {/* Today's Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.stats.orders')}</CardTitle>
            <ShoppingCart className="size-4 text-muted-foreground"/>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orderStats.todayOrders}</div>
            <div className="flex gap-3 text-xs mt-1 text-muted-foreground">
              <span className="text-yellow-600">{orderStats.pendingOrders} {t('dashboard.stats.pending')}</span>
              <span className="text-green-600">{orderStats.completedToday} {t('dashboard.stats.completed')}</span>
            </div>
          </CardContent>
        </Card>

        {/* Inventory Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.stats.products')}</CardTitle>
            <Package className="size-4 text-muted-foreground"/>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventoryStats.totalProducts}</div>
            <div className="flex gap-3 text-xs mt-1">
              <span className="text-yellow-600 flex items-center gap-1">
                <AlertTriangle className="size-3"/>
                {inventoryStats.lowStock} {t('dashboard.stats.lowStock')}
              </span>
              <span className="text-red-600">{inventoryStats.outOfStock} {t('dashboard.stats.outOfStock')}</span>
            </div>
          </CardContent>
        </Card>

        {/* Users */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.stats.users')}</CardTitle>
            <Users className="size-4 text-muted-foreground"/>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats.totalUsers}</div>
            <div className="flex gap-3 text-xs mt-1 text-muted-foreground">
              <span>{userStats.activeUsers} Faol</span>
              <span>{userStats.staffCount} Xodim</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend */}
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.section.salesTrend')}</CardTitle>
            <CardDescription>So'nggi 7 kun</CardDescription>
          </CardHeader>
          <CardContent>
            {salesTrend.length>0?(
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={salesTrend}>
                  <CartesianGrid strokeDasharray="3 3"/>
                  <XAxis dataKey="date" tick={{fontSize:12}}/>
                  <YAxis tick={{fontSize:12}}/>
                  <Tooltip/>
                  <Line type="monotone" dataKey="total" stroke="#8884d8" strokeWidth={2}/>
                </LineChart>
              </ResponsiveContainer>
            ):(
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                Ma'lumot yo'q
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.section.topProducts')}</CardTitle>
            <CardDescription>So'nggi 7 kun</CardDescription>
          </CardHeader>
          <CardContent>
            {topProducts.length>0?(
              <div className="space-y-3">
                {topProducts.map((product,idx)=>(
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
            ):(
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                Ma'lumot yo'q
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t('dashboard.section.recentOrders')}</CardTitle>
            <CardDescription>So'nggi 5 ta buyurtma</CardDescription>
          </div>
          <Link to="/admin/orders">
            <Button variant="outline" size="sm">
              {t('common.viewAll')}
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recentOrders.length>0?(
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-3 text-sm font-semibold">ID</th>
                    <th className="text-left p-3 text-sm font-semibold">{t('dashboard.order.time')}</th>
                    <th className="text-left p-3 text-sm font-semibold">{t('dashboard.order.table')}</th>
                    <th className="text-left p-3 text-sm font-semibold">{t('dashboard.order.server')}</th>
                    <th className="text-right p-3 text-sm font-semibold">{t('dashboard.order.total')}</th>
                    <th className="text-center p-3 text-sm font-semibold">{t('dashboard.order.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order)=>(
                    <tr key={order.id} className="border-t hover:bg-muted/50">
                      <td className="p-3">#{order.id}</td>
                      <td className="p-3">{formatTime(order.created_at)}</td>
                      <td className="p-3">{order.table?.number||'-'}</td>
                      <td className="p-3">{order.user?.full_name||'-'}</td>
                      <td className="p-3 text-right font-bold text-green-600">
                        {formatPrice(order.total)}
                      </td>
                      <td className="p-3 text-center">{getStatusBadge(order.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ):(
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              {t('dashboard.order.noOrders')}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.section.quickActions')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Link to="/staff">
              <Button variant="outline" className="w-full h-20 flex-col gap-2">
                <ShoppingCart className="size-5"/>
                <span className="text-xs">{t('dashboard.action.newOrder')}</span>
              </Button>
            </Link>
            
            <Link to="/admin/products">
              <Button variant="outline" className="w-full h-20 flex-col gap-2">
                <Package className="size-5"/>
                <span className="text-xs">{t('dashboard.action.addProduct')}</span>
              </Button>
            </Link>
            
            <Link to="/admin/users">
              <Button variant="outline" className="w-full h-20 flex-col gap-2">
                <Users className="size-5"/>
                <span className="text-xs">{t('dashboard.action.manageUsers')}</span>
              </Button>
            </Link>
            
            <Link to="/admin/reports">
              <Button variant="outline" className="w-full h-20 flex-col gap-2">
                <BarChart3 className="size-5"/>
                <span className="text-xs">{t('dashboard.action.viewReports')}</span>
              </Button>
            </Link>
            
            <Link to="/admin/settings">
              <Button variant="outline" className="w-full h-20 flex-col gap-2">
                <Calendar className="size-5"/>
                <span className="text-xs">{t('dashboard.action.settings')}</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default DashboardPage