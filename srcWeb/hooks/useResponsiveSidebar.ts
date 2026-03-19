import { useState, useEffect } from 'react'

export function useResponsiveSidebar() {
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false)
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      
      // On desktop, sidebars are always open
      if (!mobile) {
        setLeftSidebarOpen(true)
        setRightSidebarOpen(true)
      } else {
        // On mobile, sidebars are closed by default
        setLeftSidebarOpen(false)
        setRightSidebarOpen(false)
      }
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const toggleLeftSidebar = () => {
    setLeftSidebarOpen(prev => !prev)
  }

  const toggleRightSidebar = () => {
    setRightSidebarOpen(prev => !prev)
  }

  return {
    leftSidebarOpen,
    rightSidebarOpen,
    isMobile,
    toggleLeftSidebar,
    toggleRightSidebar
  }
}