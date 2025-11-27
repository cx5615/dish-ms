import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateChefSchema } from "@/lib/validations";
import { AppError, NotFoundError, ValidationError } from "@/lib/errors";

/**
 * GET /api/chefs/[chefId]
 *
 * Get a specific chef by ID
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ chefId: string }> }
) {
  try {
    const { chefId: chefIdParam } = await context.params;
    const chefId = parseInt(chefIdParam, 10);
    if (isNaN(chefId) || chefId <= 0) {
      throw new ValidationError("Invalid chef ID");
    }

    const chef = await prisma.chef.findUnique({
      where: { id: chefId },
      select: {
        id: true,
        name: true,
        username: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!chef) {
      throw new NotFoundError("Chef not found");
    }

    return NextResponse.json(
      {
        success: true,
        data: chef,
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
 * PUT /api/chefs/[chefId]
 *
 * Update a specific chef by ID
 *
 * Request body:
 * {
 *   "name": "Updated Chef Name"
 * }
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ chefId: string }> }
) {
  try {
    const { chefId: chefIdParam } = await context.params;
    const chefId = parseInt(chefIdParam, 10);
    if (isNaN(chefId) || chefId <= 0) {
      throw new ValidationError("Invalid chef ID");
    }

    const body = await request.json();
    const validatedData = updateChefSchema.parse(body);

    // Check if chef exists
    const existingChef = await prisma.chef.findUnique({
      where: { id: chefId },
      select: { id: true },
    });

    if (!existingChef) {
      throw new NotFoundError("Chef not found");
    }

    // Check if another chef with the same name exists
    // const duplicateChef = await prisma.chef.findFirst({
    //   where: {
    //     name: validatedData.name,
    //     id: { not: chefId },
    //   },
    //   select: { id: true },
    // })

    // if (duplicateChef) {
    //   throw new ConflictError(`A chef with the name "${validatedData.name}" already exists`)
    // }

    const updatedChef = await prisma.chef.update({
      where: { id: chefId },
      data: {
        name: validatedData.name,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        username: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: updatedChef,
        message: "Chef updated successfully",
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
