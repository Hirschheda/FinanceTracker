import React, { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import axios from "axios";
import { useAuth } from "react-oidc-context";
import { Card, Button, Table, Statistic, Row, Col, message, Modal, Form, InputNumber, DatePicker, Select, Switch } from 'antd';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import { RightOutlined, SettingOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';

const COLORS = [
  "#0088FE", // Blue
  "#00C49F", // Teal
  "#FFBB28", // Yellow
  "#FF8042", // Orange
  "#8884D8", // Purple
  "#82CA9D", // Green
  "#FF6B6B", // Red
  "#4ECDC4"  // Turquoise
];


const api = axios.create({
  baseURL: "<insert-url-here>",
  headers: {
    'Content-Type': 'application/json',
  }
});

export default function Dashboard() {
  const auth = useAuth();
  const userEmail = auth.user?.profile?.email;

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light';
  });
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);

  useEffect(() => {
    document.body.classList.toggle('dark-theme', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  // New state for selected category filter from pie chart
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [form, setForm] = useState({ amount: "", category: "", date: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editTransaction, setEditTransaction] = useState(null);
  const [editForm] = Form.useForm();

  // Helper to sort transactions by date descending
  const sortByDateDesc = (arr) =>
    arr.slice().sort((a, b) => new Date(b.date) - new Date(a.date));

  // Fetch transactions when component mounts or email changes
  useEffect(() => {
    const fetchTransactions = async () => {
      if (!userEmail) return;
      setIsLoading(true);
      setError(null);
      try {
        const response = await api.get(`/transactions?email=${encodeURIComponent(userEmail)}`);
        setTransactions(sortByDateDesc(response.data));
      } catch (err) {
        setError('Failed to load transactions. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchTransactions();
  }, [userEmail]);

  if (auth.isLoading || isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f6fa' }}>
        <div style={{ fontSize: 24, color: '#1677ff', fontWeight: 600 }}>Loading transactions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f6fa' }}>
        <Card style={{ color: '#cf1322', fontSize: 18 }}>{error}</Card>
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f6fa' }}>
        <Card style={{ color: '#1677ff', fontSize: 18 }}>Please sign in to view your transactions.</Card>
      </div>
    );
  }

  const income = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
  const expenses = transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0);
  const balance = income + expenses;

  const categoryData = Object.entries(
    transactions
      .filter(t => t.amount < 0)
      .reduce((acc, t) => {
        const key = t.category || "Other";
        acc[key] = acc[key] || 0;
        acc[key] += Math.abs(t.amount);
        return acc;
      }, {})
  ).map(([name, value]) => ({ name, value }));

  // Derived array: either all transactions or only those matching selectedCategory
  const filteredTransactions = selectedCategory
    ? transactions.filter(t => t.category === selectedCategory)
    : transactions;
  // Number of pages for pagination
  const totalPages = Math.ceil(filteredTransactions.length / 5);

  const addOrEditTransaction = async (e) => {
    e.preventDefault();
    if (!userEmail) return;
    let amt = Math.abs(parseFloat(form.amount));
    if (form.category !== "Salary") amt = -amt;
    const transactionData = {
      id: Date.now().toString(),
      amount: amt,
      category: form.category,
      date: form.date,
    };
    try {
      await api.post("/transactions", { ...transactionData, email: userEmail });
      setTransactions(sortByDateDesc([transactionData, ...transactions]));
      message.success('Transaction added!');
      setForm({ amount: "", category: "", date: "" });
    } catch (err) {
      message.error("Failed to save transaction");
    }
  };

  const deleteTransaction = async (id) => {
    if (!userEmail) return;
    if (!window.confirm("Are you sure you want to delete this transaction?")) return;
    try {
      await api.delete(`/transactions`, { data: { id, email: userEmail } });
      setTransactions(sortByDateDesc(transactions.filter(tx => tx.id !== id)));
      message.success('Transaction deleted!');
    } catch (err) {
      message.error("Failed to delete transaction. Check console for details.");
    }
  };

  const openEditModal = (tx) => {
    setEditTransaction(tx);
    editForm.setFieldsValue({
      amount: Math.abs(tx.amount),
      category: tx.category,
      date: dayjs(tx.date),
    });
    setIsEditModalVisible(true);
  };
  const closeEditModal = () => {
    setIsEditModalVisible(false);
    setEditTransaction(null);
    editForm.resetFields();
  };

  // Ant Design Table columns
  const columns = [
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amt) => (
        <span style={{ color: amt < 0 ? '#cf1322' : '#3f8600', fontWeight: 600 }}>
          {amt < 0 ? '-' : '+'}${Math.abs(amt).toFixed(2)}
        </span>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      sorter: (a, b) => new Date(a.date) - new Date(b.date),
      defaultSortOrder: 'descend',
      width: 150,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, t) => (
        <>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => openEditModal(t)}
          />
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => deleteTransaction(t.id)}
          />
        </>
      ),
    },
  ];

  // bump row height to better fill available vertical space
  const tableComponents = {
    body: {
      row: props => <tr {...props} style={{ height: 48 }} />,
      // increase padding inside each cell
      cell: props => <td {...props} style={{ padding: '12px 16px' }} />,
    },
  };

  return (
    <div style={{ background: '#f5f6fa', minHeight: '100vh', padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 20, fontWeight: 500, color: '#1677ff' }}>
          Welcome, {auth.user?.profile?.name}
        </div>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <span style={{ fontSize: 28, fontWeight: 700, color: '#1677ff' }}>
            Finance 💵 Tracker
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link to="/investments">
            <Button
              type="default"
              icon={<RightOutlined />}
              style={{
                borderRadius: 6,
                padding: '4px 12px',
                border: '1px solid rgba(0, 0, 0, 0.15)',
                fontWeight: 500,
                color: '#1677ff'
              }}
            >
              Investments
            </Button>
          </Link>
          <Button
            type="text"
            icon={<SettingOutlined />}
            onClick={() => setIsSettingsVisible(true)}
            style={{ fontSize: 20 }}
          />
          <Button
            type="primary"
            size="large"
            style={{ fontWeight: 600 }}
            danger
            onClick={() => {
              auth.removeUser();
              window.location.href = window.location.origin;
            }}
          >
            Sign out
          </Button>
        </div>
      </div>

      {/* Add Transaction Form */}
      <Card style={{ marginBottom: 24 }}>
        <form onSubmit={addOrEditTransaction} style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'end' }}>
          <input
            type="number"
            placeholder="Amount"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            style={{ flex: 1, padding: 8, borderRadius: 6, border: '1px solid #d9d9d9' }}
            min="0.01"
            step="0.01"
            required
          />
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            style={{ flex: 1, padding: 8, borderRadius: 6, border: '1px solid #d9d9d9' }}
            required
          >
            <option value="" disabled>Select Category</option>
            <option value="Food">Food</option>
            <option value="Rent">Rent</option>
            <option value="Utilities">Utilities</option>
            <option value="Entertainment">Entertainment</option>
            <option value="Travel">Travel</option>
            <option value="Shopping">Shopping</option>
            <option value="Health">Health</option>
            <option value="Salary">Salary</option>
            <option value="Other">Other Transactions</option>
          </select>
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            style={{ flex: 1, padding: 8, borderRadius: 6, border: '1px solid #d9d9d9' }}
            required
          />
          <Button
            type="primary"
            htmlType="submit"
            style={{ fontWeight: 600, minWidth: 140 }}
          >
            Add
          </Button>
        </form>
      </Card>

      {/* Summary Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} md={8}>
          <Card>
            <Statistic title="Total Income" value={income} precision={2} valueStyle={{ color: '#3f8600' }} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic title="Total Expenses" value={Math.abs(expenses)} precision={2} valueStyle={{ color: '#cf1322' }} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic title="Net Balance" value={balance} precision={2} valueStyle={{ color: '#1677ff' }} />
          </Card>
        </Col>
      </Row>

      {/* Main Content */}
      <Row gutter={16} align="stretch">
        <Col xs={24} md={12}>
          <Card
            title="Expense Breakdown"
            style={{ marginBottom: 24, height: 480, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
            bodyStyle={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 0 }}
          >
            <div style={{ width: '100%', height: 400, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <PieChart width={400} height={400}>
                <Pie
                  data={categoryData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={150}
                  fill="#8884d8"
                  label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                >
                  {categoryData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                      cursor="pointer"
                      onClick={() => setSelectedCategory(entry.name)}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </div>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card
            title="Recent Transactions"
            style={{
              marginBottom: 24,
              height: 480,              // match the pie chart card height
              display: 'flex',
              flexDirection: 'column',
            }}
            bodyStyle={{ flex: 1, padding: 0, display: 'flex', flexDirection: 'column' }}
          >
            {/* Show clear filter button and filtering message if a category is selected */}
            {selectedCategory && (
              <div style={{
                marginBottom: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <Button type="link" onClick={() => {
                  setSelectedCategory(null);
                  setCurrentPage(1);
                }}>
                  Clear filter: {selectedCategory}
                </Button>
                <span style={{ fontStyle: 'italic', color: '#555' }}>
                  Showing only {selectedCategory} transactions
                </span>
              </div>
            )}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              paddingLeft: 16,
              paddingRight: 16    // ensure space at right edge
            }}>
              <Table
                components={tableComponents}
                dataSource={filteredTransactions}
                columns={columns}
                rowKey="id"
                pagination={{
                  current: currentPage,
                  pageSize: 5,
                  total: filteredTransactions.length,
                  size: 'default',
                  onChange: (page) => setCurrentPage(page),
                  // Custom pagination: show first, last, and currentPage (disabled) only
                  itemRender: (page, type, originalElement) => {
                    // Prev arrow: go to page-1 (clamped)
                    if (type === 'prev') {
                      return React.cloneElement(originalElement, {
                        onClick: () => setCurrentPage(p => Math.max(p - 1, 1))
                      });
                    }
                    // Next arrow: go to page+1 (clamped)
                    if (type === 'next') {
                      return React.cloneElement(originalElement, {
                        onClick: () => setCurrentPage(p => Math.min(p + 1, totalPages))
                      });
                    }
                    // Page buttons:
                    // - Always show first and last page
                    if (type === 'page') {
                      if (page === 1 || page === totalPages) {
                        return originalElement;
                      }
                      // for intermediate pages, only render the one matching currentPage
                      if (page === currentPage) {
                        return React.cloneElement(originalElement, { disabled: true });
                      }
                      return null; // hide all other intermediate pages
                    }
                    return originalElement;
                  },
                }}
              />
            </div>
          </Card>
          <Modal
            title="Edit Transaction"
            visible={isEditModalVisible}
            onCancel={closeEditModal}
            onOk={() => {
              editForm.validateFields().then(values => {
                const amt = values.category === 'Salary'
                  ? Math.abs(values.amount)
                  : -Math.abs(values.amount);
                const updated = {
                  id: editTransaction.id,
                  amount: amt,
                  category: values.category,
                  date: values.date.format('YYYY-MM-DD'),
                };
                api.patch('/transactions', { ...updated, email: userEmail })
                  .then(() => {
                    setTransactions(txns =>
                      sortByDateDesc(txns.map(tx => tx.id === updated.id ? updated : tx))
                    );
                    message.success('Transaction updated!');
                    closeEditModal();
                  })
                  .catch(() => {
                    message.error('Failed to update transaction');
                  });
              });
            }}
            okText="Update"
            cancelText="Cancel"
          >
            <Form form={editForm} layout="vertical">
              <Form.Item name="amount" label="Amount" rules={[{ required: true }]}>
                <InputNumber min={0.01} step={0.01} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="category" label="Category" rules={[{ required: true }]}>
                <Select>
                  <Select.Option value="Food">Food</Select.Option>
                  <Select.Option value="Rent">Rent</Select.Option>
                  <Select.Option value="Utilities">Utilities</Select.Option>
                  <Select.Option value="Entertainment">Entertainment</Select.Option>
                  <Select.Option value="Travel">Travel</Select.Option>
                  <Select.Option value="Shopping">Shopping</Select.Option>
                  <Select.Option value="Health">Health</Select.Option>
                  <Select.Option value="Salary">Salary</Select.Option>
                  <Select.Option value="Other">Other Transactions</Select.Option>
                </Select>
              </Form.Item>
              <Form.Item name="date" label="Date" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Form>
          </Modal>
        </Col>
      </Row>
      <Modal
        title="Settings"
        visible={isSettingsVisible}
        onCancel={() => setIsSettingsVisible(false)}
        footer={null}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px' }}>
          <span>Dark theme</span>
          <Switch
            checked={theme === 'dark'}
            onChange={checked => setTheme(checked ? 'dark' : 'light')}
          />
        </div>
      </Modal>
    </div>
  );
}