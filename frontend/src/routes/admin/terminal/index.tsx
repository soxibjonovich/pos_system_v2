import { api, API_URL } from "@/config"
import { useAuth } from "@/contexts/auth-context"
import { useBusiness } from "@/contexts/business-context"
import { AuthGuard } from "@/middlewares/AuthGuard"
import { printService } from "@/utils/printService"
import { createFileRoute, Link } from "@tanstack/react-router"
import {
  ArrowLeft,
  Check,
  Minus,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

// ─── types ───────────────────────────────────────────────────────────────────

interface Product {
  id: number
  title: string
  description: string | null
  category_id: number | null
  quantity: number
  price: number
  is_active: boolean
  image_url?: string
}

interface Category {
  id: number
  name: string
  is_active: boolean
}

interface TableItem {
  id: number
  number: string
  location?: string | null
  capacity: number | null
  is_active: boolean
  status: "available" | "occupied" | "reserved" | string
}

interface CartItem {
  product_id: number
  title: string
  price: number
  quantity: number
}

interface ActiveTableOrder {
  order_id: number
  table_id: number
  status: string
  created_at: string
  user_name: string
  total: number
}

interface ExistingItemRef {
  item_id: number
  product_id: number
  quantity: number
  price: number
}

// ─── helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) => `${Math.floor(n).toLocaleString("uz-UZ")} so'm`

const TABLES_PER_PAGE = 12

// ─── route ───────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/admin/terminal/")({
  component: () => (
    <AuthGuard allowedRoles={["admin", "manager"]}>
      <AdminTerminal />
    </AuthGuard>
  ),
})

// ─── component ───────────────────────────────────────────────────────────────

