// src/pages/Investments.jsx
import React, { useState, useEffect } from 'react';
import {
  Card,
  Input,
  Button,
  Table,
  message,
  Modal,
  Form,
  InputNumber,
  DatePicker
} from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
  DollarOutlined,
  LeftOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { useAuth } from "react-oidc-context";
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { Typography } from 'antd';

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const api = axios.create({
  baseURL: "<insert-url-here>",
  headers: { 'Content-Type': 'application/json' }
});

// Finnhub API key (replace with your own key)
const FINNHUB_API_KEY = 'insert-key-here';

const { Title } = Typography;

const axiosWithTimeout = (url, timeout = 8000) =>
  Promise.race([
    axios.get(url),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timed out')), timeout)
    )
  ]);

// Fetch current price for a single stock (for search results)
const fetchStockPrice = async (symbol) => {
  try {
    const response = await axios.get(
      `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`
    );
    if (response.data && response.data.c) {
      return {
        price: response.data.c,
        change: response.data.d,
        changePercent: response.data.dp
      };
    }
    return null;
  } catch (err) {
    console.error('Error fetching stock price from Finnhub:', err);
    return null;
  }
};

// Fetch current prices for all portfolio symbols
const fetchCurrentPrices = async (symbols) => {
  const prices = {};
  await Promise.all(symbols.map(async (symbol) => {
    try {
      const response = await axios.get(
        `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`
      );
      if (response.data && response.data.c) {
        prices[symbol] = response.data.c;
      }
    } catch (err) {
      prices[symbol] = null;
    }
  }));
  return prices;
};

