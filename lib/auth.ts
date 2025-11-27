// Authentication utilities using session storage

const CHEF_STORAGE_KEY = 'current_chef'

export interface ChefInfo {
  id: number
  name: string
  username: string
}

export const auth = {
  // Get current logged-in chef from session storage
  getCurrentChef: (): ChefInfo | null => {
    if (typeof window === 'undefined') return null
    
    try {
      const chefStr = sessionStorage.getItem(CHEF_STORAGE_KEY)
      if (!chefStr) return null
      return JSON.parse(chefStr) as ChefInfo
    } catch (error) {
      console.error('Failed to get current chef from session storage:', error)
      return null
    }
  },

  // Set current logged-in chef to session storage
  setCurrentChef: (chef: ChefInfo): void => {
    if (typeof window === 'undefined') return
    
    try {
      sessionStorage.setItem(CHEF_STORAGE_KEY, JSON.stringify(chef))
    } catch (error) {
      console.error('Failed to set current chef to session storage:', error)
    }
  },

  // Clear current chef from session storage (logout)
  clearCurrentChef: (): void => {
    if (typeof window === 'undefined') return
    
    try {
      sessionStorage.removeItem(CHEF_STORAGE_KEY)
    } catch (error) {
      console.error('Failed to clear current chef from session storage:', error)
    }
  },

  // Check if chef is logged in
  isAuthenticated: (): boolean => {
    return auth.getCurrentChef() !== null
  },

  // Get current chef ID
  getCurrentChefId: (): number | null => {
    const chef = auth.getCurrentChef()
    return chef?.id ?? null
  },
}

