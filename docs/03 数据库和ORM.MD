# 03 数据库和ORM

## 3.1 数据库设计

在有了项目需求之后，我习惯先做DB设计，在设计DB的过程中就能在脑海中构思一个数据流转的过程和需要的接口。
1. 数据库采用的MySQL。
2. 由于是展示项目，数据库的设计没有过多的考虑，主要是把功能实现完整能展示即可。
3. 编码规范有点乱，先忽略。

### 3.1.1 Chef（厨师）
| Field                     | Type     | Description              | Example Value                                                  |
|---------------------------|----------|--------------------------|----------------------------------------------------------------|
| id                        | Int      | Auto-increment ID        | 1                                                              |
| name                      | String   | Display Name             | 'John'                                                         |
| username                  | String   | Login Account            | 'ChefJohn'                                                     |
| password                  | String   | Login Password           | '$2b$10$ThlyxfIdzi42DvXEMb6qpeQBRnA5QAwvS8Lt.ALiicvHfji3wGHvm' |
| createdAt                 | DateTime | Created Time             | '2025-11-25 23:14:20.707'                                      |
| updatedAt                 | DateTime | Last Updated Time        | '2025-11-25 23:14:20.707'                                      |

密码字段经过了`bcryptjs`加密

### 3.1.2 Ingredient（食材）
| Field                     | Type     | Description              | Example Value                |
|---------------------------|----------|--------------------------|------------------------------|
| id                        | Int      | Auto-increment ID        | 1                            |
| name                      | String   | Ingredient Name          | 'Rice'                       |
| unit                      | String   | Unit                     | 'g' / 'ml' / ...             |
| createdAt                 | DateTime | Created Time             | '2025-11-25 23:14:20.707'    |
| updatedAt                 | DateTime | Last Updated Time        | '2025-11-25 23:14:20.707'    |

在面试官给我的邮件里面有提到`ingredient_amount (% of dish)`，所以我最开始是没有设计`unit`字段的。
我想着食材都按百分比（%）来计量，然后加了一个所有食材占比总和应该等于100%的验证。结果对方问我为什么要加这个设计？
后来我思考了一下百分比的设计可能不太合理，比如有些食材是固体有些是液体，你怎么衡量百分比。所有我加了一个`unit`字段来表示计量单位，比如克（g）、毫升（ml）等。

### 3.1.3 Dish（菜品）
| Field                     | Type     | Description              | Example Value                |
|---------------------------|----------|--------------------------|------------------------------|
| id                        | Int      | Auto-increment ID        | 1                            |
| chefId                    | Int      | Created By               | 1                            |
| name                      | String   | Dish Name                | 'Signature Fried Rice'       |
| versionNumber             | Int      | Latest Version Number    |  7                           |
| createdAt                 | DateTime | Created Time             | '2025-11-25 23:14:20.707'    |
| updatedAt                 | DateTime | Last Updated Time        | '2025-11-25 23:14:20.707'    |

### 3.1.4 DishIngredient（菜品-食材 配置表）
| Field                     | Type     | Description              | Example Value                |
|---------------------------|----------|--------------------------|------------------------------|
| id                        | Int      | Auto-increment ID        | 1                            |
| dishId                    | Int      | Dish Id                  | 1                            |
| ingredientId              | Int      | Ingredient Id            | 1                            |
| ingredientAmount          | Double   | Ingredient Amount        | 1.5                          |
| versionNumber             | Int      | Latest Version Number    |  7                           |
| createdAt                 | DateTime | Created Time             | '2025-11-25 23:14:20.707'    |
| updatedAt                 | DateTime | Last Updated Time        | '2025-11-25 23:14:20.707'    |

我们在食材表中已经记录了食材的单位，所以在页面上可以直接读取相应食材的单位并显示在配置表页面上。

