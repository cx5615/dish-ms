# 06 Rest Client插件

在[第4章](./04%20API实现.MD)我们介绍了接口的实现，实现了一个GET方法的接口，并通过浏览器访问URL测试了这个接口。

但是对于POST/PUT/DELETE类型的接口，我们是没法直接通过在浏览器中贴URL来测试的。

依旧有很多工具或者方法可以测试这些接口，例如PostMan工具，或者自己写一些代码来发请求。

作为一个前端开发工程师，我推荐使用VS Code的Rest Client插件来测试API。

## 6.1 安装Rest Client插件

在VS Code的左侧面板（默认是在左侧，如果自己有定制化窗口视图的话可能有变化）找到Extensions或者按快捷键Ctrl + Shift + X打开VS Code的扩展插件面板，搜索Rest Client -> Install。

## 6.2 编写请求

Rest Client插件的主页就有样例如何编写请求信息。

我们可以创建一个api.http文件来保存我们的请求，方便重复执行。

### 6.2.1 测试GET接口

```
GET http://localhost:3000/api/chefs?current=2&pageSize=2 HTTP/1.1
```

选中请求信息，右键会有一个"Send Request"选项（只有扩展名为.http或着新创建的还没命名的文件才会有这个选项）。选中该选项发送请求，会在右侧打开一个新的窗口显示Response数据。

```
HTTP/1.1 200 OK
vary: rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch
content-type: application/json
Date: Thu, 27 Nov 2025 08:39:01 GMT
Connection: close
Transfer-Encoding: chunked

{
  "success": true,
  "data": [
    {
      "id": 3,
      "name": "Tim",
      "username": "ChefTim",
      "createdAt": "2025-11-25T23:14:20.707Z",
      "updatedAt": "2025-11-25T23:14:20.707Z"
    }
  ],
  "total": 3,
  "current": 2,
  "pageSize": 2
}
```

### 6.2.2 请求头参数

在我们的需求中有一项Chef只能编辑由他自己创建的Dish，系统自动生成的接口是把DishId直接放在路由里面，这是很不合理的。
所以我们把这个参数放在了请求头里面。正常的话，当前登录用户的信息应该直接从Sessino读取，而不是用户从前端传过去。不过我们还没实现登录Session管理。

```
PUT http://localhost:3000/api/dishes/1/ingredients HTTP/1.1
content-type: application/json
X-Chef-Id: 2

{
    "ingredients": [
      {"ingredientId": 1, "ingredientAmount": 30.5},
      {"ingredientId": 2, "ingredientAmount": 30.3},
      {"ingredientId": 3, "ingredientAmount": 39.2}
    ]
}
```

返回结果

```
HTTP/1.1 403 Forbidden
vary: rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch
content-type: application/json
Date: Thu, 27 Nov 2025 11:03:02 GMT
Connection: close
Transfer-Encoding: chunked

{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "You do not have permission to modify this dish"
  }
}
```
