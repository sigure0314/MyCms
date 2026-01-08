import { useEffect, useState } from 'react';
import { Alert, Card, Descriptions, Spin } from 'antd';
import api, { UserSummary } from '../services/api';

interface TokenPayload {
  nameid?: string;
  unique_name?: string;
  [key: string]: unknown;
}

const parseTokenPayload = (): TokenPayload | null => {
  const token = localStorage.getItem('token');
  if (!token) {
    return null;
  }

  const payload = token.split('.')[1];
  if (!payload) {
    return null;
  }

  try {
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
};

const resolveCurrentUser = (users: UserSummary[], payload: TokenPayload | null) => {
  if (!payload) {
    return null;
  }

  const rawId = payload.nameid ?? payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'];
  const id = typeof rawId === 'string' ? Number(rawId) : undefined;
  if (id && Number.isFinite(id)) {
    const matchedById = users.find(user => user.id === id);
    if (matchedById) {
      return matchedById;
    }
  }

  const rawUsername = payload.unique_name ?? payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'];
  if (typeof rawUsername === 'string') {
    return users.find(user => user.username === rawUsername) ?? null;
  }

  return null;
};

const PersonalSettings = () => {
  const [user, setUser] = useState<UserSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      setErrorMessage(null);
      try {
        const res = await api.getUsers();
        const payload = parseTokenPayload();
        const matchedUser = resolveCurrentUser(res.data, payload);
        if (!matchedUser) {
          setErrorMessage('找不到對應的使用者資料');
        }
        setUser(matchedUser);
      } catch {
        setErrorMessage('無法載入使用者資料');
      } finally {
        setLoading(false);
      }
    };

    void fetchUser();
  }, []);

  if (loading) {
    return (
      <Card title="個人設定">
        <Spin />
      </Card>
    );
  }

  return (
    <Card title="個人設定">
      {errorMessage ? (
        <Alert type="error" message={errorMessage} showIcon />
      ) : (
        <Descriptions column={1} bordered>
          <Descriptions.Item label="帳號">{user?.username}</Descriptions.Item>
          <Descriptions.Item label="信箱">{user?.email}</Descriptions.Item>
        </Descriptions>
      )}
    </Card>
  );
};

export default PersonalSettings;
