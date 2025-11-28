import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  AppError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "@/lib/errors";

/**
 * GET /api/dishes/[dishId]/ingredients/history
 *
 * Get all versioned ingredient histories for a specific dish, grouped by versionNumber.
 *
 * Headers:
 * - X-Chef-Id: Chef ID (optional, for authorization)
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ dishId: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const current = parseInt(searchParams.get("current") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
    const offset = (current - 1) * pageSize;

    const { dishId: dishIdParam } = await context.params;
    const dishId = parseInt(dishIdParam, 10);
    if (isNaN(dishId) || dishId <= 0) {
      throw new ValidationError("Invalid dish ID");
    }

    const chefIdHeader = request.headers.get("x-chef-id");

    const dish = await prisma.dish.findUnique({
      where: { id: dishId },
      select: {
        id: true,
        name: true,
        chefId: true,
        versionNumber: true,
        updatedAt: true,
        createdAt: true,
      },
    });

    if (!dish) {
      throw new NotFoundError("Dish not found");
    }

    if (chefIdHeader) {
      const chefId = parseInt(chefIdHeader, 10);
      if (isNaN(chefId) || chefId <= 0) {
        throw new ValidationError("Invalid chef ID");
      }
      // if (dish.chefId !== chefId) {
      //   throw new UnauthorizedError('You do not have permission to view this dish')
      // }
    }

    const rows = await prisma.dishingredient.findMany({
      where: { dishId },
      include: {
        ingredient: { select: { id: true, name: true, unit: true } },
      },
      orderBy: [{ versionNumber: "desc" }, { ingredientId: "asc" }],
    });

    const grouped: Array<{
      versionNumber: number;
      ingredients: Array<{
        ingredientId: number;
        ingredientName: string;
        ingredientUnit: string;
        ingredientAmount: number;
      }>;
    }> = [];

    let currentVersion = -1;
    let bucket: Array<{
      ingredientId: number;
      ingredientName: string;
      ingredientUnit: string;
      ingredientAmount: number;
    }> = [];

    for (const row of rows as Array<any>) {
      if (row.versionNumber !== currentVersion) {
        if (bucket.length > 0) {
          grouped.push({ versionNumber: currentVersion, ingredients: bucket });
        }
        currentVersion = row.versionNumber;
        bucket = [];
      }
      bucket.push({
        ingredientId: row.ingredientId,
        ingredientName: row.ingredient.name,
        ingredientUnit: row.ingredient.unit,
        ingredientAmount: row.ingredientAmount,
      });
    }
    if (bucket.length > 0) {
      grouped.push({ versionNumber: currentVersion, ingredients: bucket });
    }

    const total = grouped.length;
    const pagedHistories = grouped.slice(offset, offset + pageSize);

    const response = {
      dish: {
        id: dish.id,
        name: dish.name,
        chefId: dish.chefId,
        currentVersionNumber: dish.versionNumber,
        createdAt: dish.createdAt,
        updatedAt: dish.updatedAt,
      },
      histories: pagedHistories,
    };

    return NextResponse.json(
      {
        success: true,
        data: response,
        total,
        current,
        pageSize,
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
