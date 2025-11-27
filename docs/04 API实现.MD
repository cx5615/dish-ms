# 04 API实现

## 4.1 Next.js App Router

在开始实现API之前，我们先聊一下我们用的Next.js版本，我们用的Next.js 16.0.5。

在 [02 创建Next项目](./02%20创建Next项目.MD) 中我们提到创建项目过程中有一个交互性提示是"是否使用App Router（默认Yes）"，我们选的是Yes。

```
√ Would you like to use App Router? (recommended) ... No / Yes
```

那什么是Next.js App Router？

Next.js App Router是Next.js 13版本引入的新一代路由系统，基于React Server Components构建，提供更强大的布局嵌套、数据获取和性能优化能力。

Next.js App Router与Pages Router有什么区别呢？这个问题大家可以自行去了解一下，这里我们介绍几个和我们项目相关的区别。

1. 布局系统
* Pages Router：通过_app.tsx或自定义组件实现布局，无法为子路由设置独立布局，复用性差。
* App Router：引入layout.tsx文件，支持路径级布局嵌套，子路由自动继承父级布局，无需额外配置。

2. 目录结构
* Pages Router：

    页面文件位于pages/目录，如pages/about.tsx对应/about路径。

    API路由位于pages/api目录下，文件路径直接映射为API端点。例如：

        * pages/api/users.ts 对应 /api/users
        * 支持动态路由（如 pages/api/users/[id].ts 对应 /api/users/:id，通过props.params.id获取参数值）

* App Router：

    页面文件位于app/目录，如app/about/page.tsx对应/about路径，支持嵌套布局（如app/dashboard/layout.tsx）。

    API路由位于app/api目录下，路径映射规则与Pages Router类似，但支持更灵活的嵌套结构。例如：

        * app/api/users/[id]/route.ts 对应 /api/users/:id，通过props.params.id获取参数值
        * 支持并行路由和拦截路由等高级功能 

Pages Router和App Rouger还有其他的区别，这里就不描述了。

## 4.2 设计我们的第一个API

我们可以开始设计我们的第一个API，我们可以创建一个/api/chefs（都用复数）接口返回Chef列表，GET方法。

依据 4.1 的描述，所以我们需要创建以下文件：app/api/chefs/route.ts

```
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export const prisma =
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

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
```

至此，我们运行项目`npm run dev`就可以启动项目，如果控制栏没有报错的话会输出：
```
PS D:\CodeSpace\next\dish-ms> npm run dev
>> 

> dish-ms@0.1.0 dev
> next dev

   ▲ Next.js 16.0.5 (Turbopack)
   - Local:         http://localhost:3000
   - Network:       http://192.168.1.3:3000
   - Environments: .env

 ✓ Starting...
 ✓ Ready in 715ms
```

因为上面的/api/chefs是一个GET请求，我们可以直接在浏览器中输入http://localhost:3000/api/chefs访问这个接口。

正常的话，浏览器会展示返回的数据
```
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "John",
      "username": "ChefJohn",
      "createdAt": "2025-11-25T23:14:20.707Z",
      "updatedAt": "2025-11-26T01:55:21.643Z"
    },
    {
      "id": 2,
      "name": "Chen",
      "username": "ChefChen",
      "createdAt": "2025-11-25T23:14:20.707Z",
      "updatedAt": "2025-11-25T23:14:20.707Z"
    },
    {
      "id": 3,
      "name": "Tim",
      "username": "ChefTim",
      "createdAt": "2025-11-25T23:14:20.707Z",
      "updatedAt": "2025-11-25T23:14:20.707Z"
    }
  ],
  "total": 3,
  "current": 1,
  "pageSize": 10
}
```

控制台也会打印相关的日志
```
prisma:query SELECT COUNT(*) FROM (SELECT `dish_db`.`chef`.`id` FROM `dish_db`.`chef` WHERE 1=1) AS `sub`
prisma:query SELECT `dish_db`.`chef`.`id`, `dish_db`.`chef`.`name`, `dish_db`.`chef`.`username`, `dish_db`.`chef`.`createdAt`, `dish_db`.`chef`.`updatedAt` FROM `dish_db`.`chef` WHERE 1=1 ORDER BY `dish_db`.`chef`.`updatedAt` DESC LIMIT ? OFFSET ?
 GET /api/chefs 200 in 421ms (compile: 257ms, render: 164ms)
```

## 4.3 代码解析

在第一个接口实现中，我们显示实例化了一个PrismaClient对象，取名为prisma。

接着我们从request中获取参数，包括页码、每页显示的条数、模糊搜索的关键字。虽然我们都没有填，但是我们都赋予了默认值。

接着调用prisma的相关函数获取记录总数和记录列表。

然后把获取的结果组装成一个response并返回，如果报错的话我们也加了try catch来捕获。