export default function Investments() {
  const navigate = useNavigate();
  const auth = useAuth();
  const userEmail = auth.user?.profile?.email;
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchResultsWithPrices, setSearchResultsWithPrices] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [currentPrices, setCurrentPrices] = useState({});
  const [priceUpdateTime, setPriceUpdateTime] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [priceLoading, setPriceLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);
  const [form] = Form.useForm();
  const [searchLoading, setSearchLoading] = useState(false);
  const [editInvestment, setEditInvestment] = useState(null);

  // Chart time range: '1W', '1M', 'YTD', '1Y'
  const [selectedRange, setSelectedRange] = useState('1M');

  // Calculate total profit or loss across all positions
  const totalPL = portfolio.reduce((sum, inv) => {
    const cp = currentPrices[inv.symbol];
    if (cp == null) return sum;
    return sum + (cp - inv.purchasePrice) * inv.shares;
  }, 0);
  const isPLPositive = totalPL >= 0;

  // Calculate total amount invested across all positions
  const totalInvested = portfolio.reduce(
    (sum, inv) => sum + inv.purchasePrice * inv.shares,
    0
  );

  // Calculate total current market value of all positions
  const totalCurrentValue = portfolio.reduce((sum, inv) => {
    const cp = currentPrices[inv.symbol];
    if (cp == null) return sum;
    return sum + cp * inv.shares;
  }, 0);

  // total pages for investments pagination (4 items per page)
  const totalPages = Math.ceil(portfolio.length / 4);
  // pagination state for investments table
  const [currentPage, setCurrentPage] = useState(1);

  // Build time-series data: sum invested at each purchase date, plus current value at today
  const chartData = (() => {
    const map = {};
    // initial invested values by purchase date
    portfolio.forEach(inv => {
      map[inv.purchaseDate] = (map[inv.purchaseDate] || 0) + inv.purchasePrice * inv.shares;
    });
    // current value at today
    const today = new Date().toISOString().slice(0, 10);
    map[today] = totalCurrentValue;
    // convert to sorted array
    return Object.entries(map)
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  })();

  // Filter chart data by selected time range
  const filteredChartData = chartData.filter(pt => {
    const d = dayjs(pt.date);
    const now = dayjs();
    switch (selectedRange) {
      case '1W': return d.isAfter(now.subtract(1, 'week'));
      case '1M': return d.isAfter(now.subtract(1, 'month'));
      case 'YTD': return d.isAfter(now.startOf('year'));
      case '1Y': return d.isAfter(now.subtract(1, 'year'));
      default: return true;
    }
  });

  // Fetch portfolio when component mounts
  useEffect(() => {
    const fetchPortfolio = async () => {
      if (!userEmail) {
        console.log('User email not available, skipping portfolio fetch.');
        setIsLoading(false); // Ensure loading state is reset if no user email
        return;
      }
      setIsLoading(true);
      console.log('Fetching portfolio for user:', userEmail); // Debug log
      try {
        const response = await api.get(`/investments?email=${encodeURIComponent(userEmail)}`);
        console.log('Portfolio API response:', response.data); // Debug log
        setPortfolio(response.data);
      } catch (err) {
        console.error('Error loading portfolio:', err); // Debug log
        console.error('Portfolio error details:', err.response?.data || err.message); // Debug log
        message.error('Failed to load portfolio. Please ensure the backend is running and reachable.');
        setPortfolio([]); // Clear portfolio on error to prevent stale data
      } finally {
        setIsLoading(false); // Ensure loading state is always reset
      }
    };
    fetchPortfolio();
  }, [userEmail]);

  // Update current prices whenever portfolio changes
  useEffect(() => {
    const updatePrices = async () => {
      if (!portfolio.length) return;
      setPriceLoading(true);
      const symbols = [...new Set(portfolio.map(p => p.symbol))];
      const prices = await fetchCurrentPrices(symbols);
      setCurrentPrices(prices);
      setPriceUpdateTime(new Date());
      setPriceLoading(false);
    };
    updatePrices();
    const iv = setInterval(updatePrices, 5 * 60 * 1000);
    return () => clearInterval(iv);
  }, [portfolio]);

  // Search stocks using Finnhub API
  const searchStocks = async () => {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    try {
      const response = await axiosWithTimeout(
        `https://finnhub.io/api/v1/search?q=${searchQuery}&token=${FINNHUB_API_KEY}`
      );
      if (response.data.result && response.data.result.length > 0) {
        const resultsWithPrices = await Promise.all(
          response.data.result.map(async (stock) => {
            try {
              const priceData = await fetchStockPrice(stock.symbol);
              return { ...stock, priceData };
            } catch (e) {
              return { ...stock, priceData: null };
            }
          })
        );
        setSearchResultsWithPrices(resultsWithPrices);
        setSearchResults(response.data.result);
      } else {
        message.info('No stocks found matching your search. Please try a different query.');
        setSearchResults([]);
        setSearchResultsWithPrices([]);
      }
    } catch (err) {
      console.error('SearchStocks function error:', err);
      message.error('Failed to search stocks. Please check your API key and try again.');
      setSearchResults([]);
      setSearchResultsWithPrices([]);
    } finally {
      setSearchLoading(false);
      console.log('Search loading state reset');
    }
  };

  // Open modal to add a given stock
  const openAddModal = (stock) => {
    const stockToAdd = {
      symbol: stock.symbol,
      name: stock.description
    };
    setSelectedStock(stockToAdd);
    form.setFieldsValue({ symbol: stockToAdd.symbol });
    setIsModalVisible(true);
  };

  // Add or update investment via POST or PATCH
  const handleAddToPortfolio = async (values) => {
    const payload = {
      email: userEmail,
      symbol: values.symbol,
      shares: values.shares,
      purchasePrice: values.purchasePrice,
      purchaseDate: values.purchaseDate.format
        ? values.purchaseDate.format("YYYY-MM-DD")
        : values.purchaseDate, // if you switched to string input
    };

    try {
      if (editInvestment) {
        // PATCH existing investment
        await api.patch("/investments", { ...payload, id: editInvestment.id });
        setPortfolio(prev =>
          prev.map(inv =>
            inv.id === editInvestment.id ? { ...inv, ...payload } : inv
          )
        );
        message.success("Investment updated");
      } else {
        // POST new investment
        const res = await api.post("/investments", payload);
        const newId = res.data.item?.id || Date.now().toString();
        setPortfolio(prev => [...prev, { ...payload, id: newId }]);
        message.success("Investment added");
      }
      // cleanup
      setIsModalVisible(false);
      setEditInvestment(null);
      setSelectedStock(null);
      form.resetFields();
    } catch (err) {
      console.error(err);
      message.error(editInvestment ? "Failed to update investment" : "Failed to add investment");
    }
  };

  // Sell investment: record sale as income and remove from portfolio
  const handleSellInvestment = async (investment) => {
    if (!window.confirm("Are you sure you want to sell this investment?")) return;
    // Calculate sale proceeds
    const cp = currentPrices[investment.symbol];
    const saleValue = cp * investment.shares;
    const saleDate = dayjs().format("YYYY-MM-DD");
    try {
      // Record transaction as Salary
      await api.post("/transactions", {
        email: userEmail,
        amount: saleValue,
        category: "Salary",
        date: saleDate,
      });
      message.success("Sale recorded as income");
    } catch (err) {
      console.error("Error recording sale transaction:", err);
      message.error("Failed to record sale as transaction");
    }
    try {
      // Remove the investment
      await api.delete("/investments", { data: { email: userEmail, id: investment.id } });
      setPortfolio(prev => prev.filter(inv => inv.id !== investment.id));
      message.success("Investment sold");
    } catch (err) {
      console.error("Error deleting investment:", err);
      message.error("Failed to remove investment");
    }
  };

  // Table row and cell components with custom styles
  const tableComponents = {
    body: {
      row: props => <tr {...props} style={{ height: 20 }} />,
      cell: props => <td {...props} style={{ padding: '4px 6px' }} />,
    },
    header: {
      cell: props => (
        <th
          {...props}
          style={{
            padding: '4px 6px',
            height: 24,
            lineHeight: '24px'
          }}
        />
      ),
    },
  };

  // Table columns
  const columns = [
    { title: "Symbol", dataIndex: "symbol", key: "symbol", width: 120 },
    {
      title: "Purchase Price",
      dataIndex: "purchasePrice",
      key: "purchasePrice",
      render: p => `$${p.toFixed(2)}`,
      width: 130,
    },
    {
      title: "Purchase Date",
      dataIndex: "purchaseDate",
      key: "purchaseDate",
      sorter: (a, b) => new Date(a.purchaseDate) - new Date(b.purchaseDate),
      defaultSortOrder: 'descend',
      width: 150, // increased column width
    },
    {
      title: "Current Price",
      key: "currentPrice",
      render: (_, r) => {
        if (priceLoading) return "Loading...";
        const cp = currentPrices[r.symbol];
        return cp == null ? "N/A" : `$${cp.toFixed(2)}`;
      },
      width: 130,
    },
    {
      title: "P/L",
      key: "pl",
      render: (_, r) => {
        const cp = currentPrices[r.symbol];
        if (cp == null) return "N/A";
        const pl = (cp - r.purchasePrice) * r.shares;
        const sign = pl >= 0 ? "+" : "-";
        const clr = pl >= 0 ? "#3f8600" : "#cf1322";
        return <span style={{ color: clr }}>{sign}${Math.abs(pl).toFixed(2)}</span>;
      },
      width: 110,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEditInvestment(record)}
          />
          <Button
            type="text"
            icon={<DollarOutlined />}
            onClick={() => handleSellInvestment(record)}
          />
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteInvestment(record)}
          />
        </>
      ),
      width: 110,
    }
  ];

  const handleEditInvestment = (investment) => {
    setEditInvestment(investment);
    setIsModalVisible(true);
    form.setFieldsValue({
      symbol: investment.symbol,
      shares: investment.shares,
      purchasePrice: investment.purchasePrice,
      purchaseDate: dayjs ? dayjs(investment.purchaseDate) : investment.purchaseDate,
    });
  };

  const handleDeleteInvestment = async (investment) => {
    if (!window.confirm("Are you sure you want to delete this investment?")) return;
    try {
      await api.delete('/investments', { data: { id: investment.id, email: userEmail } });
      setPortfolio(portfolio.filter(inv => inv.id !== investment.id));
      message.success('Investment deleted!');
    } catch (err) {
      message.error('Failed to delete investment.');
    }
  };

  return (
    <div style={{ background: "#f5f6fa", minHeight: "100vh", padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={1} style={{ margin: 0 }}>Investments</Title>
        <Button icon={<LeftOutlined />} onClick={() => navigate("/")}>
          Dashboard
        </Button>
      </div>
      <div style={{ display: 'flex', gap: 24, marginBottom: 24 }}>
        <Card style={{ flex: 1, textAlign: 'center' }}>
          <p style={{ marginBottom: 4, fontSize: '1rem', color: '#666' }}>Total Invested</p>
          <p style={{ margin: 0, fontSize: '1.75rem', fontWeight: 'bold', color: '#4169E1' }}>
            ${totalInvested.toFixed(2)}
          </p>
        </Card>
        <Card style={{ flex: 1, textAlign: 'center' }}>
          <p style={{ marginBottom: 4, fontSize: '1rem', color: '#666' }}>Current Value</p>
          <p style={{ margin: 0, fontSize: '1.75rem', fontWeight: 'bold', color: '#2d3748' }}>
            ${totalCurrentValue.toFixed(2)}
          </p>
        </Card>
        <Card style={{ flex: 1, textAlign: 'center' }}>
          <p style={{ marginBottom: 4, fontSize: '1rem', color: '#666' }}>Total P/L</p>
          <p style={{ margin: 0, fontSize: '1.75rem', fontWeight: 'bold', color: isPLPositive ? '#3f8600' : '#cf1322' }}>
            {isPLPositive ? '+' : '-'}${Math.abs(totalPL).toFixed(2)}
          </p>
        </Card>
      </div>

      {/* Search */}
      <Card style={{ marginBottom: 24 }}>
        <Input.Search
          placeholder="Search for stocks (e.g., AAPL, GOOGL)"
          enterButton="Search"
          size="large"
          onSearch={searchStocks}
          loading={searchLoading}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          prefix={<SearchOutlined />}
        />
        {searchResultsWithPrices.length > 0 && (
          <Table
            dataSource={searchResultsWithPrices}
            columns={[
              { title: 'Symbol', dataIndex: 'symbol', key: 'symbol' },
              { 
                title: 'Current Price',
                key: 'price',
                render: (_, record) => {
                  if (searchLoading) return 'Loading...'; 
                  if (!record.priceData) return 'N/A';
                  const { price, change, changePercent } = record.priceData;
                  const isPositive = change >= 0;
                  return (
                    <div>
                      <div style={{ fontWeight: 500 }}>${price.toFixed(2)}</div>
                      <div style={{ fontSize: '12px', color: isPositive ? '#3f8600' : '#cf1322' }}>
                        {isPositive ? '+' : ''}{change.toFixed(2)} ({changePercent}%)
                      </div>
                    </div>
                  );
                },
              },
              {
                title: 'Action',
                key: 'action',
                render: (_, record) => (
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => openAddModal(record)}
                  >
                    Add to Portfolio
                  </Button>
                ),
              },
            ]}
            pagination={{ pageSize: 5 }}
            rowKey="symbol"
          />
        )}
      </Card>

      {/* Portfolio and Value-over-Time Chart */}
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', marginBottom: 24 }}>
        {/* Chart */}
        <Card style={{ flex: 1, height: 450 }}>
          <p style={{ marginBottom: 8, fontSize: '1rem', color: '#666', textAlign: 'center' }}>Portfolio Value Over Time</p>
          {/* Time range buttons */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8, gap: 8 }}>
            {['1W', '1M', 'YTD', '1Y'].map(rng => (
              <Button
                key={rng}
                size="small"
                type={selectedRange === rng ? 'primary' : 'default'}
                onClick={() => setSelectedRange(rng)}
              >
                {rng}
              </Button>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={filteredChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={date => dayjs(date).format('MM-DD')}
                padding={{ left: 10, right: 10 }}
              />
              <YAxis />
              <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
              <Line type="monotone" dataKey="value" stroke="#3182ce" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
        {/* Table */}
        <Card
          style={{
            flex: 1,
            height: 450,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Table
            style={{ flex: 1 }}
            dataSource={portfolio.slice((currentPage - 1) * 4, currentPage * 4)}
            columns={columns}
            loading={isLoading}
            rowKey={r => r.id}
            components={tableComponents}
            pagination={{
              current: currentPage,
              pageSize: 4,
              total: portfolio.length,
              onChange: page => setCurrentPage(page),
              itemRender: (page, type, originalElement) => {
                if (type === 'prev') {
                  return React.cloneElement(originalElement, {
                    onClick: () => setCurrentPage(p => Math.max(p - 1, 1)),
                  });
                }
                if (type === 'next') {
                  // totalPages for 4 items per page
                  const totalPages = Math.ceil(portfolio.length / 4);
                  return React.cloneElement(originalElement, {
                    onClick: () => setCurrentPage(p => Math.min(p + 1, totalPages)),
                  });
                }
                if (type === 'page') {
                  const totalPages = Math.ceil(portfolio.length / 4);
                  if (page === 1 || page === totalPages) {
                    return originalElement;
                  }
                  if (page === currentPage) {
                    return React.cloneElement(originalElement, { disabled: true });
                  }
                  return null;
                }
                return originalElement;
              },
              style: { marginTop: 16, marginBottom: 16 }
            }}
          />
        </Card>
      </div>

      {/* Add/Edit Investment Modal */}
      <Modal
        title={editInvestment ? `Edit Investment — ${editInvestment.symbol}` : `Add Investment — ${selectedStock?.symbol || ""}`}
        visible={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          setSearchQuery("");
          setSearchResults([]);
          setEditInvestment(null);
        }}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleAddToPortfolio}>
          <Form.Item label="Symbol" name="symbol">
            <Input disabled value={selectedStock?.symbol} />
          </Form.Item>
          <Form.Item
            label="Shares"
            name="shares"
            rules={[{ required: true, message: "Enter number of shares" }]}
          >
            <InputNumber min={0.01} step={0.01} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            label="Purchase Price"
            name="purchasePrice"
            rules={[{ required: true, message: "Enter purchase price" }]}
          >
            <InputNumber min={0.01} step={0.01} prefix="$" style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            label="Purchase Date"
            name="purchaseDate"
            rules={[{ required: true, message: "Select purchase date" }]}
          >
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              {editInvestment ? "Update Investment" : "Add Investment"}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
