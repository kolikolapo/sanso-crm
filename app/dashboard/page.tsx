'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Plus, Search, Trash2, Edit2, Users, Zap, Box, X, ScanBarcode, FileText, User, PieChart } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

// --- Types ---
interface Customer {
  id: string
  sanso_id: string
  name: string
  tax_id: string
  model: string
  serial_number: string
  address: string
  phone: string
  contact_person: string
  applicators?: { serial_number: string }[] 
}

const DEVICE_MODELS = [
  "Soprano ICE",
  "Soprano ICE Platinum",
  "Soprano Titanium",
  "Soprano Titanium SE",
  "Accent Prime",
  "Prime X",
  "Harmony XL PRO",
  "Alma Harmony"
]

// 🔥 ადმინების სია (შეცვალე ეს მეილები რეალურით!)
const ADMIN_EMAILS = [
    'n.gogolashvili@sanso.ge', 
    'g.maruashvili@sanso.ge',
    'a.sukhitashvili@sanso.ge'
]

export default function Dashboard() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState('') // მომხმარებლის მეილი
  
  const [searchTerm, setSearchTerm] = useState('')
  const [serialSearch, setSerialSearch] = useState('')
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    sanso_id: '', name: '', tax_id: '', model: DEVICE_MODELS[0], 
    serial_number: '', address: '', phone: '', contact_person: ''
  })

  const router = useRouter()
  const supabase = createClient()

  const fetchCustomers = async () => {
    const { data } = await supabase
      .from('customers')
      .select('*, applicators(serial_number)') 
      .order('created_at', { ascending: false })

    if (data) setCustomers(data)
    setLoading(false)
  }

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return }
      
      // 🔥 ვინახავთ შემოსული მომხმარებლის მეილს
      if (session.user.email) setUserEmail(session.user.email)
      
      fetchCustomers()
    }
    checkUser()
  }, [router, supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  // --- HANDLERS ---
  const openAddModal = () => {
    setFormData({ sanso_id: '', name: '', tax_id: '', model: DEVICE_MODELS[0], serial_number: '', address: '', phone: '', contact_person: '' })
    setIsEditing(false)
    setEditId(null)
    setIsModalOpen(true)
  }

  const openEditModal = (e: React.MouseEvent, customer: Customer) => {
    e.stopPropagation()
    setFormData({
      sanso_id: customer.sanso_id,
      name: customer.name,
      tax_id: customer.tax_id,
      model: customer.model,
      serial_number: customer.serial_number,
      address: customer.address,
      phone: customer.phone,
      contact_person: customer.contact_person
    })
    setIsEditing(true)
    setEditId(customer.id)
    setIsModalOpen(true)
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!confirm("ნამდვილად გსურთ მომხმარებლის წაშლა?")) return
    const { error } = await supabase.from('customers').delete().eq('id', id)
    if (error) alert('შეცდომა: ' + error.message)
    else fetchCustomers()
  }

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    if (isEditing && editId) {
      const { error } = await supabase.from('customers').update(formData).eq('id', editId)
      if (error) alert('შეცდომა: ' + error.message)
      else { setIsModalOpen(false); fetchCustomers() }
    } else {
      const { error } = await supabase.from('customers').insert([formData])
      if (error) alert('შეცდომა: ' + error.message)
      else { setIsModalOpen(false); fetchCustomers() }
    }
    setSubmitting(false)
  }

  const handleRowClick = (id: string) => router.push(`/dashboard/${id}`)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, [e.target.name]: e.target.value })
  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, [e.target.name]: e.target.value })

  // --- FILTER LOGIC ---
  const filteredCustomers = customers.filter(customer => {
    const matchesGeneral = 
      customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.sanso_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.tax_id?.toLowerCase().includes(searchTerm.toLowerCase())

    const searchSerialLower = serialSearch.toLowerCase()
    
    const matchesMachineSerial = customer.serial_number?.toLowerCase().includes(searchSerialLower)
    const matchesApplicatorSerial = customer.applicators?.some(app => 
        app.serial_number.toLowerCase().includes(searchSerialLower)
    )

    const matchesSerial = matchesMachineSerial || matchesApplicatorSerial

    return matchesGeneral && matchesSerial
  })

  const totalCustomers = customers.length
  const getCountByModel = (modelName: string) => customers.filter(c => c.model === modelName).length

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#282828]"></div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      {/* Navbar with BIG LOGO */}
      <nav className="text-white px-8 py-4 sticky top-0 z-20 shadow-xl" style={{ backgroundColor: '#282828' }}>
        <div className="max-w-7xl mx-auto flex justify-between items-center h-16"> 
            <div className="flex items-center gap-6 h-full">
                <img src="/logo.png" alt="Logo" className="h-full w-auto object-contain max-h-14"/>
                <div className="h-8 w-[1px] bg-gray-600 hidden sm:block"></div> 
                <div className="hidden sm:block">
                    <h1 className="text-lg font-bold tracking-tight leading-none">SANSO <span className="text-gray-400 font-light">Technical</span></h1>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest leading-none mt-1">Department Dashboard</p>
                </div>
            </div>
            
            <div className="flex items-center gap-4">
                {/* 🔥 ANALYTICS BUTTON - მხოლოდ ადმინებისთვის */}
                {ADMIN_EMAILS.includes(userEmail) && (
                    <button 
                        onClick={() => router.push('/dashboard/analytics')}
                        className="hidden sm:flex items-center gap-2 text-white bg-white/10 hover:bg-white/20 transition text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-lg border border-white/10"
                    >
                        <PieChart size={16} /> Analytics
                    </button>
                )}

                <button onClick={handleLogout} className="flex items-center gap-2 text-gray-300 hover:text-white transition text-sm font-medium px-4 py-2 rounded-lg hover:bg-white/10 border border-transparent hover:border-white/10">
                    <LogOut size={18} />
                    <span className="hidden sm:inline">გასვლა</span>
                </button>
            </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-8 space-y-10">
        
        {/* STATS SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1 bg-[#282828] text-white p-8 rounded-3xl shadow-lg relative overflow-hidden flex flex-col justify-between h-full min-h-[200px]">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                <div>
                    <p className="text-gray-400 font-medium mb-1">სულ კლიენტი ბაზაში</p>
                    <h2 className="text-5xl font-bold">{totalCustomers}</h2>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400 mt-8">
                    <Users size={16} />
                    <span>აქტიური მომხმარებელი</span>
                </div>
            </div>

            <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4">
                {DEVICE_MODELS.map((model) => {
                    const count = getCountByModel(model)
                    return (
                        <div key={model} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition flex flex-col justify-between">
                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 truncate" title={model}>
                                {model}
                            </p>
                            <div className="flex items-end justify-between">
                                <span className="text-2xl font-bold text-[#282828]">{count}</span>
                                <div className={`h-1.5 w-1.5 rounded-full ${count > 0 ? 'bg-green-500' : 'bg-gray-200'}`}></div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>

        {/* CONTROLS */}
        <div className="flex flex-col lg:flex-row justify-between items-center gap-4 border-t border-gray-200 pt-8">
          
          <div className="flex flex-col md:flex-row gap-4 w-full lg:w-auto flex-grow">
            {/* Main Search */}
            <div className="relative w-full md:w-80 group">
                <Search className="absolute left-4 top-3.5 text-gray-400 group-focus-within:text-[#282828] transition" size={20} />
                <input
                type="text"
                placeholder="სახელი, ID, ს/კ, ტელ..."
                className="w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#282828]/20 focus:border-[#282828] bg-white transition-all shadow-sm text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Serial Number Search (Smart Search) */}
            <div className="relative w-full md:w-64 group">
                <ScanBarcode className="absolute left-4 top-3.5 text-gray-400 group-focus-within:text-blue-600 transition" size={20} />
                <input
                type="text"
                placeholder="სერიული (აპარატი ან თავაკი)..."
                className="w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white transition-all shadow-sm text-sm font-mono"
                value={serialSearch}
                onChange={(e) => setSerialSearch(e.target.value)}
                />
            </div>
          </div>
          
          <button 
            onClick={openAddModal}
            className="w-full lg:w-auto flex items-center justify-center gap-2 text-white px-8 py-3.5 rounded-xl hover:bg-black transition shadow-xl shadow-gray-200 font-bold text-sm tracking-wide"
            style={{ backgroundColor: '#282828' }}
          >
            <Plus size={18} />
            მომხმარებლის დამატება
          </button>
        </div>

        {/* TABLE */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="p-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest">ID</th>
                  <th className="p-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest">კომპანია</th>
                  <th className="p-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest hidden lg:table-cell">ს/კ</th>
                  <th className="p-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest hidden md:table-cell">მოდელი</th>
                  <th className="p-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest hidden md:table-cell">სერიული</th>
                  <th className="p-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest hidden lg:table-cell">საკონტაქტო</th>
                  <th className="p-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest hidden sm:table-cell">ტელეფონი</th>
                  <th className="p-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-right">მართვა</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-16 text-center text-gray-400">
                        <div className="flex flex-col items-center gap-3">
                            <Box size={40} className="text-gray-200"/>
                            <p>მონაცემები არ მოიძებნა</p>
                        </div>
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer) => (
                    <tr 
                        key={customer.id} 
                        onClick={() => handleRowClick(customer.id)}
                        className="hover:bg-blue-50/50 cursor-pointer transition duration-150 group"
                    >
                      <td className="p-5">
                          <span className="font-mono text-xs font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded border border-gray-200 group-hover:border-blue-200 group-hover:bg-blue-100 group-hover:text-blue-700 transition">
                              {customer.sanso_id}
                          </span>
                      </td>
                      <td className="p-5">
                          <div className="font-bold text-gray-900 text-sm">{customer.name}</div>
                          <div className="text-xs text-gray-400 md:hidden mt-1 whitespace-nowrap">{customer.model}</div>
                      </td>
                      <td className="p-5 hidden lg:table-cell">
                          <div className="flex items-center gap-2 text-xs font-mono text-gray-600">
                              <FileText size={12} className="text-gray-400"/> {customer.tax_id}
                          </div>
                      </td>
                      <td className="p-5 hidden md:table-cell whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#282828] text-white shadow-sm border border-gray-700 whitespace-nowrap">
                          {customer.model}
                        </span>
                      </td>
                      <td className="p-5 font-mono text-xs text-gray-500 hidden md:table-cell">{customer.serial_number}</td>
                      <td className="p-5 hidden lg:table-cell">
                          <div className="flex items-center gap-2 text-xs text-gray-700 font-medium">
                              <User size={12} className="text-gray-400"/> {customer.contact_person}
                          </div>
                      </td>
                      <td className="p-5 text-xs text-gray-600 hidden sm:table-cell font-medium">{customer.phone}</td>
                      <td className="p-5 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={(e) => openEditModal(e, customer)}
                            className="p-2 bg-white border border-gray-200 text-gray-500 rounded-lg hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition shadow-sm z-10" 
                            title="რედაქტირება"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={(e) => handleDelete(e, customer.id)}
                            className="p-2 bg-white border border-gray-200 text-gray-500 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition shadow-sm z-10" 
                            title="წაშლა"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#282828]/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-gray-50 px-8 py-5 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-[#282828]">
                  {isEditing ? 'მონაცემების რედაქტირება' : 'ახალი მომხმარებელი'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500 transition">
                <X size={24} /> 
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-1 space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">შიდა ID</label>
                <input required name="sanso_id" value={formData.sanso_id} onChange={handleInputChange} className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-[#282828] outline-none transition bg-gray-50 focus:bg-white" placeholder="SAN-001" />
              </div>
              <div className="col-span-1 space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">კომპანიის სახელი</label>
                <input required name="name" value={formData.name} onChange={handleInputChange} className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-[#282828] outline-none transition bg-gray-50 focus:bg-white" placeholder="შპს სანნო" />
              </div>
              <div className="col-span-1 space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">საიდენტიფიკაციო კოდი</label>
                <input required name="tax_id" value={formData.tax_id} onChange={handleInputChange} className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-[#282828] outline-none transition bg-gray-50 focus:bg-white" />
              </div>
              
              <div className="col-span-1 space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">აპარატის მოდელი</label>
                <div className="relative">
                    <select 
                        required 
                        name="model" 
                        value={formData.model} 
                        onChange={handleSelectChange} 
                        className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-[#282828] outline-none transition bg-gray-50 focus:bg-white appearance-none cursor-pointer"
                    >
                        {DEVICE_MODELS.map(model => (
                            <option key={model} value={model}>{model}</option>
                        ))}
                    </select>
                    <div className="absolute right-3 top-3.5 pointer-events-none text-gray-400">
                        <Zap size={16} fill="currentColor" />
                    </div>
                </div>
              </div>

              <div className="col-span-1 space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">სერიული ნომერი</label>
                <input required name="serial_number" value={formData.serial_number} onChange={handleInputChange} className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-[#282828] outline-none transition bg-gray-50 focus:bg-white" />
              </div>
              <div className="col-span-1 space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">ტელეფონი</label>
                <input required name="phone" value={formData.phone} onChange={handleInputChange} className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-[#282828] outline-none transition bg-gray-50 focus:bg-white" />
              </div>
              <div className="col-span-2 space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">მისამართი</label>
                <input required name="address" value={formData.address} onChange={handleInputChange} className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-[#282828] outline-none transition bg-gray-50 focus:bg-white" />
              </div>
              <div className="col-span-2 space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">საკონტაქტო პირი</label>
                <input required name="contact_person" value={formData.contact_person} onChange={handleInputChange} className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-[#282828] outline-none transition bg-gray-50 focus:bg-white" />
              </div>

              <div className="col-span-2 flex justify-end gap-3 mt-4 pt-6 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 font-bold text-sm transition">
                  გაუქმება
                </button>
                <button type="submit" disabled={submitting} className="px-6 py-3 text-white rounded-xl hover:bg-black font-bold text-sm transition flex items-center gap-2 shadow-lg" style={{ backgroundColor: '#282828' }}>
                  {submitting ? 'იტვირთება...' : (isEditing ? 'განახლება' : 'დამატება')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}