## 4.4 代码优化

### 4.4.1 PrismaClient 单例

在4.3中我们提到执行查询前得先实例化一个PrismaClient对象。

我们在每次执行SQL前都要实例化这么一个对象，也就是每个route.ts文件都要写这么一串代码。

我们是不是可以写一个类或者方法来专门干这个事？而且，这种对象是可以复用的，全局只需要一个即可，我们可以用一个单例来实现。

考虑到后面还会有类似的类或方法，我们创建一个/lib目录专门存放这种工具类或文件。创建/lib/prisma.ts文件，其内容如下：

```
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

然后把/app/api/chefs文件中创建PrismaClient的代码删除，直接从/lib/prisma.ts中引用即可。
```
import { prisma } from '@/lib/prisma'
```

这里引用路径为什么是'@/lib/prisma'？

这是因为我们在生成项目的时候，系统自动帮我们配置了一个引用别名。

查看/tsconfig.json看是否有如下配置，如果没有可以加上：
```
    "paths": {
      "@/*": ["./*"]
    }
```

这个配置的意思就是@开头的引用都会默认执行根目录下的相关目录，这样就不用处理相对路径了。

### 4.4.2 统一错误类型

我们在接口中加了try catch，对于错误也是会封装成一个对象返回的。

为了获得更好的用户体验，我们可以定义统一的错误类型和错误信息。

创建/lib/errors.ts文件并定义：

```
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND')
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized access') {
    super(message, 403, 'UNAUTHORIZED')
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR')
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409, 'CONFLICT')
  }
}
```


## 4.5 其他接口的实现

通过上面的例子，我们看到了如果我们需要实现URL为/api/chefs的GET方法接口，就只用创建/app/api/chefs/route.ts文件，并实现一个GET函数。

所以我们想继续实现其他的接口，按照这个套路就行，但是我们要遵循RESTFUL标准。

1. 路由中的实体名称都有复数（这个不是强制的）。
2. GET方法用于查询数据，如果是查询某个指定的对象，例如chefId为1的Chef，我们可以定义路由为/api/chefs/1，路由中的1就是chefId（也可以取别的名字，那代码中取参数值的地方也要对应）

那我们就要创建/app/api/chefs/[chefId]/route.ts文件，`[chefId]`的中括号是必须的，表示这个一个路由参数。同样在该文件下添加一个GET方法，其代码如下：

```
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
    const { chefId: chefIdParam } = await context.params
    const chefId = parseInt(chefIdParam, 10)
    if (isNaN(chefId) || chefId <= 0) {
      throw new ValidationError('Invalid chef ID')
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
    })

    if (!chef) {
      throw new NotFoundError('Chef not found')
    }

    return NextResponse.json(
      {
        success: true,
        data: chef,
      },
      { status: 200 }
    )
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: error.code || 'APP_ERROR',
            message: error.message,
          },
        },
        { status: error.statusCode }
      )
    }

    console.error('Unexpected error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Internal server error',
        },
      },
      { status: 500 }
    )
  }
}
```
3. POST方法用于创建数据
4. PUT方法用于更新数据
5. DELETE方法用于删除数据（这个系统我们没有实现删除功能，考虑到数据的完整性，我们可以使用逻辑删除，添加一个字段标记Active状态）
6. 统一的Response格式和错误信息

## 4.6 特殊接口

大部分接口我们参考以上内容就可以实现了，但是总会有一些特别的接口或者需要特别处理的需求。

### 4.6.1 password加密

用户密码属于机要数据，我们不能轻易暴露用户的密码，所以我们不能采用明文存储。

这里我们引入了bcryptjs库对密码进行加密之后再保存到数据库。

1. bcryptjs安装
```
PS D:\CodeSpace\next\dish-ms> npm i bcryptjs -S

added 1 package in 917ms

136 packages are looking for funding
  run `npm fund` for details
```

2. 对密码进行加密

这里调用的是bcrypt的hash方法，第二参数解释为salt，是不是就是所谓的加盐？
```
 * @param salt     Salt length to generate or salt to use
```

```
    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 10)
```

我们这里设计的是在后端给密码加密，然后再存入DB。

那网络传输的时候密码是不是还是明文？比如一个人登录了系统，然后请求被别人拦截了。

甚至简单点，一个人把浏览器打开了开发者选择然后登录系统，等他离开座位的时候没有锁屏旁边的人直接查看他的请求，也可以看到明文的密码。

在我以前实现的系统中，我更喜欢在前端加密，也可以引用同样的JS库。不过这里不是关键，大家可以根据自己的喜好设计系统。

### 4.6.2 创建或更新Dish

Dish除了本身的信息外，还包含DishIngredient的配置信息。

所以创建或更新Dish时最好采用事务处理。
```
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
```