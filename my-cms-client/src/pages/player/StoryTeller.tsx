import { useEffect, useState } from 'react';
import { useParams, useSearchParams} from 'react-router-dom';
import { HubConnection, HubConnectionBuilder } from '@microsoft/signalr';
import { Button, Card, Spin, Typography, Row, Col, Modal, message } from 'antd';
import { LeftOutlined, RightOutlined, RollbackOutlined, QrcodeOutlined, CopyOutlined } from '@ant-design/icons';
import api, { getApiBaseUrl } from '../../services/api';

// 引入剛建立的 CSS
import './StoryTeller.css';

const { Title, Paragraph, Text } = Typography;

export default function StoryTeller() {
  const { id } = useParams<{ id: string }>(); // Book ID
  const [searchParams, setSearchParams] = useSearchParams();
  // 判斷模式
  const isController = searchParams.get('mode') === 'controller';
  // 取得房間代碼
  const roomId = searchParams.get('room');

  // 狀態管理
  const [book, setBook] = useState<any>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [connection, setConnection] = useState<HubConnection | null>(null);
  const [status, setStatus] = useState("連線中...");

  // ==========================================
  // 1. 初始化：生成房間代碼 (如果是老師)
  // ==========================================
  useEffect(() => {
    // 如果是老師，且網址沒有 room 參數，就產生一個 6 碼隨機號
    if (isController && !roomId) {
        const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        // 更新網址參數 (不會刷新頁面)
        setSearchParams({ mode: 'controller', room: newRoomId });
    }
  }, [isController, roomId, setSearchParams]);

  // ==========================================
  // 2. 載入書籍資料
  // ==========================================
  useEffect(() => {
    if (!id) return;
    api.get('/books').then(res => {
        // 這裡暫時用 Client side filter，建議後端實作 api.get(`/books/${id}`)
        const found = res.data.find((b: any) => b.id === Number(id));
        if (found) {
            found.pages.sort((a: any, b: any) => a.pageIndex - b.pageIndex);
            setBook(found);
        }
    }).catch(err => {
        message.error(err.message || "讀取失敗，請確認網路連線");
    });
  }, [id]);

  // ==========================================
  // 3. 建立 SignalR 連線 (需等到有 roomId 才連)
  // ==========================================
  useEffect(() => {
    // 必須確認有 roomId 且後端 URL 正確
    if (!roomId) return;

    // ⚠️ 請確認這裡的網址是你的後端 Public URL
    // 如果 api.defaults.baseURL 設定正確，可以用：
    const apiBaseUrl = getApiBaseUrl();
    const hubBaseUrl = apiBaseUrl.endsWith('/api') ? apiBaseUrl.slice(0, -4) : apiBaseUrl;
    const hubUrl = `${hubBaseUrl}/storyHub`;
    
    // 如果 Codespaces 環境一直連不上，請暫時用寫死的測試：
    // const hubUrl = "https://你的後端網址-5250.app.github.dev/storyHub";

    const newConnection = new HubConnectionBuilder()
      .withUrl(hubUrl)
      .withAutomaticReconnect()
      .build();

    setConnection(newConnection);
  }, [roomId]); // 當 roomId 確定後才建立物件

  // ==========================================
  // 4. 啟動連線並監聽
  // ==========================================
  useEffect(() => {
    if (connection && roomId) {
        connection.start()
            .then(() => {
                console.log("SignalR Connected to Room:", roomId);
                setStatus("已連線");
                
                // 加入專屬房間
                connection.invoke("JoinGroup", roomId);
                
                // 監聽翻頁
                connection.on("ReceivePageUpdate", (newIndex: number) => {
                    setPageIndex(newIndex);
                });
            })
            .catch(err => {
                console.error(err);
                setStatus("連線失敗");
            });

        return () => {
            connection.off("ReceivePageUpdate");
            connection.stop();
        };
    }
  }, [connection, roomId]);

  // ==========================================
  // 5. 操作邏輯
  // ==========================================
  const handlePageChange = (newIndex: number) => {
    if (!book || !roomId) return;
    
    // 發送指令給後端 (指定 roomId)
    connection?.invoke("SyncPage", roomId, newIndex);
    
    // 老師端自己先切換，提升反應速度體驗
    setPageIndex(newIndex); 
  };

  const showProjectorModal = () => {
    // 產生給電視看的網址
    const viewerUrl = `${window.location.origin}/player/story/${id}?mode=viewer&room=${roomId}`;
    
    Modal.info({
        title: '📺 投影連結設定',
        width: 500,
        content: (
           <div style={{ marginTop: 20 }}>
               <p>請在教室電視或投影電腦開啟以下網址：</p>
               <div style={{ background: '#f5f5f5', padding: 10, borderRadius: 6, marginBottom: 15, wordBreak: 'break-all' }}>
                   <Text code style={{ fontSize: 16 }}>{viewerUrl}</Text>
               </div>
               <p>房間代碼：<Text strong style={{ color: '#1890ff', fontSize: 18 }}>{roomId}</Text></p>
               <Button type="primary" icon={<CopyOutlined />} onClick={() => {
                   navigator.clipboard.writeText(viewerUrl);
                   message.success("連結已複製！");
               }}>複製連結</Button>
               <Button style={{ marginLeft: 10 }} href={viewerUrl} target="_blank">直接開啟測試</Button>
           </div>
        )
    });
  };

  // ==========================================
  // 6. 畫面渲染
  // ==========================================
  
  // 等待資料載入或房間生成
  if (!book || !roomId) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  const currentPage = book.pages[pageIndex];
  // 取得圖片網址 (依後端欄位調整，這裡是相容寫法)
  const currentImageUrl = currentPage?.imageUrl || currentPage?.imagePath;

  // --- 📺 模式 A：電視播放端 (Viewer) ---
  if (!isController) {
    return (
      <div className="tv-container">
        <img 
          key={pageIndex} // ⚠️ 重要：Key 改變觸發 React 重繪，啟動 CSS 動畫
          src={currentImageUrl} 
          alt="Story Page" 
          className="story-image active" 
        />
        <div className="tv-page-number">
             {pageIndex + 1} / {book.pages.length}
        </div>
      </div>
    );
  }

  // --- 🎮 模式 B：老師控制端 (Controller) ---
  return (
    <div style={{ padding: 20, maxWidth: 1200, margin: '0 auto' }}>
      
      {/* 頂部資訊列 */}
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button icon={<RollbackOutlined />} onClick={() => window.close()}>結束播放</Button>
        <div>
            <span style={{ marginRight: 15, fontWeight: 'bold', color: '#555' }}>
                房間代碼: {roomId}
            </span>
            <span style={{ color: status === '已連線' ? '#52c41a' : '#ff4d4f' }}>
                ● {status}
            </span>
        </div>
      </div>

      <Row gutter={24}>
        {/* 左側：預覽與控制 */}
        <Col xs={24} md={10}>
            <Card 
                cover={
                    <div style={{ background: '#f0f0f0', height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img alt="preview" src={currentImageUrl} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                    </div>
                }
                actions={[
                    <Button 
                        size="large" icon={<LeftOutlined />} 
                        disabled={pageIndex === 0}
                        onClick={() => handlePageChange(pageIndex - 1)}
                    >上一頁</Button>,
                    
                    <span style={{ fontSize: 18, fontWeight: 'bold', lineHeight: '40px' }}> 
                        {pageIndex + 1} / {book.pages.length} 
                    </span>,
                    
                    <Button 
                        type="primary" size="large" icon={<RightOutlined />} 
                        disabled={pageIndex === book.pages.length - 1}
                        onClick={() => handlePageChange(pageIndex + 1)}
                    >下一頁</Button>
                ]}
            >
                <Button block type="dashed" icon={<QrcodeOutlined />} onClick={showProjectorModal}>
                    取得投影連結
                </Button>
            </Card>
        </Col>

        {/* 右側：提詞機 */}
        <Col xs={24} md={14}>
            <Card title="📖 故事提詞機" style={{ height: '100%', minHeight: 450, background: '#fffbe6' }}>
                <Title level={3}>{book.title}</Title>
                <Paragraph style={{ fontSize: 24, lineHeight: 1.8, marginBottom: 30 }}>
                    {currentPage?.content}
                </Paragraph>
                
                <div style={{ padding: 15, background: '#fff', borderRadius: 8, border: '1px dashed #ffa39e' }}>
                    <Text type="secondary">💡 互動提示：</Text>
                    <p style={{ marginTop: 5, fontSize: 16 }}>
                        這裡可以放一些引導問題，例如：「小朋友，你們覺得接下來會發生什麼事呢？」
                    </p>
                </div>
            </Card>
        </Col>
      </Row>
    </div>
  );
}
