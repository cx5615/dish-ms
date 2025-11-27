// API Client utility functions

import { auth } from './auth'

const API_BASE_URL = '/api'

export interface ApiResponse<T> {
  success: boolean
  data?: T
  total?: number
  current?: number
  pageSize?: number
  message?: string
  error?: {
    code: string
    message: string
    details?: any
  }
}

// Chef related types
export interface Chef {
  id: number
  name: string
  username: string
  createdAt: string
  updatedAt: string
}

export interface CreateChefData {
  name: string
  username: string
  password: string
}

export interface UpdateChefData {
  name: string
}

// Ingredient related types
export interface Ingredient {
  id: number
  name: string
  unit: string
  createdAt: string
  updatedAt: string
}

export interface CreateIngredientData {
  name: string
  unit: string
}

export interface UpdateIngredientData {
  name?: string
  unit?: string
}

// Dish related types
export interface DishIngredient {
  ingredientId: number
  ingredientName: string
  ingredientUnit: string
  ingredientAmount: number
}

export interface Dish {
  id: number
  name: string
  chefId: number
  chefName?: string
  versionNumber: number
  ingredients: DishIngredient[]
  createdAt: string
  updatedAt: string
}

export interface CreateDishData {
  name: string
  ingredients: {
    ingredientId: number
    ingredientAmount: number
  }[]
}

export interface UpdateDishData {
  name?: string
  ingredients: {
    ingredientId: number
    ingredientAmount: number
  }[]
}

export interface DishHistoryVersion {
  versionNumber: number
  ingredients: DishIngredient[]
}

export interface DishHistoryResponse {
  dish: {
    id: number
    name: string
    chefId: number
    currentVersionNumber: number
    createdAt: string
    updatedAt: string
  }
  histories: DishHistoryVersion[]
}

// API request function
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  // Automatically add X-Chef-Id header if chef is logged in
  const chefId = auth.getCurrentChefId()
  if (chefId !== null) {
    headers['X-Chef-Id'] = chefId.toString()
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  })

  return response.json()
}

// Chef API
export const chefApi = {
  getAll: async (current = 1, pageSize = 10, search?: string): Promise<ApiResponse<Chef[]>> => {
    const params = new URLSearchParams({
      current: current.toString(),
      pageSize: pageSize.toString(),
    })
    const trimmedSearch = search?.trim()
    if (trimmedSearch) {
      params.append('search', trimmedSearch)
    }
    return apiRequest<Chef[]>(`/chefs?${params.toString()}`)
  },

  getById: async (id: number): Promise<ApiResponse<Chef>> => {
    return apiRequest<Chef>(`/chefs/${id}`)
  },

  create: async (data: CreateChefData): Promise<ApiResponse<Chef>> => {
    return apiRequest<Chef>('/chefs', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  update: async (id: number, data: UpdateChefData): Promise<ApiResponse<Chef>> => {
    return apiRequest<Chef>(`/chefs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  login: async (username: string, password: string): Promise<ApiResponse<Chef>> => {
    return apiRequest<Chef>('/chefs/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    })
  },
}

// Ingredient API
export const ingredientApi = {
  getAll: async (current = 1, pageSize = 10, search?: string): Promise<ApiResponse<Ingredient[]>> => {
    const params = new URLSearchParams({
      current: current.toString(),
      pageSize: pageSize.toString(),
    })
    const trimmedSearch = search?.trim()
    if (trimmedSearch) {
      params.append('search', trimmedSearch)
    }
    return apiRequest<Ingredient[]>(`/ingredients?${params.toString()}`)
  },

  getById: async (id: number): Promise<ApiResponse<Ingredient>> => {
    return apiRequest<Ingredient>(`/ingredients/${id}`)
  },

  create: async (data: CreateIngredientData): Promise<ApiResponse<Ingredient>> => {
    return apiRequest<Ingredient>('/ingredients', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  update: async (id: number, data: UpdateIngredientData): Promise<ApiResponse<Ingredient>> => {
    return apiRequest<Ingredient>(`/ingredients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },
}

// Dish API
export const dishApi = {
  getAll: async (current = 1, pageSize = 10, search?: string): Promise<ApiResponse<Dish[]>> => {
    const params = new URLSearchParams({
      current: current.toString(),
      pageSize: pageSize.toString(),
    })
    const trimmedSearch = search?.trim()
    if (trimmedSearch) {
      params.append('search', trimmedSearch)
    }
    return apiRequest<Dish[]>(`/dishes?${params.toString()}`)
  },

  getById: async (dishId: number): Promise<ApiResponse<Dish>> => {
    // X-Chef-Id is automatically added by apiRequest
    return apiRequest<Dish>(`/dishes/${dishId}/ingredients`)
  },

  create: async (data: CreateDishData): Promise<ApiResponse<Dish>> => {
    // X-Chef-Id is automatically added by apiRequest
    return apiRequest<Dish>('/dishes', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  update: async (dishId: number, data: UpdateDishData): Promise<ApiResponse<Dish>> => {
    // X-Chef-Id is automatically added by apiRequest
    return apiRequest<Dish>(`/dishes/${dishId}/ingredients`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  getHistory: async (dishId: number, current = 1, pageSize = 10): Promise<ApiResponse<DishHistoryResponse>> => {
    return apiRequest<DishHistoryResponse>(`/dishes/${dishId}/ingredients/history?current=${current}&pageSize=${pageSize}`)
  },
}

