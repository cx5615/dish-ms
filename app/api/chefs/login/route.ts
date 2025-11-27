import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { loginChefSchema } from "@/lib/validations";
import { AppError, ValidationError, UnauthorizedError } from "@/lib/errors";
import bcrypt from "bcryptjs";

/**
 * POST /api/chefs/login
 *
 * Login a chef with username and password
 *
 * Request body:
 * {
 *   "username": "chef_john",
 *   "password": "password123"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = loginChefSchema.parse(body);

    // Find chef by username
    const chef = await prisma.chef.findUnique({
      where: {
        username: validatedData.username,
      },
      select: {
        id: true,
        name: true,
        username: true,
        password: true,
      },
    });

    if (!chef) {
      throw new UnauthorizedError("Invalid username or password");
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(
      validatedData.password,
      chef.password
    );

    if (!isPasswordValid) {
      throw new UnauthorizedError("Invalid username or password");
    }

    // Return chef info (without password)
    return NextResponse.json(
      {
        success: true,
        data: {
          id: chef.id,
          name: chef.name,
          username: chef.username,
        },
        message: "Login successful",
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
