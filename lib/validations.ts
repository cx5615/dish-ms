import { z } from 'zod'

export const updateDishIngredientsSchema = z.object({
  dishId: z.number().int().positive(),
  name: z.string().min(1, 'Dish name is required').max(255, 'Dish name is too long').optional(),
  ingredients: z
    .array(
      z.object({
        ingredientId: z.number().int().positive(),
        ingredientAmount: z.number().min(0, 'Ingredient amount must be non-negative'),
      })
    )
    .min(1, 'At least one ingredient is required'),
})

export type UpdateDishIngredientsInput = z.infer<typeof updateDishIngredientsSchema>

export const createDishSchema = z.object({
  name: z.string().min(1, 'Dish name is required').max(255, 'Dish name is too long'),
  ingredients: z
    .array(
      z.object({
        ingredientId: z.number().int().positive(),
        ingredientAmount: z.number().min(0, 'Ingredient amount must be non-negative'),
      })
    )
    .min(1, 'At least one ingredient is required'),
})

export type CreateDishInput = z.infer<typeof createDishSchema>

// Chef schemas
export const createChefSchema = z.object({
  name: z.string().min(1, 'Chef name is required').max(255, 'Chef name is too long'),
  username: z.string().min(1, 'Username is required').max(255, 'Username is too long'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(255, 'Password is too long'),
})

export type CreateChefInput = z.infer<typeof createChefSchema>

export const updateChefSchema = z.object({
  name: z.string().min(1, 'Chef name is required').max(255, 'Chef name is too long'),
})

export type UpdateChefInput = z.infer<typeof updateChefSchema>

// Login schema
export const loginChefSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
})

export type LoginChefInput = z.infer<typeof loginChefSchema>

// Ingredient schemas
export const createIngredientSchema = z.object({
  name: z.string().min(1, 'Ingredient name is required').max(255, 'Ingredient name is too long'),
  unit: z.string().min(1, 'Ingredient unit is required').max(50, 'Ingredient unit is too long'),
})

export type CreateIngredientInput = z.infer<typeof createIngredientSchema>

export const updateIngredientSchema = z
  .object({
    name: z.string().min(1, 'Ingredient name is required').max(255, 'Ingredient name is too long').optional(),
    unit: z.string().min(1, 'Ingredient unit is required').max(50, 'Ingredient unit is too long').optional(),
  })
  .refine((data) => data.name !== undefined || data.unit !== undefined, {
    message: 'At least one field (name or unit) must be provided',
  })

export type UpdateIngredientInput = z.infer<typeof updateIngredientSchema>

