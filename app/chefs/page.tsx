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
import { chefApi, type Chef, type UpdateChefData } from "@/lib/api-client";

export default function ChefsPage() {
  const [chefs, setChefs] = useState<Chef[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingChef, setEditingChef] = useState<Chef | null>(null);
  const [form] = Form.useForm();
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [searchKeyword, setSearchKeyword] = useState("");

  const fetchChefs = async (
    current = 1,
    pageSize = 10,
    keyword = searchKeyword
  ) => {
    const normalizedKeyword = keyword?.trim() || undefined;
    setLoading(true);
    try {
      const response = await chefApi.getAll(
        current,
        pageSize,
        normalizedKeyword
      );
      if (response.success && response.data) {
        setChefs(response.data);
        setPagination({
          current: response.current || current,
          pageSize: response.pageSize || pageSize,
          total: response.total || 0,
        });
      } else {
        message.error(response.error?.message || "Failed to fetch chefs");
      }
    } catch (error) {
      message.error("Failed to fetch chefs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChefs();
  }, []);

  const handleCreate = () => {
    setEditingChef(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (chef: Chef) => {
    setEditingChef(chef);
    form.setFieldsValue({
      name: chef.name,
      username: chef.username,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      // Note: Delete endpoint is not available, can be added if needed
      message.info("Delete functionality requires backend support");
    } catch (error) {
      message.error("Failed to delete");
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (editingChef) {
        // Update
        const updateData: UpdateChefData = { name: values.name };
        const response = await chefApi.update(editingChef.id, updateData);
        if (response.success) {
          message.success("Updated successfully");
          setModalVisible(false);
          fetchChefs(pagination.current, pagination.pageSize, searchKeyword);
        } else {
          message.error(response.error?.message || "Failed to update");
        }
      } else {
        // Create
        if (!values.password) {
          message.error("Please enter password");
          return;
        }
        // Remove confirmPassword from values before submitting
        const { confirmPassword, ...createData } = values;
        const response = await chefApi.create(createData);
        if (response.success) {
          message.success("Created successfully");
          setModalVisible(false);
          fetchChefs(pagination.current, pagination.pageSize, searchKeyword);
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
      title: "Username",
      dataIndex: "username",
      key: "username",
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
      render: (_: any, record: Chef) => (
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
          placeholder="Search by name or username"
          value={searchKeyword}
          allowClear
          onChange={(e) => {
            const value = e.target.value;
            setSearchKeyword(value);
            if (!value) {
              fetchChefs(1, pagination.pageSize);
            }
          }}
          onSearch={(value) => {
            const keyword = value.trim();
            setSearchKeyword(keyword);
            fetchChefs(1, pagination.pageSize, keyword);
          }}
          style={{ maxWidth: 320 }}
        />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreate}
          style={{ marginLeft: "auto" }}
        >
          New Chef
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={chefs}
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
            fetchChefs(page, pageSize, searchKeyword);
          }}
          onShowSizeChange={(current, size) => {
            fetchChefs(current, size, searchKeyword);
          }}
          showSizeChanger
          showTotal={(total, range) =>
            `${range[0]}-${range[1]} of ${total} chefs`
          }
        />
      </div>

      <Modal
        title={editingChef ? "Edit Chef" : "New Chef"}
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
            name="username"
            label="Username"
            rules={[{ required: true, message: "Please enter username" }]}
          >
            <Input placeholder="Enter username" readOnly={!!editingChef} />
          </Form.Item>
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: "Please enter name" }]}
          >
            <Input placeholder="Enter name" />
          </Form.Item>
          {!editingChef && (
            <>
              <Form.Item
                name="password"
                label="Password"
                rules={[
                  { required: true, message: "Please enter password" },
                  { len: 6, message: "Password must be at least 6 characters" },
                ]}
              >
                <Input.Password placeholder="Enter password" />
              </Form.Item>
              <Form.Item
                name="confirmPassword"
                label="Confirm Password"
                dependencies={["password"]}
                rules={[
                  { required: true, message: "Please confirm password" },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue("password") === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(
                        new Error("The two passwords do not match")
                      );
                    },
                  }),
                ]}
              >
                <Input.Password placeholder="Confirm password" />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>
    </div>
  );
}
