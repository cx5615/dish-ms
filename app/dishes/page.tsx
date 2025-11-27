"use client";

import { useState, useEffect } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  message,
  Space,
  Popconfirm,
  Tag,
  Drawer,
  Timeline,
  Pagination,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  HistoryOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import {
  dishApi,
  ingredientApi,
  type Dish,
  type Ingredient,
  type CreateDishData,
  type UpdateDishData,
  type DishHistoryVersion,
} from "@/lib/api-client";
import { auth } from "@/lib/auth";

const { Option } = Select;

export default function DishesPage() {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [editingDish, setEditingDish] = useState<Dish | null>(null);
  const [history, setHistory] = useState<DishHistoryVersion[]>([]);
  const [currentDishInfo, setCurrentDishInfo] = useState<{
    name: string;
    dishId: number;
  } | null>(null);
  const [form] = Form.useForm();
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [historyPagination, setHistoryPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [searchKeyword, setSearchKeyword] = useState("");

  const fetchDishes = async (
    current = 1,
    pageSize = 10,
    keyword = searchKeyword
  ) => {
    const normalizedKeyword = keyword?.trim() || undefined;
    setLoading(true);
    try {
      const response = await dishApi.getAll(
        current,
        pageSize,
        normalizedKeyword
      );
      if (response.success && response.data) {
        setDishes(response.data);
        setPagination({
          current: response.current || current,
          pageSize: response.pageSize || pageSize,
          total: response.total || 0,
        });
      } else {
        message.error(response.error?.message || "Failed to fetch dishes");
      }
    } catch (error) {
      message.error("Failed to fetch dishes");
    } finally {
      setLoading(false);
    }
  };

  const fetchIngredients = async () => {
    try {
      const response = await ingredientApi.getAll(1, 1000);
      if (response.success && response.data) {
        setIngredients(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch ingredients", error);
    }
  };

  const fetchHistory = async (dishId: number, current = 1, pageSize = 10) => {
    try {
      const response = await dishApi.getHistory(dishId, current, pageSize);
      if (response.success && response.data) {
        setHistory(response.data.histories);
        setCurrentDishInfo({ name: response.data.dish.name, dishId });
        setHistoryPagination({
          current: response.current || current,
          pageSize: response.pageSize || pageSize,
          total: response.total || 0,
        });
        setHistoryVisible(true);
      } else {
        message.error(response.error?.message || "Failed to fetch history");
      }
    } catch (error) {
      message.error("Failed to fetch history");
    }
  };

  useEffect(() => {
    fetchDishes();
    fetchIngredients();
  }, []);

  const handleCreate = () => {
    setEditingDish(null);
    form.resetFields();
    form.setFieldsValue({ ingredients: [{}] });
    setModalVisible(true);
  };

  const handleEdit = async (dish: Dish) => {
    setEditingDish(dish);
    form.setFieldsValue({
      name: dish.name,
      ingredients: dish.ingredients.map((ing) => ({
        ingredientId: ing.ingredientId,
        ingredientAmount: ing.ingredientAmount,
      })),
    });
    setModalVisible(true);
  };

  const handleViewHistory = (dishId: number) => {
    setHistoryPagination({ current: 1, pageSize: 10, total: 0 });
    fetchHistory(dishId, 1, 10);
  };

  const handleDelete = async (id: number) => {
    try {
      message.info("Delete functionality requires backend support");
    } catch (error) {
      message.error("Failed to delete");
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      const ingredients = values.ingredients.filter(
        (ing: any) => ing.ingredientId && ing.ingredientAmount !== undefined
      );

      if (ingredients.length === 0) {
        message.error("Please add at least one ingredient");
        return;
      }

      if (editingDish) {
        // Check if current chef owns this dish
        const currentChef = auth.getCurrentChef();
        if (!currentChef || editingDish.chefId !== currentChef.id) {
          message.error("You can only update your own dishes");
          return;
        }

        // Update - chefId is automatically added from session storage
        const updateData: UpdateDishData = {
          name: values.name,
          ingredients: ingredients.map((ing: any) => ({
            ingredientId: ing.ingredientId,
            ingredientAmount: ing.ingredientAmount,
          })),
        };
        const response = await dishApi.update(editingDish.id, updateData);
        if (response.success) {
          message.success("Updated successfully");
          setModalVisible(false);
          fetchDishes(pagination.current, pagination.pageSize, searchKeyword);
        } else {
          // Check if it's an authorization error
          if (
            response.error?.code === "UNAUTHORIZED" ||
            response.error?.message?.includes("permission")
          ) {
            message.error("You do not have permission to modify this dish");
          } else {
            message.error(response.error?.message || "Failed to update");
          }
        }
      } else {
        // Create - chefId is automatically added from session storage
        const createData: CreateDishData = {
          name: values.name,
          ingredients: ingredients.map((ing: any) => ({
            ingredientId: ing.ingredientId,
            ingredientAmount: ing.ingredientAmount,
          })),
        };
        const response = await dishApi.create(createData);
        if (response.success) {
          message.success("Created successfully");
          setModalVisible(false);
          fetchDishes(pagination.current, pagination.pageSize, searchKeyword);
        } else {
          message.error(response.error?.message || "Failed to create");
        }
      }
    } catch (error) {
      console.error("Validation failed:", error);
    }
  };

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 80,
    },
    {
      title: "Dish Name",
      dataIndex: "name",
      key: "name",
      width: 120,
    },
    {
      title: "Chef",
      dataIndex: "chefName",
      key: "chefName",
      render: (text: string) => text || "-",
    },
    {
      title: "Version",
      dataIndex: "versionNumber",
      key: "versionNumber",
      width: 100,
      render: (version: number) => <Tag color="blue">v{version}</Tag>,
    },
    {
      title: "Ingredients",
      key: "ingredients",
      // render: (_: any, record: Dish) => record.ingredients.length,
      render: (_: any, record: Dish) => {
        return (record.ingredients as any[])
          .map((item: any) => {
            return `${item.ingredientName}: ${item.ingredientAmount} ${item.ingredientUnit}`;
          })
          .join(", ");
      },
    },
    {
      title: "Updated At",
      dataIndex: "updatedAt",
      key: "updatedAt",
      width: 180,
      render: (text: string) => new Date(text).toLocaleString("en-US"),
    },
    {
      title: "Actions",
      key: "action",
      width: 200,
      render: (_: any, record: Dish) => {
        const currentChef = auth.getCurrentChef();
        const canEdit = currentChef && record.chefId === currentChef.id;

        return (
          <Space>
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
              disabled={!canEdit}
              title={!canEdit ? "You can only edit your own dishes" : ""}
            >
              Edit
            </Button>
            <Button
              type="link"
              icon={<HistoryOutlined />}
              onClick={() => handleViewHistory(record.id)}
            >
              History
            </Button>
            <Popconfirm
              title="Are you sure you want to delete?"
              onConfirm={() => handleDelete(record.id)}
            >
              <Button
                type="link"
                danger
                icon={<DeleteOutlined />}
                disabled={!canEdit}
              >
                Delete
              </Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <div
        style={{
          marginBottom: 16,
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "center",
          width: "100%",
        }}
      >
        <Input.Search
          placeholder="Search by dish name or version number"
          value={searchKeyword}
          allowClear
          onChange={(e) => {
            const value = e.target.value;
            setSearchKeyword(value);
            if (!value) {
              fetchDishes(1, pagination.pageSize);
            }
          }}
          onSearch={(value) => {
            const keyword = value.trim();
            setSearchKeyword(keyword);
            fetchDishes(1, pagination.pageSize, keyword);
          }}
          style={{ maxWidth: 360 }}
        />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreate}
          style={{ marginLeft: "auto" }}
        >
          New Dish
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={dishes}
        rowKey="id"
        loading={loading}
        pagination={false}
        // expandable={{
        //   expandedRowRender: (record: Dish) => (
        //     <div style={{ padding: "16px 0" }}>
        //       <h4>Ingredients:</h4>
        //       <Space direction="vertical" style={{ width: "100%" }}>
        //         {record.ingredients.map((ing, index) => (
        //           <div key={index}>
        //             {ing.ingredientName} - {ing.ingredientAmount}{" "}
        //             {ing.ingredientUnit}
        //           </div>
        //         ))}
        //       </Space>
        //     </div>
        //   ),
        // }}
      />
      <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
        <Pagination
          current={pagination.current}
          pageSize={pagination.pageSize}
          total={pagination.total}
          onChange={(page, pageSize) => {
            fetchDishes(page, pageSize, searchKeyword);
          }}
          onShowSizeChange={(current, size) => {
            fetchDishes(current, size, searchKeyword);
          }}
          showSizeChanger
          showTotal={(total, range) =>
            `${range[0]}-${range[1]} of ${total} dishes`
          }
        />
      </div>

      <Modal
        title={editingDish ? "Edit Dish" : "New Dish"}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        okText="OK"
        cancelText="Cancel"
        width={800}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Dish Name"
            rules={[{ required: true, message: "Please enter dish name" }]}
          >
            <Input placeholder="Enter dish name" />
          </Form.Item>
          <Form.List name="ingredients">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Space
                    key={key}
                    style={{ display: "flex", marginBottom: 8 }}
                    align="baseline"
                  >
                    <Form.Item
                      {...restField}
                      name={[name, "ingredientId"]}
                      rules={[
                        {
                          required: true,
                          message: "Please select an ingredient",
                        },
                      ]}
                    >
                      <Select
                        placeholder="Select ingredient"
                        style={{ width: 200 }}
                        showSearch
                        filterOption={(input, option) =>
                          (option?.children
                            ? (option?.children[0] as string)
                            : ""
                          )
                            ?.toLowerCase()
                            .includes(input.toLowerCase())
                        }
                      >
                        {ingredients.map((ing) => (
                          <Option key={ing.id} value={ing.id}>
                            {ing.name} ({ing.unit})
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, "ingredientAmount"]}
                      rules={[
                        { required: true, message: "Please enter amount" },
                        {
                          type: "number",
                          min: 0,
                          message: "Amount must be greater than or equal to 0",
                        },
                      ]}
                    >
                      <InputNumber
                        placeholder="Amount"
                        style={{ width: 150 }}
                        min={0}
                        step={0.1}
                      />
                    </Form.Item>
                    <Button
                      type="link"
                      danger
                      onClick={() => remove(name)}
                      disabled={fields.length === 1}
                    >
                      Remove
                    </Button>
                  </Space>
                ))}
                <Form.Item>
                  <Button
                    type="dashed"
                    onClick={() => add()}
                    block
                    icon={<PlusOutlined />}
                  >
                    Add Ingredient
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>

      <Drawer
        title={`Dish History - ${currentDishInfo?.name || ""}`}
        placement="right"
        onClose={() => {
          setHistoryVisible(false);
          setCurrentDishInfo(null);
          setHistoryPagination({ current: 1, pageSize: 10, total: 0 });
        }}
        open={historyVisible}
        width={600}
      >
        <Timeline>
          {history.map((version, index) => (
            <Timeline.Item key={index} color="blue">
              <div>
                <Tag color="blue">Version {version.versionNumber}</Tag>
              </div>
              <div style={{ marginTop: 8 }}>
                {version.ingredients.map((ing, idx) => (
                  <div key={idx} style={{ marginLeft: 24, marginTop: 4 }}>
                    {ing.ingredientName} - {ing.ingredientAmount}{" "}
                    {ing.ingredientUnit}
                  </div>
                ))}
              </div>
            </Timeline.Item>
          ))}
        </Timeline>
        {historyPagination.total > 0 && (
          <div style={{ marginTop: 24, textAlign: "center" }}>
            <Pagination
              current={historyPagination.current}
              pageSize={historyPagination.pageSize}
              total={historyPagination.total}
              onChange={(page, pageSize) => {
                if (currentDishInfo) {
                  fetchHistory(currentDishInfo.dishId, page, pageSize);
                }
              }}
              onShowSizeChange={(current, size) => {
                if (currentDishInfo) {
                  fetchHistory(currentDishInfo.dishId, current, size);
                }
              }}
              showSizeChanger
              showTotal={(total, range) =>
                `${range[0]}-${range[1]} of ${total} versions`
              }
            />
          </div>
        )}
      </Drawer>
    </div>
  );
}
