'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/auth'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    if (auth.isAuthenticated()) {
      router.push('/chefs')
    } else {
      router.push('/login')
    }
  }, [router])

  return null
}

