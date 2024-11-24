const express = require('express');
const bodyParser = require('body-parser');
const contactsController = require('./controller/contactsController');
const cors = require('cors');
const db = require('./database'); // 引入数据库配置

const app = express();
const PORT = 3000;

// 测试数据库连接
db.getConnection((err, connection) => {
    if (err) {
        console.error('数据库连接失败:', err.message);
    } else {
        console.log('成功连接到 MySQL 数据库');
        connection.release(); // 释放连接到连接池
    }
});

// 中间件配置
app.use(cors());                // 允许跨域访问
app.use(bodyParser.json());     // 解析 JSON 请求体

// API 路由
app.use('/api', contactsController);

// 默认根路径响应
app.get('/', (req, res) => {
    res.send('服务器正常运行');
});

// 全局错误处理
app.use((err, req, res, next) => {
    console.error(err.stack); // 打印错误堆栈信息
    res.status(500).json({ error: '服务器内部错误，请稍后再试！' });
});

// 未匹配的路由处理
app.use((req, res) => {
    res.status(404).json({ error: '未找到相关资源' });
});

// 监听服务器
app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});
