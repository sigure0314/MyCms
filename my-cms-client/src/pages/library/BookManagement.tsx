import React, { useEffect, useState } from 'react';
import { Table, Card, Image, Tag, Typography, Space } from 'antd';
import api from '../../services/api';

const { Paragraph } = Typography;

// 1. 定義新的資料結構 (對應後端)
interface BookPage {
  id: number;
  pageIndex: number;
  content: string;
  imagePrompt: string;
  imagePath: string;
  imageUrl: string;
}

interface Book {
  id: number;
  title: string;
  viewCount: number;
  createdAt: string;
  pages: BookPage[]; // 書本裡包含多個頁面
}

const BookManagement: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const res = await api.get('/books');
      setBooks(res.data);
    } catch (error) {
      console.error('取得書本失敗', error);
    } finally {
      setLoading(false);
    }
  };

  // --- 子表格：顯示每一頁的詳細資訊 ---
  const expandedRowRender = (record: Book) => {
    const pageColumns = [
      { title: '頁碼', dataIndex: 'pageIndex', key: 'pageIndex', width: 80, render: (n:number) => <Tag>P.{n}</Tag> },
      {
        title: '圖片',
        dataIndex: 'imageUrl',
        key: 'imageUrl',
        render: (url: string) => <Image width={100} src={url} style={{borderRadius: 8}} />,
      },
      {
        title: '故事內容',
        dataIndex: 'content',
        key: 'content',
        render: (text: string) => <Paragraph ellipsis={{ rows: 2, expandable: true }}>{text}</Paragraph>,
      },
      {
        title: 'AI Prompt (生成提示詞)',
        dataIndex: 'imagePrompt',
        key: 'imagePrompt',
        render: (text: string) => <Paragraph copyable ellipsis={{ rows: 1 }}>{text}</Paragraph>,
      },
      {
        title: 'Supabase 路徑',
        dataIndex: 'imagePath',
        key: 'imagePath',
        render: (text: string) => <span style={{fontSize: 12, color: '#888'}}>{text}</span>,
      },
    ];

    return (
      <Table 
        columns={pageColumns} 
        dataSource={record.pages} 
        pagination={false} 
        rowKey="id"
        size="small" // 讓子表格看起來緊湊一點
        bordered
      />
    );
  };

  // --- 主表格：只顯示書本大綱 ---
  const mainColumns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
    { 
      title: '書名', 
      dataIndex: 'title', 
      key: 'title', 
      render: (text: string) => <b style={{fontSize: 16}}>{text}</b> 
    },
    { 
      title: '頁數', 
      key: 'pageCount', 
      render: (_: any, record: Book) => <Tag color="blue">{record.pages?.length || 0} 頁</Tag> 
    },
    { 
      title: '總閱覽數', 
      dataIndex: 'viewCount', 
      key: 'viewCount',
      render: (count: number) => <Tag color="green">{count} 次</Tag>
    },
    { 
      title: '建立時間', 
      dataIndex: 'createdAt', 
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleDateString()
    },
  ];

  return (
    <Card title="AI 童書管理 (含頁面詳情)">
      <Table
        className="components-table-demo-nested"
        columns={mainColumns}
        expandable={{ expandedRowRender, defaultExpandedRowKeys: [] }} // 設定可展開
        dataSource={books}
        rowKey="id"
        loading={loading}
      />
    </Card>
  );
};

export default BookManagement;