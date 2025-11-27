import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createDishSchema } from "@/lib/validations";
import {
  AppError,
  NotFoundError,
  ValidationError,
  ConflictError,
} from "@/lib/errors";

/**
 * POST /api/dishes
 *
 * Create a new dish with ingredients for a specific chef
 *
 * Headers:
 * - X-Chef-Id: Chef ID (required, for authorization)
 *
 * Request body:
 * {
 *   "name": "Signature Fried Rice",
 *   "ingredients": [
 *     { "ingredientId": 1, "ingredientAmount": 300 },
 *     { "ingredientId": 2, "ingredientAmount": 2 },
 *     { "ingredientId": 3, "ingredientAmount": 150 }
 *   ]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Extract chefId from headers
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
    const validatedData = createDishSchema.parse(body);

    // Verify chef exists
    const chef = await prisma.chef.findUnique({
      where: { id: chefId },
      select: { id: true },
    });

    if (!chef) {
      throw new NotFoundError("Chef not found");
    }

    // Check if dish with same name already exists for this chef
    const existingDish = await prisma.dish.findFirst({
      where: {
        chefId,
        name: validatedData.name,
      },
      select: { id: true },
    });

    if (existingDish) {
      throw new ConflictError(
        `A dish with the name "${validatedData.name}" already exists for this chef`
      );
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

    const now = new Date();
    // Use transaction to create dish and ingredients
    const result = await prisma.$transaction(async (tx) => {
      // Create new dish with version number 1
      const newDish = await tx.dish.create({
        data: {
          chefId,
          name: validatedData.name,
          versionNumber: 1,
          createdAt: now,
          updatedAt: now,
        },
      });

      // Create ingredient associations
      await tx.dishingredient.createMany({
        data: validatedData.ingredients.map((ing) => ({
          dishId: newDish.id,
          ingredientId: ing.ingredientId,
          ingredientAmount: ing.ingredientAmount,
          versionNumber: 1,
          createdAt: now,
          updatedAt: now,
        })),
      });

      // Fetch the complete dish with ingredients
      const dishWithIngredients = await tx.dish.findUnique({
        where: { id: newDish.id },
        include: {
          dishingredient: {
            where: { versionNumber: 1 },
            include: {
              ingredient: {
                select: {
                  id: true,
                  name: true,
                  unit: true,
                },
              },
            },
            orderBy: {
              ingredientId: "asc",
            },
          },
        },
      });

      return dishWithIngredients!;
    });

    // Format response data
    const response = {
      id: result.id,
      name: result.name,
      chefId: result.chefId,
      versionNumber: result.versionNumber,
      ingredients: result.dishingredient.map(
        (di: {
          ingredientId: number;
          ingredient: { name: string; unit: string };
          ingredientAmount: number;
        }) => ({
          ingredientId: di.ingredientId,
          ingredientName: di.ingredient.name,
          ingredientUnit: di.ingredient.unit,
          ingredientAmount: di.ingredientAmount,
        })
      ),
      createdAt: now,
      updatedAt: now,
    };

    return NextResponse.json(
      {
        success: true,
        data: response,
        message: "Dish created successfully",
      },
      { status: 201 }
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
 * GET /api/dishes
 *
 * Get all dishes
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const current = parseInt(searchParams.get("current") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
    const skip = (current - 1) * pageSize;
    const search = searchParams.get("search")?.trim();
    const versionSearch = search ? Number(search) : NaN;
    const hasVersionFilter = Number.isInteger(versionSearch);
    const orConditions = search
      ? [
          { name: { contains: search } },
          ...(hasVersionFilter ? [{ versionNumber: versionSearch }] : []),
        ]
      : undefined;
    const where = orConditions ? { OR: orConditions } : undefined;

    const [total, dishes] = await Promise.all([
      prisma.dish.count({ where }),
      prisma.dish.findMany({
        where,
        select: {
          id: true,
          chefId: true,
          name: true,
          versionNumber: true,
          createdAt: true,
          updatedAt: true,
          chef: {
            select: { name: true },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
        skip,
        take: pageSize,
      }),
    ]);

    // Fetch ingredients for current page dishes and filter to current version per dish
    const dishIdToVersion: Record<number, number> = {};
    const dishIds = dishes.map((d) => {
      dishIdToVersion[d.id] = d.versionNumber;
      return d.id;
    });

    const dishingredient = dishIds.length
      ? await prisma.dishingredient.findMany({
          where: {
            dishId: { in: dishIds },
          },
          select: {
            dishId: true,
            ingredientId: true,
            ingredientAmount: true,
            versionNumber: true,
            ingredient: {
              select: { name: true, unit: true },
            },
          },
          orderBy: {
            ingredientId: "asc",
          },
        })
      : [];

    const dishIdToIngredients: Record<
      number,
      Array<{
        ingredientId: number;
        ingredientName: string;
        ingredientUnit: string;
        ingredientAmount: number;
      }>
    > = {};
    for (const di of dishingredient) {
      const currentVersion = dishIdToVersion[di.dishId];
      if (di.versionNumber !== currentVersion) continue;
      if (!dishIdToIngredients[di.dishId]) dishIdToIngredients[di.dishId] = [];
      dishIdToIngredients[di.dishId].push({
        ingredientId: di.ingredientId,
        ingredientName: di.ingredient.name,
        ingredientUnit: di.ingredient.unit,
        ingredientAmount: di.ingredientAmount,
      });
    }

    return NextResponse.json(
      {
        success: true,
        data: dishes.map((d) => ({
          id: d.id,
          chefId: d.chefId,
          chefName: d.chef?.name ?? null,
          name: d.name,
          versionNumber: d.versionNumber,
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
          ingredients: dishIdToIngredients[d.id] || [],
        })),
        total,
        current,
        pageSize,
      },
      { status: 200 }
    );
  } catch (error) {
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
