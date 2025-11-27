"use client";

import { useState, useEffect } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  message,
  Space,
  Popconfirm,
  Pagination,
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import {
  ingredientApi,
  type Ingredient,
  type CreateIngredientData,
  type UpdateIngredientData,
} from "@/lib/api-client";

export default function IngredientsPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(
    null
  );
  const [form] = Form.useForm();
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [searchKeyword, setSearchKeyword] = useState("");

  const fetchIngredients = async (
    current = 1,
    pageSize = 10,
    keyword = searchKeyword
  ) => {
    const normalizedKeyword = keyword?.trim() || undefined;
    setLoading(true);
    try {
      const response = await ingredientApi.getAll(
        current,
        pageSize,
        normalizedKeyword
      );
      if (response.success && response.data) {
        setIngredients(response.data);
        setPagination({
          current: response.current || current,
          pageSize: response.pageSize || pageSize,
          total: response.total || 0,
        });
      } else {
        message.error(response.error?.message || "Failed to fetch ingredients");
      }
    } catch (error) {
      message.error("Failed to fetch ingredients");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIngredients();
  }, []);

  const handleCreate = () => {
    setEditingIngredient(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (ingredient: Ingredient) => {
    setEditingIngredient(ingredient);
    form.setFieldsValue({
      name: ingredient.name,
      unit: ingredient.unit,
    });
    setModalVisible(true);
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

      if (editingIngredient) {
        // Update
        const updateData: UpdateIngredientData = {
          name: values.name,
          unit: values.unit,
        };
        const response = await ingredientApi.update(
          editingIngredient.id,
          updateData
        );
        if (response.success) {
          message.success("Updated successfully");
          setModalVisible(false);
          fetchIngredients(
            pagination.current,
            pagination.pageSize,
            searchKeyword
          );
        } else {
          message.error(response.error?.message || "Failed to update");
        }
      } else {
        // Create
        const createData: CreateIngredientData = {
          name: values.name,
          unit: values.unit,
        };
        const response = await ingredientApi.create(createData);
        if (response.success) {
          message.success("Created successfully");
          setModalVisible(false);
          fetchIngredients(
            pagination.current,
            pagination.pageSize,
            searchKeyword
          );
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
      title: "Name",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Unit",
      dataIndex: "unit",
      key: "unit",
      width: 100,
    },
    {
      title: "Created At",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 200,
      render: (text: string) => new Date(text).toLocaleString("en-US"),
    },
    {
      title: "Updated At",
      dataIndex: "updatedAt",
      key: "updatedAt",
      width: 200,
      render: (text: string) => new Date(text).toLocaleString("en-US"),
    },
    {
      title: "Actions",
      key: "action",
      width: 150,
      render: (_: any, record: Ingredient) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Are you sure you want to delete?"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
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
          placeholder="Search by name or unit"
          value={searchKeyword}
          allowClear
          onChange={(e) => {
            const value = e.target.value;
            setSearchKeyword(value);
            if (!value) {
              fetchIngredients(1, pagination.pageSize);
            }
          }}
          onSearch={(value) => {
            const keyword = value.trim();
            setSearchKeyword(keyword);
            fetchIngredients(1, pagination.pageSize, keyword);
          }}
          style={{ maxWidth: 320 }}
        />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreate}
          style={{ marginLeft: "auto" }}
        >
          New Ingredient
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={ingredients}
        rowKey="id"
        loading={loading}
        pagination={false}
      />
      <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
        <Pagination
          current={pagination.current}
          pageSize={pagination.pageSize}
          total={pagination.total}
          onChange={(page, pageSize) => {
            fetchIngredients(page, pageSize, searchKeyword);
          }}
          onShowSizeChange={(current, size) => {
            fetchIngredients(current, size, searchKeyword);
          }}
          showSizeChanger
          showTotal={(total, range) =>
            `${range[0]}-${range[1]} of ${total} ingredients`
          }
        />
      </div>

      <Modal
        title={editingIngredient ? "Edit Ingredient" : "New Ingredient"}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        okText="OK"
        cancelText="Cancel"
        width={600}
      >
        <Form
          form={form}
          layout="horizontal"
          labelCol={{ span: 6 }}
          wrapperCol={{ span: 18 }}
        >
          <Form.Item
            name="name"
            label="Name"
            rules={[
              { required: true, message: "Please enter ingredient name" },
            ]}
          >
            <Input placeholder="Enter ingredient name" />
          </Form.Item>
          <Form.Item
            name="unit"
            label="Unit"
            rules={[{ required: true, message: "Please enter unit" }]}
          >
            <Input placeholder="e.g., g, kg, pcs" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
