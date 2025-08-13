'use client'

import React, { useEffect, useState } from 'react'
import { useNavigation } from '../hooks/useNavigation'

export default function NavigationProgressBar() {
  const { isPending } = useNavigation()
  const [progress, setProgress] = useState(0)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (isPending) {
      setIsVisible(true)
      setProgress(0)
      
      // Simulate progress
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval)
            return 90
          }
          return prev + Math.random() * 15
        })
      }, 100)

      return () => clearInterval(interval)
    } else {
      // Complete the progress bar
      setProgress(100)
      
      // Hide after completion animation
      const timer = setTimeout(() => {
        setIsVisible(false)
        setProgress(0)
      }, 300)

      return () => clearTimeout(timer)
    }
  }, [isPending])

  if (!isVisible) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      {/* Main progress bar */}
      <div className="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 overflow-hidden">
        <div 
          className="h-full bg-white/20 transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