function AdminTerminal() {
  const { token } = useAuth()
  const { isRestaurant, isLoading: bizLoading } = useBusiness()

  const ADMIN_API = `${API_URL}/api/admin`
  const ORDER_API = `${API_URL}${api.orders.base}/orders`

  const authH = { "Content-Type": "application/json", Authorization: `Bearer ${token}` }

  // ── state ──────────────────────────────────────────────────────────────────
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [tables, setTables] = useState<TableItem[]>([])
  const [tableOrders, setTableOrders] = useState<Record<number, ActiveTableOrder>>({})
  const [activeOrderId, setActiveOrderId] = useState<number | null>(null)
  const [baseItems, setBaseItems] = useState<ExistingItemRef[]>([])
  const [tableLoading, setTableLoading] = useState(false)
  const [cart, setCart] = useState<CartItem[]>([])
  const [defaultFee, setDefaultFee] = useState(0)
  const [feePercent, setFeePercent] = useState(0)
  const [baseFee, setBaseFee] = useState(0)
  const [defaultQqs, setDefaultQqs] = useState(0)
  const [qqsPercent, setQqsPercent] = useState(0)
  const [baseQqs, setBaseQqs] = useState(0)
  const [search, setSearch] = useState("")
  const [locationFilter, setLocationFilter] = useState<string | null>(null)
  const [tablePage, setTablePage] = useState(1)
  const [selectedCat, setSelectedCat] = useState<number | null>(null)
  const [selectedTable, setSelectedTable] = useState<TableItem | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">("cash")
  const [orderType, setOrderType] = useState<"dine_in" | "takeaway" | "delivery">("dine_in")

  const searchRef = useRef<HTMLInputElement>(null)

  const CURRENT_USER_ID = Number(localStorage.getItem("userId"))
  const CURRENT_USER_NAME = localStorage.getItem("userName") || "Admin"

  // ── data fetching ──────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const reqs: Promise<Response>[] = [
        fetch(`${ADMIN_API}/products`, { headers: authH }),
        fetch(`${ADMIN_API}/categories`, { headers: authH }),
      ]
      if (isRestaurant) reqs.push(fetch(`${ADMIN_API}/tables?active_only=true`, { headers: authH }))

      const resps = await Promise.all(reqs)
      const [prodData, catData, tableData] = await Promise.all(resps.map((r) => r.json()))

      setProducts(prodData.products || [])
      setCategories(catData.categories || [])
      if (isRestaurant) setTables(tableData.tables || [])

      try {
        const cfgRes = await fetch(`${API_URL}${api.orders.base}/${api.orders.config}`)
        if (cfgRes.ok) {
          const cfg = await cfgRes.json()
          const fee = Number(cfg?.service_fee_percent || 0)
          const qqs = Number(cfg?.qqs_percent || 0)
          setDefaultFee(fee)
          setDefaultQqs(qqs)
          if (!activeOrderId) {
            setFeePercent(fee); setBaseFee(fee)
            setQqsPercent(qqs); setBaseQqs(qqs)
          }
        }
      } catch { /* keep defaults */ }
    } catch (e) {
      console.error("AdminTerminal fetchData:", e)
    } finally {
      setIsLoading(false)
    }
  }, [isRestaurant, token])

  const fetchTableActivity = useCallback(async () => {
    if (!isRestaurant) return
    try {
      const res = await fetch(ORDER_API, { headers: authH })
      if (!res.ok) return
      const data = await res.json()
      const active = (data.orders || []).filter((o: any) =>
        o?.table_id && ["pending", "preparing", "ready"].includes(String(o?.status || ""))
      )
      const mapped: Record<number, ActiveTableOrder> = {}
      for (const o of active) {
        const tid = Number(o.table_id)
        if (!tid || mapped[tid]) continue
        mapped[tid] = {
          order_id: Number(o.id),
          table_id: tid,
          status: String(o.status || ""),
          created_at: String(o.created_at || ""),
          total: Number(o.total || 0),
          user_name: o?.user?.full_name || o?.user?.username || "Noma'lum",
        }
      }
      setTableOrders(mapped)
    } catch { /* silent */ }
  }, [isRestaurant, token])

  useEffect(() => {
    if (!bizLoading) { fetchData(); fetchTableActivity() }
  }, [bizLoading])

  useEffect(() => {
    if (bizLoading || !isRestaurant) return
    fetchTableActivity()
    const t = setInterval(fetchTableActivity, 10000)
    return () => clearInterval(t)
  }, [bizLoading, isRestaurant, fetchTableActivity])

  // ── cart helpers ───────────────────────────────────────────────────────────

  const addToCart = useCallback((p: Product) => {
    setCart((prev) => {
      const ex = prev.find((i) => i.product_id === p.id)
      if (ex) return prev.map((i) => i.product_id === p.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { product_id: p.id, title: p.title, price: p.price, quantity: 1 }]
    })
  }, [])

  const updateQty = useCallback((pid: number, delta: number) => {
    setCart((prev) =>
      prev.map((i) => i.product_id === pid ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i)
        .filter((i) => i.quantity > 0)
    )
  }, [])

  const setQty = useCallback((pid: number, qty: number) => {
    if (qty <= 0) { setCart((prev) => prev.filter((i) => i.product_id !== pid)); return }
    setCart((prev) => prev.map((i) => i.product_id === pid ? { ...i, quantity: qty } : i))
  }, [])

  const removeFromCart = useCallback((pid: number) => {
    setCart((prev) => prev.filter((i) => i.product_id !== pid))
  }, [])

  const clearCart = useCallback(() => {
    setCart([]); setSelectedTable(null); setActiveOrderId(null); setBaseItems([])
    setFeePercent(defaultFee); setBaseFee(defaultFee)
    setQqsPercent(defaultQqs); setBaseQqs(defaultQqs)
  }, [defaultFee, defaultQqs])

  // ── computed ───────────────────────────────────────────────────────────────

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0)
  const qqsAmt = Math.round(subtotal * qqsPercent) / 100
  const feeAmt = Math.round(subtotal * feePercent) / 100
  const total = subtotal + qqsAmt + feeAmt
  const itemCount = cart.reduce((s, i) => s + i.quantity, 0)
  const baseQtyByPid = baseItems.reduce<Record<number, number>>((acc, i) => {
    acc[i.product_id] = (acc[i.product_id] || 0) + i.quantity; return acc
  }, {})

  const filteredProducts = products.filter(
    (p) => p.is_active &&
      p.title.toLowerCase().includes(search.toLowerCase()) &&
      (selectedCat !== null ? p.category_id === selectedCat : true)
  )

  // ── table helpers ──────────────────────────────────────────────────────────

  const parseDate = (s?: string) => {
    if (!s) return null
    const norm = /[zZ]|[+-]\d{2}:\d{2}$/.test(s) ? s : `${s}Z`
    const d = new Date(norm)
    return isNaN(d.getTime()) ? null : d
  }

  const elapsed = (s?: string) => {
    const d = parseDate(s)
    if (!d) return "-"
    const m = Math.max(0, Math.floor((Date.now() - d.getTime()) / 60000))
    const h = Math.floor(m / 60), min = m % 60
    return h ? `${h}h ${min}min` : `${min}min`
  }

  const tableCardMeta = (t: TableItem) => {
    const ao = tableOrders[t.id]
    if (!t.is_active) return { title: "Nofaol", sub: "", price: "-", cls: "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed" }
    if (t.status === "reserved") return { title: "Band", sub: elapsed(ao?.created_at), price: ao ? fmt(ao.total) : "-", cls: "bg-orange-100 border-orange-300 text-orange-900" }
    if (t.status === "occupied" || ao) return { title: ao?.user_name || "Xodim", sub: elapsed(ao?.created_at), price: ao ? fmt(ao.total) : "-", cls: "bg-emerald-100 border-emerald-300 text-emerald-900" }
    return { title: "Bo'sh", sub: "", price: "-", cls: "bg-white border-slate-200 text-slate-700" }
  }

  const locationOptions = Array.from(
    new Set(tables.map((t) => t.location).filter((v): v is string => Boolean(v)))
  ).sort()

  const filteredTables = tables
    .filter((t) => t.is_active)
    .filter((t) => (locationFilter ? (t.location || "") === locationFilter : true))
    .filter((t) => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return t.number.toLowerCase().includes(q) || (t.location || "").toLowerCase().includes(q)
    })
    .sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }))

  const totalTablePages = Math.max(1, Math.ceil(filteredTables.length / TABLES_PER_PAGE))
  const curTablePage = Math.min(tablePage, totalTablePages)
  const paginatedTables = filteredTables.slice((curTablePage - 1) * TABLES_PER_PAGE, curTablePage * TABLES_PER_PAGE)
  const selectedTableOrder = selectedTable ? tableOrders[selectedTable.id] : undefined

  // ── table selection ────────────────────────────────────────────────────────

  const loadOrderForTable = useCallback(async (orderId: number) => {
    setTableLoading(true)
    try {
      const res = await fetch(`${ORDER_API}/${orderId}`, { headers: authH })
      if (!res.ok) { setActiveOrderId(orderId); return }
      const order = await res.json()
      const items = Array.isArray(order?.items) ? order.items : []
      setBaseItems(items.map((i: any) => ({
        item_id: Number(i.id), product_id: Number(i.product_id),
        quantity: Number(i.quantity), price: Number(i.price),
      })))
      const merged = new Map<number, CartItem>()
      for (const i of items) {
        const pid = Number(i.product_id)
        const title = i?.product?.title || products.find((p) => p.id === pid)?.title || `#${pid}`
        if (merged.has(pid)) merged.get(pid)!.quantity += Number(i.quantity)
        else merged.set(pid, { product_id: pid, title, price: Number(i.price), quantity: Number(i.quantity) })
      }
      setCart(Array.from(merged.values()))
      setFeePercent(Number(order?.fee_percent || 0)); setBaseFee(Number(order?.fee_percent || 0))
      setQqsPercent(Number(order?.qqs_percent || 0)); setBaseQqs(Number(order?.qqs_percent || 0))
      setActiveOrderId(orderId)
    } catch {
      setActiveOrderId(orderId)
    } finally {
      setTableLoading(false)
    }
  }, [products, token])

  const handleSelectTable = useCallback(async (t: TableItem) => {
    setSelectedTable(t)
    const ao = tableOrders[t.id]
    if (ao?.order_id) await loadOrderForTable(ao.order_id)
    else { setCart([]); setBaseItems([]); setActiveOrderId(null); setFeePercent(defaultFee); setBaseFee(defaultFee); setQqsPercent(defaultQqs); setBaseQqs(defaultQqs) }
  }, [tableOrders, loadOrderForTable, defaultFee, defaultQqs])

  // ── complete order ─────────────────────────────────────────────────────────

  const completeOrder = async () => {
    const oid = selectedTableOrder?.order_id || activeOrderId
    if (!oid) { alert("Yakunlash uchun faol buyurtma topilmadi"); return }
    if (selectedTableOrder && !["pending", "ready"].includes(selectedTableOrder.status)) {
      alert("Buyurtmani yakunlash uchun holat `pending` yoki `ready` bo'lishi kerak")
      return
    }
    setCompleting(true)
    try {
      const res = await fetch(`${ORDER_API}/${oid}/status`, {
        method: "PATCH", headers: authH, body: JSON.stringify({ status: "completed" }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || "Xatolik")
      setCart([]); setBaseItems([]); setActiveOrderId(null)
      await fetchTableActivity(); await fetchData()
    } catch (e) {
      alert(`Yakunlab bo'lmadi: ${e instanceof Error ? e.message : "Xatolik"}`)
    } finally {
      setCompleting(false)
    }
  }

  // ── submit order ───────────────────────────────────────────────────────────

  const submitOrder = async () => {
    if (!cart.length) return
    if (isRestaurant && !selectedTable) return
    setSubmitting(true)
    try {
      const oid = activeOrderId || selectedTableOrder?.order_id || null

      if (oid) {
        // ── update existing order ──────────────────────────────────────────
        const baseByPid = new Map<number, ExistingItemRef[]>()
        for (const i of baseItems) {
          const list = baseByPid.get(i.product_id) || []
          list.push(i); baseByPid.set(i.product_id, list)
        }
        const cartByPid = new Map(cart.map((i) => [i.product_id, i]))

        for (const [pid, rows] of baseByPid.entries()) {
          const changed = cartByPid.get(pid)
          const primary = rows[0]
          const curQty = rows.reduce((s, r) => s + r.quantity, 0)
          if (!changed) {
            for (const r of rows) await fetch(`${ORDER_API}/${oid}/items/${r.item_id}`, { method: "DELETE", headers: authH })
            continue
          }
          if (changed.quantity !== curQty || Number(changed.price) !== Number(primary.price)) {
            await fetch(`${ORDER_API}/${oid}/items/${primary.item_id}`, {
              method: "PUT", headers: authH,
              body: JSON.stringify({ quantity: changed.quantity, price: changed.price }),
            })
          }
          for (const dup of rows.slice(1)) await fetch(`${ORDER_API}/${oid}/items/${dup.item_id}`, { method: "DELETE", headers: authH })
        }

        for (const item of cart) {
          if (baseByPid.has(item.product_id)) continue
          const r = await fetch(`${ORDER_API}/${oid}/items`, {
            method: "POST", headers: authH,
            body: JSON.stringify({ product_id: item.product_id, quantity: item.quantity, price: item.price }),
          })
          if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail || "Mahsulot qo'shib bo'lmadi")
        }

        if (feePercent !== baseFee || qqsPercent !== baseQqs) {
          await fetch(`${ORDER_API}/${oid}`, {
            method: "PUT", headers: authH,
            body: JSON.stringify({ fee_percent: feePercent, qqs_percent: qqsPercent, payment_method: paymentMethod, order_type: orderType }),
          })
        }

        setOrderSuccess(true)
        await fetchData(); await fetchTableActivity(); await loadOrderForTable(oid)
        setTimeout(() => setOrderSuccess(false), 3000)
        return
      }

      // ── create new order ───────────────────────────────────────────────────
      const res = await fetch(ORDER_API, {
        method: "POST", headers: authH,
        body: JSON.stringify({
          user_id: CURRENT_USER_ID,
          business_type: isRestaurant ? "restaurant" : "market",
          table_id: isRestaurant && selectedTable ? selectedTable.id : null,
          fee_percent: feePercent, qqs_percent: qqsPercent,
          payment_method: paymentMethod, order_type: orderType,
          items: cart.map((i) => ({ product_id: i.product_id, quantity: i.quantity, price: i.price })),
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        const msg = Array.isArray(err.detail) ? err.detail.map((e: any) => `${e.loc?.join(".")}: ${e.msg}`).join(", ") : err.detail || "Failed"
        throw new Error(msg)
      }
      setOrderSuccess(true)
      clearCart(); await fetchData(); await fetchTableActivity()
      setTimeout(() => setOrderSuccess(false), 3000)
    } catch (e) {
      alert(`Buyurtma xatoligi: ${e instanceof Error ? e.message : "Noma'lum"}`)
    } finally {
      setSubmitting(false)
    }
  }

  // ── render: loading ────────────────────────────────────────────────────────

  if (bizLoading || isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <RefreshCw className="size-10 animate-spin text-indigo-400 mx-auto mb-4" />
          <p className="text-gray-300 text-lg">Yuklanmoqda...</p>
        </div>
      </div>
    )
  }

  // ── render: restaurant — table selection screen ────────────────────────────

  if (isRestaurant && !selectedTable) {
    const activeCnt = tables.filter((t) => t.is_active && (t.status === "occupied" || tableOrders[t.id])).length
    const reservedCnt = tables.filter((t) => t.is_active && t.status === "reserved").length

    return (
      <div className="h-screen bg-slate-900 p-3 sm:p-5">
        <div className="max-w-[1800px] mx-auto h-full bg-white rounded-3xl shadow-2xl p-4 sm:p-6 flex flex-col">

          {/* header */}
          <div className="mb-5 flex gap-3 items-center flex-wrap">
            <Link
              to="/admin"
              className="h-14 px-5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-base inline-flex items-center gap-2 shrink-0"
            >
              <ArrowLeft className="size-5" />
              Admin
            </Link>
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-400" />
              <input
                type="text"
                placeholder="Stol qidirish..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setTablePage(1) }}
                className="w-full pl-12 pr-4 h-14 rounded-2xl border-2 border-slate-300 text-slate-900 text-base"
              />
            </div>
            <button
              onClick={() => { fetchData(); fetchTableActivity() }}
              className="h-14 px-5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-base shrink-0"
            >
              <RefreshCw className="size-5" />
            </button>
            <Link
              to="/admin/orders"
              className="h-14 px-5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-base inline-flex items-center gap-2 shrink-0"
            >
              <Receipt className="size-5" />
              Tarix
            </Link>
          </div>

          {/* stats */}
          <div className="mb-4 flex items-center gap-3 flex-wrap">
            <span className="px-4 py-2 rounded-full bg-emerald-100 text-emerald-800 font-bold text-sm">Faol: {activeCnt}</span>
            <span className="px-4 py-2 rounded-full bg-orange-100 text-orange-800 font-bold text-sm">Band: {reservedCnt}</span>
            <span className="px-4 py-2 rounded-full bg-slate-100 text-slate-700 font-bold text-sm">Jami: {tables.filter((t) => t.is_active).length}</span>
          </div>

          {/* location filter */}
          {locationOptions.length > 0 && (
            <div className="mb-4 flex items-center gap-2 flex-wrap">
              <button
                onClick={() => { setLocationFilter(null); setTablePage(1) }}
                className={`px-4 py-2 rounded-full text-sm font-bold border-2 ${!locationFilter ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-700 border-slate-300"}`}
              >
                Hammasi
              </button>
              {locationOptions.map((loc) => (
                <button
                  key={loc}
                  onClick={() => { setLocationFilter(loc); setTablePage(1) }}
                  className={`px-4 py-2 rounded-full text-sm font-bold border-2 ${locationFilter === loc ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-700 border-slate-300"}`}
                >
                  {loc}
                </button>
              ))}
            </div>
          )}

          {/* table grid */}
          <div className="flex-1 overflow-y-auto">
            {!paginatedTables.length ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-lg">
                {locationFilter ? "Stol topilmadi" : tables.length === 0 ? "Stol qo'shilmagan" : "Avval joylashuvni tanlang"}
              </div>
            ) : (
              <div className="grid gap-3 pb-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))" }}>
                {paginatedTables.map((table) => {
                  const meta = tableCardMeta(table)
                  const canSelect = table.status === "available" || Boolean(tableOrders[table.id])
                  return (
                    <button
                      key={table.id}
                      onClick={() => canSelect && handleSelectTable(table)}
                      className={`rounded-xl border-2 p-3 text-left aspect-square transition-all ${canSelect ? "hover:shadow-lg cursor-pointer active:scale-[0.99]" : "cursor-not-allowed opacity-70"} ${meta.cls}`}
                    >
                      <div className="text-2xl font-black leading-none">{table.number}</div>
                      {table.location && <div className="text-[11px] opacity-60 mt-0.5">{table.location}</div>}
                      <div className="mt-2 text-xs font-semibold">{meta.title}</div>
                      {meta.sub && <div className="text-[11px] opacity-80 mt-0.5">{meta.sub}</div>}
                      {meta.price !== "-" && <div className="text-[11px] font-bold mt-1">{meta.price}</div>}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* pagination */}
          {filteredTables.length > TABLES_PER_PAGE && (
            <div className="pt-3 flex items-center justify-between gap-3 border-t border-slate-200 flex-wrap">
              <span className="text-sm text-slate-500 font-medium">{curTablePage} / {totalTablePages} ({filteredTables.length} stol)</span>
              <div className="flex gap-2">
                {[["Oldingi", () => setTablePage((p) => Math.max(1, p - 1)), curTablePage === 1],
                  ["Keyingi", () => setTablePage((p) => Math.min(totalTablePages, p + 1)), curTablePage === totalTablePages]
                ].map(([label, fn, disabled]) => (
                  <button
                    key={label as string}
                    onClick={fn as () => void}
                    disabled={disabled as boolean}
                    className="h-10 px-4 rounded-xl border-2 border-slate-300 bg-white text-slate-700 font-bold text-sm disabled:opacity-40"
                  >
                    {label as string}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── render: POS terminal (restaurant with table, or market) ───────────────

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: "linear-gradient(to bottom right, rgb(15,23,42), rgb(30,41,59))" }}>
      <div className="flex-1 max-w-[2000px] mx-auto p-4 lg:p-5 w-full overflow-hidden">
        <div className={`grid gap-4 h-full ${isRestaurant ? "grid-cols-1 lg:grid-cols-10" : "grid-cols-1 lg:grid-cols-3"}`}>

          {/* ── cart panel ─────────────────────────────────────────────────── */}
          <div
            className={`${isRestaurant ? "lg:col-span-4" : ""} rounded-2xl shadow-2xl p-4 flex flex-col text-white overflow-hidden`}
            style={{ background: "linear-gradient(to bottom right, rgb(30,41,59), rgb(15,23,42))" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black flex items-center gap-2">
                <ShoppingCart className="size-5" />
                Savat ({itemCount})
              </h2>
              {cart.length > 0 && (
                <button onClick={clearCart} className="text-red-400 hover:text-red-300 p-2 hover:bg-red-500/20 rounded-lg">
                  <Trash2 className="size-5" />
                </button>
              )}
            </div>

            {/* cart items */}
            <div className="flex-1 overflow-y-auto mb-4 space-y-2">
              {tableLoading ? (
                <div className="text-center py-12 text-gray-400">
                  <RefreshCw className="size-8 animate-spin mx-auto mb-3 opacity-40" />
                  Buyurtma yuklanmoqda...
                </div>
              ) : !cart.length ? (
                <div className="text-center py-12 text-gray-400">
                  <ShoppingCart className="size-12 mx-auto mb-3 opacity-20" />
                  Mahsulot tanlanmagan
                </div>
              ) : (
                cart.map((item) => {
                  const baseQty = baseQtyByPid[item.product_id] || 0
                  const isNew = baseQty === 0 || item.quantity > baseQty
                  return (
                    <div key={item.product_id} className={`rounded-xl p-3 border ${isNew ? "bg-orange-100 border-orange-300 text-orange-900" : "bg-white border-slate-200 text-slate-900"}`}>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1 font-bold text-sm pr-2 leading-tight">
                          {item.title}
                          {isNew && <span className="ml-2 text-xs font-bold text-orange-600">Yangi</span>}
                        </div>
                        <button onClick={() => removeFromCart(item.product_id)} className="text-red-500 p-1 hover:bg-red-100 rounded">
                          <X className="size-4" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button onClick={() => updateQty(item.product_id, -1)} className={`h-9 w-9 rounded-lg flex items-center justify-center ${isNew ? "bg-orange-200 hover:bg-orange-300 text-orange-900" : "bg-slate-200 hover:bg-slate-300 text-slate-900"}`}>
                            <Minus className="size-4" />
                          </button>
                          <input
                            type="number" min="1" value={item.quantity}
                            onChange={(e) => setQty(item.product_id, parseInt(e.target.value) || 1)}
                            className={`w-12 h-9 text-center font-black text-base border-2 rounded-lg ${isNew ? "border-orange-300 bg-orange-50 text-orange-900" : "border-slate-300 bg-slate-50 text-slate-900"}`}
                          />
                          <button onClick={() => updateQty(item.product_id, 1)} className={`h-9 w-9 rounded-lg flex items-center justify-center ${isNew ? "bg-orange-200 hover:bg-orange-300 text-orange-900" : "bg-slate-200 hover:bg-slate-300 text-slate-900"}`}>
                            <Plus className="size-4" />
                          </button>
                        </div>
                        <span className={`font-black text-base ${isNew ? "text-orange-700" : "text-slate-900"}`}>{fmt(item.price * item.quantity)}</span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* totals */}
            <div className="border-t-2 border-slate-600 pt-3 mb-3 space-y-1">
              <div className="flex justify-between text-sm text-gray-300">
                <span>Mahsulot jami:</span><span>{fmt(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-cyan-300">
                <span>QQS {qqsPercent.toFixed(1)}%:</span><span>{fmt(qqsAmt)}</span>
              </div>
              <div className="flex justify-between text-sm text-orange-300">
                <span>Servis haqi {feePercent.toFixed(1)}%:</span><span>{fmt(feeAmt)}</span>
              </div>
              <div className="flex justify-between text-xl font-black pt-1">
                <span>Jami:</span><span className="text-orange-400">{fmt(total)}</span>
              </div>
            </div>

            {/* payment + order type */}
            <div className="mb-3 space-y-2">
              <div className="flex gap-2">
                {(["cash", "card"] as const).map((m) => (
                  <button key={m} onClick={() => setPaymentMethod(m)}
                    className={`flex-1 py-2 rounded-xl font-bold text-sm ${paymentMethod === m ? "bg-blue-600 text-white" : "bg-slate-600 text-gray-300 hover:bg-slate-500"}`}
                  >
                    {m === "cash" ? "💵 Naqd" : "💳 Karta"}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                {(["dine_in", "takeaway", "delivery"] as const).map((t) => (
                  <button key={t} onClick={() => setOrderType(t)}
                    className={`flex-1 py-2 rounded-xl font-bold text-xs ${orderType === t ? "bg-orange-500 text-white" : "bg-slate-600 text-gray-300 hover:bg-slate-500"}`}
                  >
                    {t === "dine_in" ? "🍽 Zalda" : t === "takeaway" ? "🥡 Olib ketish" : "🛵 Yetkazish"}
                  </button>
                ))}
              </div>
            </div>

            {/* confirm button */}
            <button
              onClick={submitOrder}
              disabled={submitting || !cart.length}
              className="w-full py-4 rounded-2xl text-white font-black disabled:opacity-50 flex items-center justify-center gap-2 text-lg shadow-xl active:scale-[0.98]"
              style={{ background: "linear-gradient(to right, rgb(22,163,74), rgb(34,197,94))" }}
            >
              <Check className="size-5" />
              {submitting ? "Saqlanmoqda..." : activeOrderId ? "Yangilash" : "Buyurtma qilish"}
            </button>
          </div>

          {/* ── products panel ─────────────────────────────────────────────── */}
          <div className={`${isRestaurant ? "lg:col-span-6" : ""} bg-white rounded-2xl shadow-2xl p-4 flex flex-col overflow-hidden`}>

            {/* top bar */}
            <div className="mb-4 flex items-center gap-3 flex-wrap">
              {isRestaurant && selectedTable && (
                <button onClick={() => setSelectedTable(null)}
                  className="h-12 px-4 rounded-xl bg-slate-700 hover:bg-slate-800 text-white font-bold text-sm flex items-center gap-2 shrink-0"
                >
                  <ArrowLeft className="size-4" /> Stollar
                </button>
              )}
              {!isRestaurant && (
                <Link to="/admin" className="h-12 px-4 rounded-xl bg-slate-700 hover:bg-slate-800 text-white font-bold text-sm flex items-center gap-2 shrink-0">
                  <ArrowLeft className="size-4" /> Admin
                </Link>
              )}

              {isRestaurant && selectedTable && (
                <div className="flex-1 min-w-0 bg-slate-50 rounded-xl px-4 py-2 border">
                  <p className="text-sm font-black text-slate-900">
                    Stol: {selectedTable.number}
                    {selectedTable.location && <span className="text-slate-500 font-medium ml-1">({selectedTable.location})</span>}
                  </p>
                  <p className="text-xs text-slate-500">{CURRENT_USER_NAME} · {selectedTableOrder ? fmt(selectedTableOrder.total) : "Yangi buyurtma"}</p>
                </div>
              )}

              {isRestaurant && selectedTable && (
                <button
                  onClick={completeOrder}
                  disabled={completing || !selectedTableOrder || !["pending", "ready"].includes(selectedTableOrder.status)}
                  className="h-12 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 disabled:cursor-not-allowed text-white font-bold text-sm shrink-0"
                >
                  {completing ? "..." : "To'landi ✓"}
                </button>
              )}

              <Link to="/admin/orders" className="h-12 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm inline-flex items-center gap-2 shrink-0">
                <Receipt className="size-4" /> Tarix
              </Link>
            </div>

            {/* search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
              <input
                ref={searchRef} type="text" placeholder="Mahsulot qidirish..."
                value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-10 h-12 text-base text-black border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded">
                  <X className="size-4 text-gray-500" />
                </button>
              )}
            </div>

            {/* categories */}
            <div className="mb-3 flex items-center gap-2 overflow-x-auto pb-1">
              {categories.filter((c) => c.is_active).map((cat) => (
                <button
                  key={cat.id} onClick={() => setSelectedCat(cat.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${selectedCat === cat.id ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* product grid */}
            <div className="flex-1 overflow-y-auto">
              {selectedCat === null ? (
                <div className="text-center py-12 text-gray-400">Avval kategoriya tanlang</div>
              ) : !filteredProducts.length ? (
                <div className="text-center py-12 text-gray-400">Mahsulot topilmadi</div>
              ) : (
                <div className="grid gap-2 pb-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))" }}>
                  {filteredProducts.map((p) => (
                    <button
                      key={p.id} onClick={() => addToCart(p)}
                      className="w-full p-3 border-2 border-gray-200 rounded-xl hover:border-orange-400 hover:bg-orange-50 transition-all text-left active:scale-[0.99] min-h-[90px]"
                    >
                      <div className="font-bold text-sm text-gray-900 line-clamp-2 leading-tight">{p.title}</div>
                      <div className="text-xs text-gray-500 mt-1">{fmt(p.price)}</div>
                      {(cart.find((i) => i.product_id === p.id)?.quantity || 0) > 0 && (
                        <div className="mt-1 inline-flex items-center justify-center w-5 h-5 bg-orange-500 text-white text-xs font-black rounded-full">
                          {cart.find((i) => i.product_id === p.id)!.quantity}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* success toast */}
      {orderSuccess && (
        <div className="fixed top-6 right-6 bg-green-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 z-50 animate-bounce">
          <Check className="size-6" />
          <span className="font-black text-lg">
            {activeOrderId ? "Buyurtma yangilandi!" : "Buyurtma yaratildi!"}
          </span>
        </div>
      )}
    </div>
  )
}
