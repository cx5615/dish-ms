import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createChefSchema } from "@/lib/validations";
import { AppError, ValidationError, ConflictError } from "@/lib/errors";
import bcrypt from "bcryptjs";

/**
 * POST /api/chefs
 *
 * Create a new chef
 *
 * Request body:
 * {
 *   "name": "Chef John"
 *   "username": "ChefJohn1",
 *   "password": "123456"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createChefSchema.parse(body);

    // Check if chef with same username already exists
    const existingChef = await prisma.chef.findUnique({
      where: {
        username: validatedData.username,
      },
      select: { id: true },
    });

    if (existingChef) {
      throw new ConflictError(
        `A chef with the username "${validatedData.username}" already exists`
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 10);
    const now = new Date();

    const chef = await prisma.chef.create({
      data: {
        name: validatedData.name,
        username: validatedData.username,
        password: hashedPassword,
        createdAt: now,
        updatedAt: now,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: chef.id,
          name: chef.name,
          username: chef.username,
          createdAt: now,
          updatedAt: now,
        },
        message: "Chef created successfully",
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
 * GET /api/chefs
 *
 * Get all chefs
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
          OR: [
            { name: { contains: search } },
            { username: { contains: search } },
          ],
        }
      : undefined;

    const [total, chefs] = await Promise.all([
      prisma.chef.count({ where }),
      prisma.chef.findMany({
        where,
        select: {
          id: true,
          name: true,
          username: true,
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
        data: chefs,
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
