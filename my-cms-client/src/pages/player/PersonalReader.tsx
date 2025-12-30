import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Button, Typography, Spin, Row, Col, Progress, message } from 'antd';
import { LeftOutlined, RightOutlined, SoundOutlined, CloseOutlined } from '@ant-design/icons';
import api from '../../services/api';

const { Title, Paragraph, Text } = Typography;

export default function PersonalReader() {
  const { id } = useParams<{ id: string }>();
  const [book, setBook] = useState<any>(null);
  const [pageIndex, setPageIndex] = useState(0);

  // 1. 抓取資料
  useEffect(() => {
    if (!id) return;
    api.get('/books').then(res => {
        // 注意：這裡要做轉型 Number(id)
        const found = res.data.find((b: any) => b.id === Number(id));
        if (found) {
            found.pages.sort((a: any, b: any) => a.pageIndex - b.pageIndex);
            setBook(found);
        } else {
            message.error("找不到這本書");
        }
    }).catch(() => {
        message.error("讀取失敗，請確認網路連線");
    });
  }, [id]);

  // 2. 翻頁邏輯
  const handleNext = () => pageIndex < (book?.pages.length - 1) && setPageIndex(p => p + 1);
  const handlePrev = () => pageIndex > 0 && setPageIndex(p => p - 1);

  // 3. 語音朗讀
  const handleSpeak = () => {
    if (!book) return;
    const utterance = new SpeechSynthesisUtterance(book.pages[pageIndex].content);
    utterance.lang = 'zh-TW';
    utterance.rate = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  if (!book) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  const currentPage = book.pages[pageIndex];
  // 圖片容錯處理
  const currentImageUrl = currentPage?.imageUrl || currentPage?.imagePath;

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', padding: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ maxWidth: 1000, width: '100%' }}>
            
            {/* 頂部導航 */}
            <div style={{ marginBottom: 15, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Button icon={<CloseOutlined />} onClick={() => window.close()}>關閉閱讀</Button>
                <Title level={5} style={{ margin: 0 }}>{book.title}</Title>
                <Button shape="circle" icon={<SoundOutlined />} onClick={handleSpeak} />
            </div>

            {/* 書本內容 */}
            <Card bordered={false} bodyStyle={{ padding: 0 }} style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
                <Row>
                    <Col xs={24} md={14} style={{ background: '#000', minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img 
                            key={pageIndex} // Key 觸發動畫
                            src={currentImageUrl} 
                            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', animation: 'fadeIn 0.5s' }}
                        />
                    </Col>
                    <Col xs={24} md={10} style={{ padding: 30, background: '#fff' }}>
                         <Text type="secondary">Page {pageIndex + 1}</Text>
                         <Paragraph style={{ fontSize: 20, lineHeight: 1.8, marginTop: 15, minHeight: 200 }}>
                            {currentPage?.content}
                         </Paragraph>
                         
                         <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                            <Button block size="large" icon={<LeftOutlined />} disabled={pageIndex === 0} onClick={handlePrev}>上一頁</Button>
                            <Button block type="primary" size="large" icon={<RightOutlined />} disabled={pageIndex === book.pages.length - 1} onClick={handleNext}>下一頁</Button>
                         </div>
                    </Col>
                </Row>
            </Card>

            {/* 進度條 */}
            <div style={{ marginTop: 20 }}>
                <Progress percent={Math.round(((pageIndex + 1) / book.pages.length) * 100)} showInfo={false} />
            </div>
            
            <style>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
        </div>
    </div>
  );
}