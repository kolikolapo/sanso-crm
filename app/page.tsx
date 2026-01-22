'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Mail, Lock, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) router.push('/dashboard') 
    }
    checkUser()
  }, [router, supabase])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('მომხმარებელი ან პაროლი არასწორია')
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen w-full flex font-sans">
      {/* LEFT SIDE */}
      <div className="hidden lg:flex w-1/2 relative items-center justify-center overflow-hidden" style={{ backgroundColor: '#282828' }}>
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/5 to-transparent"></div>
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
        
        <div className="relative z-20 text-white p-12 max-w-xl">
            {/* LOGO SECTION - NO WHITE BG, BIGGER SIZE */}
            <div className="mb-12">
                <img src="/logo.png" alt="SANSO Logo" className="h-28 w-auto object-contain" />
            </div>
            
            <h1 className="text-5xl font-bold tracking-tight mb-6 leading-tight">SANSO <br/><span className="text-gray-400 font-light">Technical Department</span></h1>
            <p className="text-lg text-gray-400 leading-relaxed border-l-2 border-white/20 pl-6">
                Alma Lasers-ის ავტორიზებული სერვის ცენტრის მართვის ერთიანი სისტემა.
                აღრიცხვა, დიაგნოსტიკა და მონიტორინგი.
            </p>
            
            <div className="mt-16 flex items-center gap-6 text-xs text-gray-500 font-mono tracking-widest uppercase">
                <span>System v2.0</span>
                <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                <span>Authorized Access Only</span>
            </div>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="w-full lg:w-1/2 bg-white flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-10">
            <div className="text-center lg:text-left">
                <h2 className="text-3xl font-bold text-[#282828]">ავტორიზაცია</h2>
                <p className="text-gray-500 mt-2">შეიყვანეთ მონაცემები სისტემაში შესასვლელად</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-5">
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-[#282828] transition-colors" />
                        </div>
                        <input
                            type="email"
                            required
                            className="block w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#282828]/20 focus:border-[#282828] transition-all duration-200"
                            placeholder="ელ-ფოსტა"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-[#282828] transition-colors" />
                        </div>
                        <input
                            type={showPassword ? "text" : "password"}
                            required
                            className="block w-full pl-12 pr-12 py-4 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#282828]/20 focus:border-[#282828] transition-all duration-200"
                            placeholder="პაროლი"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-[#282828] transition-colors focus:outline-none"
                        >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center py-4 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white hover:bg-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#282828] transition-all duration-200 transform active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed"
                    style={{ backgroundColor: '#282828' }}
                >
                    {loading ? (
                        <Loader2 className="animate-spin h-5 w-5" />
                    ) : (
                        <span className="flex items-center gap-2">შესვლა <ArrowRight size={18}/></span>
                    )}
                </button>
            </form>
            
            <div className="border-t border-gray-100 pt-8 text-center">
                <p className="text-xs text-gray-400">
                    &copy; 2026 SANSO Technical Department.
                </p>
            </div>
        </div>
      </div>
    </div>
  )
}