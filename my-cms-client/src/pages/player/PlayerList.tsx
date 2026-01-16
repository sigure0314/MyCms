import React, { useEffect, useState } from 'react';
import { Card, List, Button, Typography } from 'antd';
import { PlayCircleOutlined, ReadOutlined } from '@ant-design/icons';
import api from '../../services/api';

const PlayerList: React.FC = () => {
  const [books, setBooks] = useState<any[]>([]);

  useEffect(() => {
    api.get('/books').then(res => setBooks(res.data));
  }, []);

  // 開新視窗的 Helper
  const openWindow = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div style={{ padding: 30 }}>
      <Typography.Title level={2}>📚 童書播放中心</Typography.Title>
      
      {/* 提示使用者流程 */}
      <div style={{ marginBottom: 20, color: '#666' }}>
        💡 老師請點擊「老師模式」進入教室，進入後再點擊「取得投影連結」分享給電視。
      </div>

      <List
        grid={{ gutter: 16, column: 4 }}
        dataSource={books}
        renderItem={book => {
            const coverPage = book.pages?.[0];
            const coverUrl = coverPage?.imageUrl || coverPage?.imagePath;

            return (
              <List.Item>
                <Card
                  hoverable
                  cover={
                    <img 
                      alt={book.title} 
                      src={coverUrl} 
                      style={{ height: 200, objectFit: 'cover' }} 
                    />
                  }
                  actions={[
                    // 1. 個人閱讀
                    <Button type="text" icon={<ReadOutlined />} onClick={() => openWindow(`/player/read/${book.id}`)}>
                      個人閱讀
                    </Button>,
                    
                    // 2. 老師模式 (點進去才會生成 UUID)
                    <Button type="text" icon={<PlayCircleOutlined />} onClick={() => openWindow(`/player/story/${book.id}?mode=controller`)}>
                      老師模式
                    </Button>
                    
                    // ❌ 原本的「投影」按鈕已移除，避免產生無效連結
                  ]}
                >
                  <Card.Meta title={book.title} description={`共 ${book.pages?.length || 0} 頁`} />
                </Card>
              </List.Item>
            );
        }}
      />
    </div>
  );
};

export default PlayerList;