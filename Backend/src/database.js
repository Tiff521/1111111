const mysql = require('mysql2');

const dbConfig = {
    host: 'localhost',      // 数据库主机地址
    user: 'root',           // MySQL 用户名
    password: 'admin123',   // MySQL 密码
    database: 'contacts_db' // 数据库名称
};

// 创建数据库连接池，支持多连接和更好的性能
const db = mysql.createPool({
    ...dbConfig,
    waitForConnections: true,
    connectionLimit: 10,    // 最大连接数
    queueLimit: 0           // 队列中最大等待连接数，为 0 时不限制
});

// 测试数据库连接
db.getConnection((err, connection) => {
    if (err) {
        console.error('数据库连接失败:', err.message);
    } else {
        console.log('已成功连接到数据库');
        connection.release(); // 释放连接回连接池
    }
});

// 导出连接池
module.exports = db.promise(); // 使用 promise 方式操作数据库