## 3.2 Prisma ORM（对象关系模型）
当我使用Cursor实现接口时，它自动就选用了[Prisma](https://github.com/prisma/prisma)作为ORM。所以没有为什么是Prisma的问题，我只管去学习了解它。

### 3.2.1 安装Prisma依赖包
安装`@prisma/client`和`prisma`两个依赖包。
```
npm i @prisma/client prisma -S
```

`-S`选项是`--save`的缩写，会将依赖包添加到`package.json`的`dependencies`小节中。

如果想把依赖包记录到`devDependencies`中可以用`-D`或`--save-dev`选项。

dependencies和devDependencies的区别，大家可以自行搜索了解一下。

node.js的依赖包会安装在项目目录下的node_modules目录下。

这个目录（非常大）我们是不会上传到代码仓库的，所以我们需要把引用的依赖包记录在package.json文件中，别人下载了代码就可以运行`npm i`或`npm install`安装依赖包。

### 3.2.2 Prisma相关命令
在package.json的scripts小节添加以下命令：
```
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio",
    "model:generate": "prisma db pull"
```

这是node.js项目的命令定义，前面部分是命令名称，后面部分是执行的具体命令，也可以把多条命令（用&&连接）写在一起执行。

有了这些命令之后，我们就可以调用`npm run 命令名称`来执行这些命令。

1. **npm run db:generate**: 用于根据‌Prisma Schema生成‌Prisma Client代码和相关工具
2. **npm run db:push**: 将 Prisma 模型映射到数据库中
3. **npm run db:migrate**: 创建并应用迁移。这个命令会基于你的 schema.prisma 文件生成数据库迁移
4. **npm run db:studio**: 运行Prisma图形用户界面（GUI），主要用于‌浏览、编辑和调试数据库数据‌
5. **npm run model:generate**: 依据数据库连接生成Prisma模型文件（prisma/schema.prisma）

像我们做node.js开发也会有几个常用的命令：

1. **npm i 或 npm install**: 依据package.json记录安装指定的版本的依赖包，依赖包的版本可以是一个固定版本号或者正则。~表示忽略Patch版本号安装最新的版本（例如`~1.1.1`就会安装1.1开头的最新版本，可能是1.1.9），^表示忽略次版本号安装最新版本（例如`^1.1.1`就会安装1开头的最新版本，可能是1.3.19）。
2. **npm start**: 运行package.json中定义的start脚本，一般用于启动项目。`start`是默认命令，所以可以不加`run`也可以加。
3. **npm run dev**: dev命令和start命令一般是相同或者配对的，有些项目会把start命令用于运行编译后的文件，例如dist或.next目录；然后dev命令就是以开发模式直接运行项目，可以配置修改文件之后立即生效，这样就可以一边编程一边开效果。有些项目不需要运行编译后的文件可能不会定义dev命令，或者将start命令也指向dev命令。
4. **npm run build**: 运行package.json中定义的build脚本，一般是用于编译项目。

如果是第一次运行`npm i`或`npm install`，系统还会生成一个package-lock.json文件，这个文件就是把我们安装的包的具体版本记录下来，没有~或^通配符，这是为了避免安装新版本的包带来兼容性问题。所以package-lock.json文件是推荐上传到代码仓库的，下次再checkout代码如果有了这个文件就不会再依据package.json里面的通配符去安装更新的版本，而是根据这个文件直接安装完全一致的版本。

### 3.2.3 数据库连接字符串
在项目根目录下创建一个`.env`文件并添加数据库连接字符串，文本内容如下：
```
DATABASE_URL="mysql://user:password@localhost:3306/dish_db"
```

这是MySQL数据库的连接字符串格式，Postgres DB的连接字符串格式可以参考：
```
DATABASE_URL="postgresql://user:password@localhost:5432/dish_db?schema=public
```

如果有多个开发环境，可以通过[cross-env](https://github.com/kentcdodds/cross-env)做多环境配置。

### 3.2.3 生成数据模型
有了数据库连接之后，我们就可以通过Prisma来生成数据模型

1. 创建prisma目录并在该目录下创建schema.prisma文件，向文件中添加以下内容：
```
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}
```

以上我们定义了生成器客户端采用prisma-client-js，数据库是mysql数据库，数据库连接字符串读取env文件中的DATABASE_URL配置。

**我们安装的prisma版本是5.22.0，最新版本的prisma数据源配置已经修改，可以阅读相关文档进行调整。**

2. 运行`npm run model:generate`命令
```
PS D:\CodeSpace\next\dish-ms> npm run model:generate

> dish-ms@0.1.0 model:generate
> prisma db pull

Prisma schema loaded from prisma\schema.prisma
Environment variables loaded from .env
Datasource "db": MySQL database "dish_db" at "localhost:3306"

✔ Introspected 4 models and wrote them into prisma\schema.prisma in 46ms

Run prisma generate to generate Prisma Client.
```

3. 运行`db:generate`生成Prisma Client

```
PS D:\CodeSpace\next\dish-ms> npm run db:generate

> dish-ms@0.1.0 db:generate
> prisma generate

Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma

✔ Generated Prisma Client (v5.22.0) to .\node_modules\@prisma\client in 57ms

Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)

Tip: Interested in query caching in just a few lines of code? Try Accelerate today! https://pris.ly/tip-3-accelerate
```

接下来我们就可以开始编写接口了。