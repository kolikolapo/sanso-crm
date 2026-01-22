'use client'
import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Trash2, X, Building2, User, FileText, Image as ImageIcon, Calendar, Wrench, ChevronLeft, ChevronRight, Edit2, Maximize2 } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import imageCompression from 'browser-image-compression'

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
}

interface Applicator {
  id: string
  name: string
  serial_number: string
  status: 'active' | 'damaged'
  installed_date: string
}

interface ServiceLog {
  id: string
  service_date: string
  technician_name: string
  description: string
  price: number
  pdf_url: string | null
  image_urls: string[] | null
  created_at: string
}

const formatDate = (dateString: string) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}.${month}.${year}`
}

// ფერის განსაზღვრის ფუნქცია (გატანილია გარეთ, რომ ხელი არ შეგვიშალოს)
const getTechnicianStyle = (name: string) => {
  if (name === 'ნიკო') return 'bg-blue-50 text-blue-700 border-blue-100'
  if (name === 'ვახო') return 'bg-orange-50 text-orange-700 border-orange-100'
  return 'bg-purple-50 text-purple-700 border-purple-100'
}

export default function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const customerId = resolvedParams.id
  const router = useRouter()
  const supabase = createClient()

  // --- State ---
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [applicators, setApplicators] = useState<Applicator[]>([])
  const [services, setServices] = useState<ServiceLog[]>([])
  const [loading, setLoading] = useState(true)

  const [isAppModalOpen, setIsAppModalOpen] = useState(false)
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false)
  const [isEditingService, setIsEditingService] = useState(false)
  const [currentServiceId, setCurrentServiceId] = useState<string | null>(null)

  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const [currentLightboxImages, setCurrentLightboxImages] = useState<string[]>([])
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  const [submitting, setSubmitting] = useState(false)
  const [appForm, setAppForm] = useState({ 
    name: '', serial_number: '', status: 'active', installed_date: new Date().toISOString().split('T')[0]
  })
  
  const [serviceForm, setServiceForm] = useState({
    service_date: new Date().toISOString().split('T')[0],
    technician_name: 'ნიკო', 
    description: '',
    price: '',
  })
  
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [imageFiles, setImageFiles] = useState<File[]>([])

  // --- Fetch Data ---
  const fetchData = async () => {
    const { data: customerData } = await supabase.from('customers').select('*').eq('id', customerId).single()
    if (customerData) setCustomer(customerData)

    const { data: appData } = await supabase.from('applicators').select('*').eq('customer_id', customerId).order('installed_date', { ascending: false })
    if (appData) setApplicators(appData as any)

    const { data: serviceData } = await supabase.from('service_logs').select('*').eq('customer_id', customerId).order('service_date', { ascending: false })
    if (serviceData) setServices(serviceData as any)

    setLoading(false)
  }

  useEffect(() => { fetchData() }, [customerId])

  // --- Helpers ---
  const uploadFile = async (file: File, path: string) => {
    const { data, error } = await supabase.storage.from('service-files').upload(path, file)
    if (error) throw error
    const { data: { publicUrl } } = supabase.storage.from('service-files').getPublicUrl(path)
    return publicUrl
  }

  // --- Lightbox Handlers ---
  const openLightbox = (images: string[], index: number) => {
    setCurrentLightboxImages(images)
    setCurrentImageIndex(index)
    setIsLightboxOpen(true)
  }

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % currentLightboxImages.length)
  }

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + currentLightboxImages.length) % currentLightboxImages.length)
  }

  // --- Service Handlers ---
  const openEditServiceModal = (service: ServiceLog) => {
    setServiceForm({
      service_date: service.service_date,
      technician_name: service.technician_name,
      description: service.description,
      price: service.price.toString()
    })
    setCurrentServiceId(service.id)
    setIsEditingService(true)
    setIsServiceModalOpen(true)
    setPdfFile(null)
    setImageFiles([])
  }

  const openCreateServiceModal = () => {
    setServiceForm({
      service_date: new Date().toISOString().split('T')[0],
      technician_name: 'ნიკო',
      description: '',
      price: ''
    })
    setCurrentServiceId(null)
    setIsEditingService(false)
    setIsServiceModalOpen(true)
    setPdfFile(null)
    setImageFiles([])
  }

  const handleServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      let pdfUrl = null
      let newImageUrls: string[] = []

      if (pdfFile) {
        const fileExt = pdfFile.name.split('.').pop()
        const cleanFileName = `${Date.now()}_doc.${fileExt}`
        const path = `${customerId}/${cleanFileName}`
        pdfUrl = await uploadFile(pdfFile, path)
      }

      if (imageFiles.length > 0) {
        for (let i = 0; i < imageFiles.length; i++) {
          const img = imageFiles[i]
          const compressedFile = await imageCompression(img, { maxSizeMB: 1, maxWidthOrHeight: 1920 })
          
          const fileExt = img.name.split('.').pop()
          const cleanFileName = `${Date.now()}_img_${i}.${fileExt}`
          const path = `${customerId}/${cleanFileName}`
          
          const url = await uploadFile(compressedFile, path)
          newImageUrls.push(url)
        }
      }

      if (isEditingService && currentServiceId) {
        const existingService = services.find(s => s.id === currentServiceId)
        const finalImageUrls = [...(existingService?.image_urls || []), ...newImageUrls]
        const finalPdfUrl = pdfUrl || existingService?.pdf_url

        const { error } = await supabase.from('service_logs').update({
            service_date: serviceForm.service_date,
            technician_name: serviceForm.technician_name,
            description: serviceForm.description,
            price: Number(serviceForm.price),
            pdf_url: finalPdfUrl,
            image_urls: finalImageUrls
        }).eq('id', currentServiceId)

        if (error) throw error
      } else {
        const { error } = await supabase.from('service_logs').insert([{
            customer_id: customerId,
            service_date: serviceForm.service_date,
            technician_name: serviceForm.technician_name,
            description: serviceForm.description,
            price: Number(serviceForm.price),
            pdf_url: pdfUrl,
            image_urls: newImageUrls
        }])
        if (error) throw error
      }

      setIsServiceModalOpen(false)
      fetchData()

    } catch (error: any) {
      alert('შეცდომა: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const deleteService = async (serviceId: string) => {
    if(!confirm('წავშალოთ ჩანაწერი?')) return;
    await supabase.from('service_logs').delete().eq('id', serviceId)
    fetchData()
  }

  // --- Applicator Handlers ---
  const handleAddApplicator = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    const { error } = await supabase.from('applicators').insert([{ customer_id: customerId, ...appForm }])
    if (!error) {
      setIsAppModalOpen(false)
      setAppForm({ name: '', serial_number: '', status: 'active', installed_date: new Date().toISOString().split('T')[0] })
      fetchData()
    } else { alert(error.message) }
    setSubmitting(false)
  }

  const toggleAppStatus = async (appId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'damaged' : 'active'
    await supabase.from('applicators').update({ status: newStatus }).eq('id', appId)
    fetchData()
  }

  const deleteApplicator = async (appId: string) => {
    if(!confirm('წავშალოთ თავაკი?')) return;
    await supabase.from('applicators').delete().eq('id', appId)
    fetchData()
  }

  if (loading) return <div className="p-10 text-center">იტვირთება...</div>
  if (!customer) return <div className="p-10 text-center">მომხმარებელი ვერ მოიძებნა</div>

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans">
      {/* Navbar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
            <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition text-sm font-medium">
                <ArrowLeft size={18} /> უკან
            </button>
            <span className="text-xs text-gray-400 font-mono">SANSO CRM</span>
        </div>
      </div>

      <main className="max-w-7xl mx-auto p-6 space-y-8">
        
        {/* --- Customer Info --- */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-0 overflow-hidden">
             <div className="px-8 py-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        {customer.name}
                    </h1>
                    <div className="flex items-center gap-2 mt-2">
                        <span className="bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-md text-xs font-bold tracking-wide uppercase">
                            {customer.model}
                        </span>
                        <span className="text-gray-400 text-sm">|</span>
                        <span className="text-gray-500 text-sm font-mono">SN: {customer.serial_number}</span>
                    </div>
                </div>
                <div className="hidden md:block text-right">
                    <p className="text-xs text-gray-400 font-bold uppercase">შიდა ID</p>
                    <p className="text-lg font-mono font-bold text-gray-700">{customer.sanso_id}</p>
                </div>
            </div>
            
            <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-10">
                <div className="space-y-4">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2"><Building2 size={14} /> კომპანია</h3>
                    <div className="space-y-1">
                        <p className="text-xs text-gray-500">საიდენტიფიკაციო: <span className="text-gray-900 font-medium">{customer.tax_id}</span></p>
                        <p className="text-xs text-gray-500">მისამართი: <span className="text-gray-900 font-medium">{customer.address}</span></p>
                    </div>
                </div>
                <div className="space-y-4">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2"><User size={14} /> კონტაქტი</h3>
                    <div className="space-y-1">
                        <p className="text-xs text-gray-500">პირი: <span className="text-gray-900 font-medium">{customer.contact_person}</span></p>
                        <p className="text-xs text-gray-500">ტელ: <a href={`tel:${customer.phone}`} className="text-blue-600 font-medium">{customer.phone}</a></p>
                    </div>
                </div>
                <div className="space-y-4 flex items-end justify-end">
                    <div className="bg-green-50 px-4 py-2 rounded-lg border border-green-100 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-xs font-bold text-green-700">აქტიური</span>
                    </div>
                </div>
            </div>
        </section>

        {/* --- Applicators --- */}
        <section>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              აპლიკატორები <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full">{applicators.length}</span>
            </h2>
            <button onClick={() => setIsAppModalOpen(true)} className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition shadow-sm">
              <Plus size={16} /> დამატება
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {applicators.map((app) => (
              <div key={app.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex flex-col justify-between h-full">
                <div>
                    <div className="flex justify-between items-start mb-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase font-bold tracking-wide ${app.status === 'active' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
                            {app.status === 'active' ? 'აქტიური' : 'დაზიანებული'}
                        </span>
                         <button onClick={() => deleteApplicator(app.id)} className="text-gray-300 hover:text-rose-500"><Trash2 size={14} /></button>
                    </div>
                    <h3 className="font-bold text-gray-800 mb-1">{app.name}</h3>
                    <p className="text-xs text-gray-500 font-mono">SN: {app.serial_number}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between">
                    <span className="text-xs text-gray-400">{formatDate(app.installed_date)}</span>
                    <button onClick={() => toggleAppStatus(app.id, app.status)} className="text-xs font-medium text-blue-600 hover:underline">სტატუსი</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* --- SERVICE LOGS --- */}
        <section>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              სერვისის ისტორია <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full">{services.length}</span>
            </h2>
            <button 
              onClick={openCreateServiceModal}
              className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-black transition shadow-lg shadow-gray-200"
            >
              <Wrench size={16} /> სერვისის დამატება
            </button>
          </div>

          <div className="space-y-6">
            {services.length === 0 ? (
                <div className="bg-white p-10 rounded-2xl border-2 border-dashed border-gray-200 text-center text-gray-400">
                    ისტორია ცარიელია. დაამატეთ პირველი ჩანაწერი.
                </div>
            ) : (
                services.map((service) => (
                    <div key={service.id} className="group bg-white border border-gray-200 rounded-2xl p-0 shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-200 overflow-hidden">
                        
                        {/* CARD HEADER (Top Bar) */}
                        <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                             {/* Date & Technician */}
                             <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2 text-gray-900">
                                    <Calendar size={20} className="text-blue-600"/>
                                    <span className="text-lg font-bold tracking-tight">{formatDate(service.service_date)}</span>
                                </div>
                                
                                {/* UPDATED TECHNICIAN BADGE */}
                                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${getTechnicianStyle(service.technician_name)}`}>
                                    <User size={14} />
                                    {service.technician_name}
                                </div>
                             </div>
                             
                             {/* Price & Actions */}
                             <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                                <span className="font-mono text-xl font-bold text-gray-900 bg-white px-3 py-1 rounded border border-gray-100 shadow-sm">{service.price} ₾</span>
                                
                                <div className="flex gap-1">
                                    <button 
                                        onClick={() => openEditServiceModal(service)}
                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                        title="რედაქტირება"
                                    >
                                        <Edit2 size={18} />
                                    </button>
                                    <button 
                                        onClick={() => deleteService(service.id)} 
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                        title="წაშლა"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                             </div>
                        </div>

                        {/* CARD BODY (Description) */}
                        <div className="p-6">
                            <h3 className="text-gray-900 text-lg font-medium leading-relaxed whitespace-pre-wrap">{service.description}</h3>
                        </div>

                        {/* CARD FOOTER (Files) */}
                        {(service.pdf_url || (service.image_urls && service.image_urls.length > 0)) && (
                            <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex flex-wrap items-center gap-3">
                                {service.image_urls && service.image_urls.map((url, index) => (
                                    <button 
                                        key={index} 
                                        onClick={() => openLightbox(service.image_urls!, index)}
                                        className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 group/img focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                                    >
                                        <img src={url} alt="Service" className="w-full h-full object-cover transition duration-300 group-hover/img:scale-110" />
                                        <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/10 transition flex items-center justify-center">
                                            <Maximize2 size={16} className="text-white opacity-0 group-hover/img:opacity-100 drop-shadow-md"/>
                                        </div>
                                    </button>
                                ))}

                                {service.pdf_url && (
                                    <a href={service.pdf_url} target="_blank" rel="noopener noreferrer" 
                                       className="flex flex-col items-center justify-center w-20 h-20 bg-white text-gray-700 rounded-lg text-[10px] font-bold hover:bg-red-50 hover:text-red-600 border border-gray-200 hover:border-red-200 transition shadow-sm gap-1">
                                        <FileText size={24} className="text-red-500" />
                                        <span>PDF</span>
                                    </a>
                                )}
                            </div>
                        )}
                    </div>
                ))
            )}
          </div>
        </section>

      </main>

      {/* --- LIGHTBOX --- */}
      {isLightboxOpen && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
            <button 
                onClick={() => setIsLightboxOpen(false)}
                className="absolute top-6 right-6 text-white/50 hover:text-white transition bg-white/10 p-2 rounded-full hover:bg-white/20"
            >
                <X size={24} />
            </button>

            <div className="relative w-full max-w-6xl h-full flex items-center justify-center">
                <img 
                    src={currentLightboxImages[currentImageIndex]} 
                    alt="Full View" 
                    className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                />
            </div>

            {currentLightboxImages.length > 1 && (
                <>
                    <button 
                        onClick={prevImage}
                        className="absolute left-6 top-1/2 -translate-y-1/2 p-4 bg-white/10 text-white rounded-full hover:bg-white/20 transition backdrop-blur-md"
                    >
                        <ChevronLeft size={32} />
                    </button>
                    <button 
                        onClick={nextImage}
                        className="absolute right-6 top-1/2 -translate-y-1/2 p-4 bg-white/10 text-white rounded-full hover:bg-white/20 transition backdrop-blur-md"
                    >
                        <ChevronRight size={32} />
                    </button>
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/80 bg-black/50 px-4 py-1.5 rounded-full text-sm font-mono backdrop-blur-md border border-white/10">
                        {currentImageIndex + 1} / {currentLightboxImages.length}
                    </div>
                </>
            )}
        </div>
      )}

      {/* --- MODAL: Add Applicator --- */}
      {isAppModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg">თავაკის დამატება</h3>
                <button onClick={() => setIsAppModalOpen(false)}><X className="text-gray-400 hover:text-gray-600" /></button>
            </div>
            <form onSubmit={handleAddApplicator} className="space-y-4">
              <input required className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-black" placeholder="დასახელება" value={appForm.name} onChange={e => setAppForm({...appForm, name: e.target.value})} />
              <input required className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-black" placeholder="სერიული ნომერი" value={appForm.serial_number} onChange={e => setAppForm({...appForm, serial_number: e.target.value})} />
              <input type="date" required className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-black" value={appForm.installed_date} onChange={e => setAppForm({...appForm, installed_date: e.target.value})} />
              <select className="w-full border rounded-lg p-3 bg-white" value={appForm.status} onChange={e => setAppForm({...appForm, status: e.target.value as any})}>
                  <option value="active">აქტიური</option><option value="damaged">დაზიანებული</option>
              </select>
              <button disabled={submitting} className="w-full bg-black text-white py-3 rounded-lg font-medium mt-2">{submitting ? '...' : 'დამატება'}</button>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: Add/Edit Service --- */}
      {isServiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h3 className="font-bold text-xl flex items-center gap-2">
                    <Wrench size={20}/> 
                    {isEditingService ? 'სერვისის რედაქტირება' : 'სერვისის დამატება'}
                </h3>
                <button onClick={() => setIsServiceModalOpen(false)}><X className="text-gray-400 hover:text-gray-600" /></button>
            </div>
            
            <form onSubmit={handleServiceSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                      <label className="text-xs font-bold text-gray-500 uppercase block mb-1">თარიღი</label>
                      <input type="date" required className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500" 
                          value={serviceForm.service_date} onChange={e => setServiceForm({...serviceForm, service_date: e.target.value})} />
                  </div>
                  <div>
                      <label className="text-xs font-bold text-gray-500 uppercase block mb-1">ტექნიკოსი</label>
                      <select className="w-full border rounded-lg p-2.5 bg-white outline-none focus:ring-2 focus:ring-blue-500"
                          value={serviceForm.technician_name} onChange={e => setServiceForm({...serviceForm, technician_name: e.target.value})}>
                          <option value="ნიკო">ნიკო</option>
                          <option value="ვახო">ვახო</option>
                          <option value="ნიკო და ვახო">ნიკო და ვახო</option>
                      </select>
                  </div>
              </div>

              <div>
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">შესრულებული სამუშაო</label>
                  <textarea required rows={4} className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 text-lg" placeholder="რა გაკეთდა..."
                      value={serviceForm.description} onChange={e => setServiceForm({...serviceForm, description: e.target.value})} />
              </div>

              <div>
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">ფასი (GEL)</label>
                  <input type="number" required className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500" placeholder="0"
                      value={serviceForm.price} onChange={e => setServiceForm({...serviceForm, price: e.target.value})} />
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-4">
                  <div>
                      <label className="text-xs font-bold text-gray-500 uppercase block mb-2 flex items-center gap-2"><FileText size={14}/> PDF ბლანკი {isEditingService && <span className="text-gray-400 font-normal">(ატვირთეთ ახალი თუ გსურთ შეცვლა)</span>}</label>
                      <input type="file" accept="application/pdf" className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                          onChange={e => setPdfFile(e.target.files ? e.target.files[0] : null)} />
                  </div>
                  <div>
                      <label className="text-xs font-bold text-gray-500 uppercase block mb-2 flex items-center gap-2"><ImageIcon size={14}/> ფოტოები {isEditingService && <span className="text-gray-400 font-normal">(ახალი ფოტოები დაემატება ძველებს)</span>}</label>
                      <input type="file" multiple accept="image/*" className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                          onChange={e => setImageFiles(e.target.files ? Array.from(e.target.files) : [])} />
                  </div>
              </div>

              <div className="pt-2 border-t mt-4">
                  <button disabled={submitting} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold shadow-md hover:bg-blue-700 transition flex items-center justify-center gap-2">
                      {submitting ? 'იტვირთება...' : (isEditingService ? 'განახლება' : 'შენახვა')}
                  </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}