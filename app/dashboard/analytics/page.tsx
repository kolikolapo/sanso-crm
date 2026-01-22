'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { ArrowLeft, TrendingUp, DollarSign, Activity, PieChart as PieIcon, BarChart3, Crown, AlertTriangle, CheckCircle2, Zap } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

// ტიპები
interface ServiceLog {
  id: string
  customer_id: string // გვჭირდება კლიენტის მოდელის გასაგებად
  service_date: string
  technician_name: string
  price: number
}

interface Customer {
  id: string
  name: string
  model: string
}

interface Applicator {
  id: string
  status: 'active' | 'damaged'
}

// ფერები
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#282828', '#ff0000']

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'month' | '30days'>('all')
  
  // Data States
  const [services, setServices] = useState<ServiceLog[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [applicators, setApplicators] = useState<Applicator[]>([])
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      // 1. სერვისები
      const { data: serviceData } = await supabase.from('service_logs').select('*')
      if (serviceData) setServices(serviceData as any)

      // 2. კლიენტები (მოდელებისთვის და სახელებისთვის)
      const { data: customerData } = await supabase.from('customers').select('id, name, model')
      if (customerData) setCustomers(customerData)

      // 3. აპლიკატორები (სტატუსებისთვის)
      const { data: appData } = await supabase.from('applicators').select('id, status')
      if (appData) setApplicators(appData as any)

      setLoading(false)
    }
    fetchData()
  }, [])

  // --- LOGIC & CALCULATIONS ---

  // 1. ფილტრაცია თარიღის მიხედვით
  const filteredServices = services.filter(service => {
    const date = new Date(service.service_date)
    const now = new Date()
    
    if (filter === 'month') {
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
    }
    if (filter === '30days') {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(now.getDate() - 30)
      return date >= thirtyDaysAgo
    }
    return true
  })

  // 2. ძირითადი ციფრები
  const totalRevenue = filteredServices.reduce((acc, curr) => acc + curr.price, 0)
  const avgTicket = filteredServices.length > 0 ? Math.round(totalRevenue / filteredServices.length) : 0

  // 3. შემოსავალი მოდელების მიხედვით (Revenue by Model)
  const revenueByModel = filteredServices.reduce((acc: any, curr) => {
    // ვპოულობთ კლიენტს, რომ გავიგოთ რა აპარატი აქვს
    const customer = customers.find(c => c.id === curr.customer_id)
    const model = customer ? customer.model : 'Unknown'
    
    if (!acc[model]) acc[model] = { name: model, value: 0 }
    acc[model].value += curr.price
    return acc
  }, {})
  const modelChartData = Object.values(revenueByModel).sort((a: any, b: any) => b.value - a.value) // სორტირება კლებადობით

  // 4. TOP 5 კლიენტი
  const revenueByCustomer = filteredServices.reduce((acc: any, curr) => {
    const customer = customers.find(c => c.id === curr.customer_id)
    const name = customer ? customer.name : 'Unknown'

    if (!acc[curr.customer_id]) acc[curr.customer_id] = { name: name, value: 0, visits: 0 }
    acc[curr.customer_id].value += curr.price
    acc[curr.customer_id].visits += 1
    return acc
  }, {})
  const topCustomers = Object.values(revenueByCustomer)
    .sort((a: any, b: any) => b.value - a.value)
    .slice(0, 5) // ვიღებთ მხოლოდ პირველ 5-ს

  // 5. ტექნიკოსების სტატისტიკა
  const techData = filteredServices.reduce((acc: any, curr) => {
    const name = curr.technician_name
    if (!acc[name]) acc[name] = { name: name, value: 0 }
    acc[name].value += curr.price
    return acc
  }, {})
  const pieChartData = Object.values(techData)

  // 6. აპლიკატორების ჯანმრთელობა
  const activeApps = applicators.filter(a => a.status === 'active').length
  const damagedApps = applicators.filter(a => a.status === 'damaged').length


  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#282828]"></div></div>

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      {/* Navbar */}
      <nav className="bg-[#282828] text-white px-8 py-4 sticky top-0 z-20 shadow-xl">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
             <div className="flex items-center gap-4">
                <button onClick={() => router.back()} className="hover:bg-white/10 p-2 rounded-lg transition">
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-lg font-bold">ფინანსური ანალიტიკა</h1>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest">Reports & Statistics</p>
                </div>
            </div>
            
            <div className="flex bg-white/10 p-1 rounded-lg">
                <button onClick={() => setFilter('all')} className={`px-3 py-1 text-xs font-medium rounded-md transition ${filter === 'all' ? 'bg-white text-[#282828]' : 'text-gray-300 hover:text-white'}`}>სრული</button>
                <button onClick={() => setFilter('month')} className={`px-3 py-1 text-xs font-medium rounded-md transition ${filter === 'month' ? 'bg-white text-[#282828]' : 'text-gray-300 hover:text-white'}`}>ამ თვეში</button>
                <button onClick={() => setFilter('30days')} className={`px-3 py-1 text-xs font-medium rounded-md transition ${filter === '30days' ? 'bg-white text-[#282828]' : 'text-gray-300 hover:text-white'}`}>30 დღე</button>
            </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-8 space-y-8">
        
        {/* TOP KPI CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                <div>
                    <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">შემოსავალი</span>
                    <h3 className="text-3xl font-bold text-gray-900 mt-2">{totalRevenue.toLocaleString()} ₾</h3>
                </div>
                <div className="p-3 bg-green-50 text-green-600 rounded-xl w-fit mt-4"> <DollarSign size={20} /> </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                <div>
                    <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">ვიზიტები</span>
                    <h3 className="text-3xl font-bold text-gray-900 mt-2">{filteredServices.length}</h3>
                </div>
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl w-fit mt-4"> <Activity size={20} /> </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                <div>
                    <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">საშუალო ჩეკი</span>
                    <h3 className="text-3xl font-bold text-gray-900 mt-2">{avgTicket} ₾</h3>
                </div>
                <div className="p-3 bg-purple-50 text-purple-600 rounded-xl w-fit mt-4"> <BarChart3 size={20} /> </div>
            </div>

            {/* APPLICATOR HEALTH CARD */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                 <div>
                    <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">თავაკების ფონდი</span>
                    <div className="flex gap-4 mt-3">
                         <div>
                            <p className="text-2xl font-bold text-green-600 flex items-center gap-1"><CheckCircle2 size={16}/> {activeApps}</p>
                            <p className="text-[10px] text-gray-400">აქტიური</p>
                         </div>
                         <div className="w-[1px] bg-gray-200"></div>
                         <div>
                            <p className="text-2xl font-bold text-red-500 flex items-center gap-1"><AlertTriangle size={16}/> {damagedApps}</p>
                            <p className="text-[10px] text-gray-400">დაზიანებული</p>
                         </div>
                    </div>
                </div>
            </div>
        </div>

        {/* CHARTS ROW 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* REVENUE BY MODEL (Horizontal Bar) */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <Zap size={18} className="text-yellow-500"/> შემოსავალი აპარატის მოდელებით
                </h3>
                <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart layout="vertical" data={modelChartData as any} margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0"/>
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={100} fontSize={11} tickLine={false} axisLine={false} />
                            <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                            <Bar dataKey="value" fill="#282828" radius={[0, 6, 6, 0]} barSize={20}>
                                {modelChartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* TECHNICIAN PIE CHART */}
            <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <PieIcon size={18} className="text-blue-500"/> ტექნიკოსების წვლილი
                </h3>
                <div className="h-64 w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={pieChartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {pieChartData.map((entry: any, index: number) => (
                                    <Cell key={`cell-${index}`} fill={entry.name === 'ნიკო' ? '#3b82f6' : entry.name === 'ვახო' ? '#f97316' : '#a855f7'} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend verticalAlign="bottom" height={36}/>
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="mt-4 text-center">
                    <p className="text-xs text-gray-400">ჯამური განაწილება თანხაში</p>
                </div>
            </div>
        </div>

        {/* ROW 2: TOP CUSTOMERS */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
             <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Crown size={18} className="text-yellow-500"/> TOP 5 დამკვეთი (VIP)
            </h3>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wider">
                            <th className="py-3 font-semibold">კომპანია</th>
                            <th className="py-3 font-semibold text-right">ვიზიტები</th>
                            <th className="py-3 font-semibold text-right">გადახდილი თანხა</th>
                            <th className="py-3 font-semibold text-right">წილი</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {topCustomers.map((customer: any, index) => (
                            <tr key={index} className="hover:bg-gray-50 transition">
                                <td className="py-4 flex items-center gap-3">
                                    <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${index === 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                                        {index + 1}
                                    </span>
                                    <span className="font-bold text-gray-800">{customer.name}</span>
                                </td>
                                <td className="py-4 text-right text-sm text-gray-600">{customer.visits}</td>
                                <td className="py-4 text-right font-mono font-bold text-[#282828]">{customer.value.toLocaleString()} ₾</td>
                                <td className="py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <span className="text-xs text-gray-400">{Math.round((customer.value / totalRevenue) * 100)}%</span>
                                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(customer.value / totalRevenue) * 100}%` }}></div>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

      </main>
    </div>
  )
}