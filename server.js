const express = require('express');
const app = express();

// 解析 JSON 请求体
app.use(express.json());

// 允许跨域访问（让前端能连上）
app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  next();
});

// 用普通变量存储数据和在线状态
const messages = [];
const onlineUsers = {};

// 心跳/上线接口
app.post('/api/online', (req, res) => {
  const { id, nick } = req.body;
  onlineUsers[id] = { nick: nick, last: Date.now() };
  res.json({ ok: true });
});

// 获取在线用户列表
app.get('/api/online', (req, res) => {
  const validUsers = Object.entries(onlineUsers)
    .filter(([_, val]) => Date.now() - val.last < 30000) // 30秒内算在线
    .map(([id, val]) => ({ id: id, nick: val.nick }));
  res.json(validUsers);
});

// 发送聊天消息
app.post('/api/chat', (req, res) => {
  const { channel = 'normal', user = '匿名', text = '' } = req.body;
  if (!text.trim()) return res.status(400).json({ ok: false });
  
  messages.push({
    t: Date.now(),
    c: channel,
    user: user,
    text: String(text).slice(0, 120) // 限制字数
  });
  
  // 最多保留200条消息
  if (messages.length > 200) messages.shift();
  res.json({ ok: true });
});

// 获取聊天消息
app.get('/api/chat', (req, res) => {
  const channel = req.query.channel || 'normal';
  const channelMsgs = messages.filter(x => x.c === channel).slice(-50);
  res.json(channelMsgs);
});

// SSE 流式推送（用于实时更新）
app.get('/api/stream', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  res.write('event: ping\ndata: {}\n\n');
  const interval = setInterval(() => {
    res.write(`event: update\ndata: ${Date.now()}\n\n`);
  }, 3000);
  req.on('close', () => clearInterval(interval));
});

// 健康检查接口（Render 部署必需）
app.get('/health', (req, res) => {
  res.send('ok');
});

// 启动服务
const port = process.env.PORT || 3000;
app.listen(port, () => console.log('Server up on port', port));
