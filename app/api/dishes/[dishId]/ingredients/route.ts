import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateDishIngredientsSchema } from "@/lib/validations";
import {
  AppError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
  ConflictError,
} from "@/lib/errors";

/**
 * PUT /api/dishes/[dishId]/ingredients
 *
 * Update ingredients and optionally dish name for a specific chef's dish
 *
 * Request body:
 * {
 *   "name": "Updated Dish Name",  // optional
 *   "ingredients": [
 *     { "ingredientId": 1, "ingredientAmount": 30.5 },
 *     { "ingredientId": 2, "ingredientAmount": 40.2 },
 *     { "ingredientId": 3, "ingredientAmount": 29.3 }
 *   ]
 * }
 *
 * Headers:
 * - X-Chef-Id: Chef ID (required, for authorization)
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ dishId: string }> }
) {
  try {
    // Parse path parameter
    const { dishId: dishIdParam } = await context.params;
    const dishId = parseInt(dishIdParam, 10);
    if (isNaN(dishId) || dishId <= 0) {
      throw new ValidationError("Invalid dish ID");
    }

    // Get chefId from headers
    const chefIdHeader = request.headers.get("x-chef-id");
    if (!chefIdHeader) {
      throw new ValidationError("Missing required header: X-Chef-Id");
    }

    const chefId = parseInt(chefIdHeader, 10);
    if (isNaN(chefId) || chefId <= 0) {
      throw new ValidationError("Invalid chef ID");
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateDishIngredientsSchema.parse({
      dishId,
      name: body.name,
      ingredients: body.ingredients,
    });

    // Verify dish exists and belongs to the chef
    const dish = await prisma.dish.findUnique({
      where: { id: dishId },
      select: {
        id: true,
        chefId: true,
        name: true,
        versionNumber: true,
      },
    });

    if (!dish) {
      throw new NotFoundError("Dish not found");
    }

    if (dish.chefId !== chefId) {
      throw new UnauthorizedError(
        "You do not have permission to modify this dish"
      );
    }

    // If name is provided, check if it conflicts with another dish for this chef
    if (validatedData.name && validatedData.name !== dish.name) {
      const existingDish = await prisma.dish.findFirst({
        where: {
          chefId,
          name: validatedData.name,
          id: { not: dishId }, // Exclude current dish
        },
        select: { id: true },
      });

      if (existingDish) {
        throw new ConflictError(
          `A dish with the name "${validatedData.name}" already exists for this chef`
        );
      }
    }

    // Verify all ingredients exist
    const ingredientIds = validatedData.ingredients.map(
      (ing) => ing.ingredientId
    );
    const existingIngredients = await prisma.ingredient.findMany({
      where: {
        id: { in: ingredientIds },
      },
      select: { id: true },
    });

    const existingIngredientIds = new Set(
      existingIngredients.map((ing: { id: number }) => ing.id)
    );
    const missingIngredientIds = ingredientIds.filter(
      (id) => !existingIngredientIds.has(id)
    );

    if (missingIngredientIds.length > 0) {
      throw new NotFoundError(
        `The following ingredients do not exist: ${missingIngredientIds.join(
          ", "
        )}`
      );
    }

    // Check for duplicate ingredient IDs
    const uniqueIngredientIds = new Set(ingredientIds);
    if (uniqueIngredientIds.size !== ingredientIds.length) {
      throw new ValidationError(
        "Duplicate ingredient IDs found in the ingredients list"
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const now = new Date();
      // Prepare update data
      const updateData: {
        versionNumber: { increment: number };
        name?: string;
        updatedAt: Date;
      } = {
        versionNumber: { increment: 1 },
        updatedAt: now,
      };

      // If name is provided, update it as well
      if (validatedData.name) {
        updateData.name = validatedData.name;
      }

      // Increment version number and optionally update name
      const updatedDish = await tx.dish.update({
        where: { id: dishId },
        data: updateData,
        select: {
          id: true,
          name: true,
          chefId: true,
          versionNumber: true,
          updatedAt: true,
        },
      });

      // Create new ingredient associations for the new version (keep history)
      await tx.dishingredient.createMany({
        data: validatedData.ingredients.map((ing) => ({
          dishId,
          ingredientId: ing.ingredientId,
          ingredientAmount: ing.ingredientAmount,
          versionNumber: updatedDish.versionNumber,
          createdAt: now,
          updatedAt: now,
        })),
      });

      // Fetch only current version ingredients
      const allIngredients = await tx.dishingredient.findMany({
        where: { dishId },
        include: {
          ingredient: { select: { id: true, name: true, unit: true } },
        },
        orderBy: { ingredientId: "asc" },
      });

      const currentIngredients = (allIngredients as Array<any>).filter(
        (di) => di.versionNumber === updatedDish.versionNumber
      );

      return { dish: updatedDish, ingredients: currentIngredients };
    });

    // Format response data
    const response = {
      id: result.dish.id,
      name: result.dish.name,
      chefId: result.dish.chefId,
      versionNumber: result.dish.versionNumber,
      ingredients: result.ingredients.map((di) => ({
        ingredientId: di.ingredientId,
        ingredientName: di.ingredient.name,
        ingredientUnit: di.ingredient.unit,
        ingredientAmount: di.ingredientAmount,
      })),
      updatedAt: result.dish.updatedAt,
    };

    return NextResponse.json(
      {
        success: true,
        data: response,
        message: "Dish ingredients updated successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    // Handle validation errors
    if (error instanceof ValidationError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            details: error.details,
          },
        },
        { status: error.statusCode }
      );
    }

    // Handle Zod validation errors
    if (error && typeof error === "object" && "issues" in error) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Request data validation failed",
            details: error.issues,
          },
        },
        { status: 400 }
      );
    }

    // Handle other known errors
    if (error instanceof AppError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: error.code || "APP_ERROR",
            message: error.message,
          },
        },
        { status: error.statusCode }
      );
    }

    // Handle unknown errors
    console.error("Unexpected error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Internal server error",
        },
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/dishes/[dishId]/ingredients
 *
 * Get ingredient information for a specific dish
 *
 * Headers:
 * - X-Chef-Id: Chef ID (optional, for authorization)
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ dishId: string }> }
) {
  try {
    const { dishId: dishIdParam } = await context.params;
    const dishId = parseInt(dishIdParam, 10);
    if (isNaN(dishId) || dishId <= 0) {
      throw new ValidationError("Invalid dish ID");
    }

    const chefIdHeader = request.headers.get("x-chef-id");
    // Fetch dish metadata first
    const dish = await prisma.dish.findUnique({
      where: { id: dishId },
      select: {
        id: true,
        name: true,
        chefId: true,
        versionNumber: true,
        updatedAt: true,
      },
    });

    if (!dish) {
      throw new NotFoundError("Dish not found");
    }

    // If chefId is provided, verify authorization
    if (chefIdHeader) {
      const chefId = parseInt(chefIdHeader, 10);
      if (isNaN(chefId) || chefId <= 0) {
        throw new ValidationError("Invalid chef ID");
      }
      if (dish.chefId !== chefId) {
        throw new UnauthorizedError(
          "You do not have permission to view this dish"
        );
      }
    }

    // Fetch only current version ingredients
    const allIngredients = await prisma.dishingredient.findMany({
      where: { dishId },
      include: {
        ingredient: {
          select: { id: true, name: true, unit: true },
        },
      },
      orderBy: { ingredientId: "asc" },
    });

    const currentIngredients = (allIngredients as Array<any>).filter(
      (di) => di.versionNumber === dish.versionNumber
    );

    const response = {
      id: dish.id,
      name: dish.name,
      chefId: dish.chefId,
      versionNumber: dish.versionNumber,
      ingredients: currentIngredients.map((di) => ({
        ingredientId: di.ingredientId,
        ingredientName: di.ingredient.name,
        ingredientUnit: di.ingredient.unit,
        ingredientAmount: di.ingredientAmount,
      })),
      updatedAt: dish.updatedAt,
    };

    return NextResponse.json(
      {
        success: true,
        data: response,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: error.code || "APP_ERROR",
            message: error.message,
          },
        },
        { status: error.statusCode }
      );
    }

    console.error("Unexpected error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Internal server error",
        },
      },
      { status: 500 }
    );
  }
}
