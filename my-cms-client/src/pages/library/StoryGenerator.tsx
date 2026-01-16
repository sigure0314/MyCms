import { useState } from 'react';
import type { FC } from 'react';
import { 
  Card, Form, Input, Select, Button, Slider, 
  Steps, Typography, Spin, Row, Col, Result,  message 
} from 'antd';
import { 
  RobotOutlined, EditOutlined, PictureOutlined, 
   CheckCircleOutlined 
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api'; // 匯入實體物件
import type { GenerateScriptRequest, StoryDraft} from '../../services/api'; // 匯入型別
const {  Text } = Typography; // Typography 只負責標題和文字顯示
const { TextArea } = Input;         // TextArea 負責輸入多行文字

const StoryGenerator: FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0); // 0: 設定, 1: 修潤, 2: 完成
  const [loading, setLoading] = useState(false);
  
  // 暫存資料
  const [draftData, setDraftData] = useState<StoryDraft | null>(null);
  const [finalBook, setFinalBook] = useState<any>(null);

  // --- Step 1: 送出主題，取得草稿 ---
  const handleDraftSubmit = async (values: GenerateScriptRequest) => {
    setLoading(true);
    try {
      const res = await api.generateDraft(values);
      setDraftData(res.data); // 儲存回傳的草稿
      setCurrentStep(1);      // 進入下一步
      message.success('故事大綱生成成功！請檢查並修潤內容。');
    } catch (error) {
      message.error('生成失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  // --- Step 2: 更新草稿內容 (使用者修改文字時) ---
  const handlePageChange = (index: number, field: 'content' | 'imagePrompt', value: string) => {
    if (!draftData) return;
    const newPages = [...draftData.pages];
    newPages[index] = { ...newPages[index], [field]: value };
    setDraftData({ ...draftData, pages: newPages });
  };

  // --- Step 2: 確認定稿，開始畫圖 ---
  const handleFinalize = async () => {
    if (!draftData) return;
    setLoading(true);
    try {
      const res = await api.finalizeStory(draftData);
      setFinalBook(res.data);
      setCurrentStep(2); // 進入完成頁
    } catch (error) {
      message.error('圖片生成失敗，請檢查後端日誌');
    } finally {
      setLoading(false);
    }
  };

  // 渲染 Step 1: 輸入表單
  const renderStep1 = () => (
    <Form layout="vertical" onFinish={handleDraftSubmit} initialValues={{ pages: 4, age: "5" }}>
      <Form.Item label="故事主題" name="topic" rules={[{ required: true }]}>
        <TextArea rows={3} placeholder="例如：一隻戴著眼鏡的貓頭鷹法官..." />
      </Form.Item>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label="頁數" name="pages">
            <Slider min={2} max={6} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="年齡" name="age">
            <Select options={[
              { value: '3', label: '3 歲 (簡單)' },
              { value: '5', label: '5 歲 (有趣)' },
              { value: '7', label: '7 歲 (寓意)' }
            ]} />
          </Form.Item>
        </Col>
      </Row>
      <Button type="primary" htmlType="submit" block size="large" icon={<RobotOutlined />} loading={loading}>
        生成故事大綱 (Step 1)
      </Button>
    </Form>
  );

  // 渲染 Step 2: 修潤內容
  const renderStep2 = () => {
    if (!draftData) return null;
    return (
      <div>
        <div style={{ marginBottom: 20 }}>
          <Text strong>書名：</Text>
          <Input value={draftData.title} onChange={e => setDraftData({...draftData, title: e.target.value})} />
        </div>
        
        {draftData.pages.map((page, index) => (
          <Card key={index} title={`第 ${index + 1} 頁`} style={{ marginBottom: 16 }} size="small">
            <Row gutter={16}>
              <Col span={12}>
                <Text type="secondary">故事內容 (文字)</Text>
                <TextArea 
                  rows={3} 
                  value={page.content} 
                  onChange={(e) => handlePageChange(index, 'content', e.target.value)}
                  style={{ marginTop: 8 }}
                />
              </Col>
              <Col span={12}>
                <Text type="secondary">AI 繪圖提示詞 (Prompt)</Text>
                <TextArea 
                  rows={3} 
                  value={page.imagePrompt} 
                  onChange={(e) => handlePageChange(index, 'imagePrompt', e.target.value)}
                  style={{ marginTop: 8, fontFamily: 'monospace', color: '#666' }}
                />
              </Col>
            </Row>
          </Card>
        ))}

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <Button onClick={() => setCurrentStep(0)}>上一步 (重設)</Button>
          <Button type="primary" block size="large" icon={<PictureOutlined />} onClick={handleFinalize} loading={loading}>
            確認無誤，開始生成圖片 (Step 2)
          </Button>
        </div>
      </div>
    );
  };

  // 渲染 Step 3: 完成
  const renderStep3 = () => (
    <Result
      status="success"
      title="童書製作完成！"
      subTitle={`《${finalBook?.title}》已存入資料庫`}
      extra={[
        <Button type="primary" key="play" onClick={() => navigate(`/library/player`)}>去播放</Button>,
        <Button key="back" onClick={() => { setCurrentStep(0); setDraftData(null); }}>再做一本</Button>
      ]}
    />
  );

  return (
    <div style={{ maxWidth: 900, margin: '20px auto' }}>
      <Card>
        <Steps 
          current={currentStep} 
          items={[
            { title: '設定主題', icon: <EditOutlined /> },
            { title: '修潤腳本', icon: <RobotOutlined /> },
            { title: '生成繪本', icon: <CheckCircleOutlined /> }
          ]} 
          style={{ marginBottom: 40 }}
        />

        {loading && currentStep === 1 && (
            <div style={{textAlign: 'center', padding: 50}}>
                <Spin size="large" tip="AI 繪圖師正在努力工作中 (約需 1~2 分鐘)..." />
            </div>
        )}

        {!loading && (
            <>
                {currentStep === 0 && renderStep1()}
                {currentStep === 1 && renderStep2()}
                {currentStep === 2 && renderStep3()}
            </>
        )}
      </Card>
    </div>
  );
};

export default StoryGenerator;
