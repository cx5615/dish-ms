# 02 创建Next项目

## 2.1 create-next-app
create-next-app是Next.js官方提供的脚手架工具，用于快速创建‌Next.js项目。

### 2.1.1 全局安装create-next-app
我们可以选择全局安装create-next-app，然后通过create-next-app命令来创建Next.js项目。

安装命令：
```
npm install -g create-next-app
```

创建项目命令：
```
create-next-app my-app
```

### 2.1.2 通过npx工具调用create-next-app
npx是一个Node.js工具，用于运行包中的二进制文件，而无需全局安装。

通过npx调用create-next-app创建Next.js项目命令：
```
npx create-next-app@latest my-app
```

## 2.2 创建演示项目 - 餐饮管理系统
这个教程我们实现一个餐饮管理系统，系统大致的功能如下：
1. 菜品（Dish）需要的食材（Ingredient）是共享的；
2. 厨师（Chef）可配置自己的菜品（Dish）所需要的食材（Ingredient）以及食材分量（Ingredient Amount）；
3. 菜品（Dish）有一个版本号字段，厨师（Chef）每次更新菜品食材配置（Dish-Ingredient）都给版本号加1；
...

所以我们给这个系统取名为dish-ms（Dish Management System）。
接下来我们通过create-next-app工具来创建该项目。
创建项目过程中会弹出一些交互式提示：
1. 是否使用推荐的默认设置（默认Yes，推荐使用默认设置）
```
? Would you like to use the recommended Next.js defaults? » - Use arrow-keys. Return to submit.
>   Yes, use recommended defaults
    TypeScript, ESLint, Tailwind CSS, App Router
    No, reuse previous settings
    No, customize settings
```
如果选择使用默认设置，后续的交互式提示就不会弹出了，选择`No, customize settings`会继续弹出以下提示：

2. 是否采用TypeScript（默认Yes）
3. 是否采用ESLint做代码检查工具（默认Yes）
4. 是否使用React编译器（默认No）
5. 是否采用Tailwind CSS （CSS框架）（默认No）
6. 是否想把代码放在`src/`目录下（默认No）
7. 是否使用App Router（默认Yes）
8. 是否需要客制化引入别名（默认No）

另外我们也可以直接在create-next-app命令后面加`--yes`选项直接跳过交互式提示并使用推荐的默认设置。
```
npx create-next-app@latest my-app --yes
```

以下是我们创建dish-ms项目的命令和设置选项：
```
PS D:\CodeSpace\next> npx create-next-app@latest dish-ms
√ Would you like to use the recommended Next.js defaults? » No, customize settings
√ Would you like to use TypeScript? ... No / Yes
√ Which linter would you like to use? » ESLint
√ Would you like to use React Compiler? ... No / Yes
√ Would you like to use Tailwind CSS? ... No / Yes
√ Would you like your code inside a `src/` directory? ... No / Yes
√ Would you like to use App Router? (recommended) ... No / Yes
√ Would you like to customize the import alias (`@/*` by default)? ... No / Yes
Creating a new Next.js app in D:\CodeSpace\next\dish-ms.

Using npm.

Initializing project with template: app


Installing dependencies:
- next
- react
- react-dom

Installing devDependencies:
- @types/node
- @types/react
- @types/react-dom
- eslint
- eslint-config-next
- typescript


added 339 packages in 26s

136 packages are looking for funding
  run `npm fund` for details

Generating route types...
✓ Types generated successfully

Initialized a git repository.

Success! Created dish-ms at D:\CodeSpace\next\dish-ms
```