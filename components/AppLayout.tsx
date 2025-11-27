"use client";

import { Layout, Menu, Button, Dropdown, Space } from "antd";
import {
  UserOutlined,
  ShoppingOutlined,
  AppstoreOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useState, useEffect } from "react";
import { auth } from "@/lib/auth";
import type { MenuProps } from "antd";

const { Header, Content, Sider } = Layout;

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentChef, setCurrentChef] = useState(auth.getCurrentChef());

  useEffect(() => {
    // Update current chef when it changes
    const chef = auth.getCurrentChef();
    setCurrentChef(chef);
  }, [pathname]);

  // Don't show layout on login page
  if (pathname === "/login") {
    return <>{children}</>;
  }

  const menuItems = [
    {
      key: "/chefs",
      icon: <UserOutlined />,
      label: "Chef Management",
    },
    {
      key: "/ingredients",
      icon: <ShoppingOutlined />,
      label: "Ingredient Management",
    },
    {
      key: "/dishes",
      icon: <AppstoreOutlined />,
      label: "Dish Management",
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    router.push(key);
  };

  const handleLogout = () => {
    auth.clearCurrentChef();
    router.push("/login");
  };

  const userMenuItems: MenuProps["items"] = [
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Logout",
      onClick: handleLogout,
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider collapsible width={300}>
        <div
          style={{
            height: 32,
            margin: 16,
            background: "rgba(255, 255, 255, 0.3)",
          }}
        />
        <Menu
          theme="dark"
          selectedKeys={[pathname]}
          mode="inline"
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            padding: "0 24px",
            background: "#fff",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h1 style={{ margin: 0, lineHeight: "64px", fontSize: "20px" }}>
            Dish Management System
          </h1>
          <Space>
            {currentChef && (
              <span style={{ marginRight: 16 }}>
                Welcome, <strong>{currentChef.name}</strong>
              </span>
            )}
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Button type="text" icon={<UserOutlined />}>
                {currentChef?.name || "User"}
              </Button>
            </Dropdown>
          </Space>
        </Header>
        <Content
          style={{
            margin: "24px 16px",
            padding: 24,
            background: "#fff",
            minHeight: 280,
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
