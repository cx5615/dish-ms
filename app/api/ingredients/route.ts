import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createIngredientSchema,
  updateIngredientSchema,
} from "@/lib/validations";
import {
  AppError,
  NotFoundError,
  ValidationError,
  ConflictError,
} from "@/lib/errors";

/**
 * POST /api/ingredients
 *
 * Create a new ingredient
 *
 * Request body:
 * {
 *   "name": "Rice",
 *   "unit": "g"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createIngredientSchema.parse(body);

    // Check if ingredient with same name already exists (name is unique)
    const existingIngredient = await prisma.ingredient.findUnique({
      where: {
        name: validatedData.name,
      },
      select: { id: true },
    });

    if (existingIngredient) {
      throw new ConflictError(
        `An ingredient with the name "${validatedData.name}" already exists`
      );
    }

    const now = new Date();
    const ingredient = await prisma.ingredient.create({
      data: {
        name: validatedData.name,
        unit: validatedData.unit,
        createdAt: now,
        updatedAt: now,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: ingredient.id,
          name: ingredient.name,
          unit: ingredient.unit,
          createdAt: now,
          updatedAt: now,
        },
        message: "Ingredient created successfully",
      },
      { status: 201 }
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

/**
 * GET /api/ingredients
 *
 * Get all ingredients
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const current = parseInt(searchParams.get("current") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
    const skip = (current - 1) * pageSize;

    const search = searchParams.get("search")?.trim();
    const where = search
      ? {
          OR: [{ name: { contains: search } }, { unit: { contains: search } }],
        }
      : undefined;

    const [total, ingredients] = await Promise.all([
      prisma.ingredient.count({ where }),
      prisma.ingredient.findMany({
        where,
        select: {
          id: true,
          name: true,
          unit: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          updatedAt: "desc",
        },
        skip,
        take: pageSize,
      }),
    ]);

    return NextResponse.json(
      {
        success: true,
        data: ingredients,
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
