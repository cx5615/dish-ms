import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateIngredientSchema } from "@/lib/validations";
import {
  AppError,
  NotFoundError,
  ValidationError,
  ConflictError,
} from "@/lib/errors";

/**
 * GET /api/ingredients/[ingredientId]
 *
 * Get a specific ingredient by ID
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ ingredientId: string }> }
) {
  try {
    const { ingredientId: ingredientIdParam } = await context.params;
    const ingredientId = parseInt(ingredientIdParam, 10);
    if (isNaN(ingredientId) || ingredientId <= 0) {
      throw new ValidationError("Invalid ingredient ID");
    }

    const ingredient = await prisma.ingredient.findUnique({
      where: { id: ingredientId },
      select: {
        id: true,
        name: true,
        unit: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!ingredient) {
      throw new NotFoundError("Ingredient not found");
    }

    return NextResponse.json(
      {
        success: true,
        data: ingredient,
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

/**
 * PUT /api/ingredients/[ingredientId]
 *
 * Update a specific ingredient by ID
 *
 * Request body:
 * {
 *   "name": "Updated Ingredient Name",
 *   "unit": "g"
 * }
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ ingredientId: string }> }
) {
  try {
    const { ingredientId: ingredientIdParam } = await context.params;
    const ingredientId = parseInt(ingredientIdParam, 10);
    if (isNaN(ingredientId) || ingredientId <= 0) {
      throw new ValidationError("Invalid ingredient ID");
    }

    const body = await request.json();
    const validatedData = updateIngredientSchema.parse(body);

    // Check if ingredient exists
    const existingIngredient = await prisma.ingredient.findUnique({
      where: { id: ingredientId },
      select: { id: true },
    });

    if (!existingIngredient) {
      throw new NotFoundError("Ingredient not found");
    }

    // Check if another ingredient with the same name exists (name is unique)
    if (validatedData.name) {
      const duplicateIngredient = await prisma.ingredient.findUnique({
        where: {
          name: validatedData.name,
        },
        select: { id: true },
      });

      if (duplicateIngredient && duplicateIngredient.id !== ingredientId) {
        throw new ConflictError(
          `An ingredient with the name "${validatedData.name}" already exists`
        );
      }
    }

    const updateData: { name?: string; unit?: string } = {};
    if (validatedData.name) updateData.name = validatedData.name;
    if (validatedData.unit) updateData.unit = validatedData.unit;

    const updatedIngredient = await prisma.ingredient.update({
      where: { id: ingredientId },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        unit: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: updatedIngredient,
        message: "Ingredient updated successfully",
      },
      { status: 200 }
    );
  } catch (error) {
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
