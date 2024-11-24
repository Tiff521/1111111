const express = require('express');
const db = require('../database');
const router = express.Router();
const XLSX = require('xlsx');
const multer = require('multer');

// 配置 multer 用于处理文件上传
const upload = multer({ storage: multer.memoryStorage() });

// 获取所有联系人及其联系方式
router.get('/contacts', async (req, res, next) => {
    try {
        const sql = `
            SELECT c.id, c.name, c.email, c.favorite, cm.type, cm.value
            FROM contacts c
            LEFT JOIN contact_methods cm ON c.id = cm.contact_id
        `;
        const [results] = await db.query(sql);

        const contacts = results.reduce((acc, row) => {
            const contact = acc.find(c => c.id === row.id);
            if (contact) {
                contact.contactMethods.push({ type: row.type, value: row.value });
            } else {
                acc.push({
                    id: row.id,
                    name: row.name,
                    email: row.email,
                    favorite: row.favorite,
                    contactMethods: row.type && row.value ? [{ type: row.type, value: row.value }] : []
                });
            }
            return acc;
        }, []);

        res.json(contacts);
    } catch (err) {
        console.error('Error fetching contacts:', err);
        next(err);
    }
});

// 导出联系人为 Excel 文件
router.get('/contacts/export', async (req, res, next) => {
    try {
        const sql = `
            SELECT c.name, c.email, c.favorite, 
                   GROUP_CONCAT(CONCAT(cm.type, ':', cm.value) SEPARATOR '; ') AS contactMethods
            FROM contacts c
            LEFT JOIN contact_methods cm ON c.id = cm.contact_id
            GROUP BY c.id
        `;
        const [results] = await db.query(sql);

        const data = results.map(contact => ({
            姓名: contact.name,
            收藏: contact.favorite ? '是' : '否',
            联系方式: contact.contactMethods || ''
        }));

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, '联系人');

        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Disposition', 'attachment; filename=contacts.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (err) {
        console.error('Error exporting contacts:', err);
        next(err);
    }
});

// 导入联系人从 Excel 文件
router.post('/contacts/import', upload.single('file'), async (req, res, next) => {
    try {
        const file = req.file;

        if (!file) {
            return res.status(400).json({ error: '文件未上传！' });
        }

        const workbook = XLSX.read(file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const importedContacts = XLSX.utils.sheet_to_json(worksheet);

        for (const contact of importedContacts) {
            const { 姓名, 收藏, 联系方式 } = contact;
            const favorite = 收藏 === '是';
            const contactMethods = (联系方式 || '')
                .split(';')
                .map(method => {
                    const [type, value] = method.split(':').map(item => item.trim());
                    return { type, value };
                });

            const sqlContact = 'INSERT INTO contacts (name, favorite) VALUES (?, ?)';
            const [result] = await db.query(sqlContact, [姓名, favorite]);

            const contactId = result.insertId;

            if (contactMethods.length > 0) {
                const sqlMethods = 'INSERT INTO contact_methods (contact_id, type, value) VALUES ?';
                const values = contactMethods.map(method => [contactId, method.type, method.value]);
                await db.query(sqlMethods, [values]);
            }
        }

        res.status(200).json({ message: '联系人导入成功！' });
    } catch (err) {
        console.error('Error importing contacts:', err);
        next(err);
    }
});

// 添加联系人及其联系方式
router.post('/contacts', async (req, res, next) => {
    const { name, email, favorite = false, contactMethods } = req.body;

    try {
        const sqlContact = 'INSERT INTO contacts (name, email, favorite) VALUES (?, ?, ?)';
        const [result] = await db.query(sqlContact, [name, email, favorite]);

        const contactId = result.insertId;

        if (contactMethods && contactMethods.length > 0) {
            const sqlMethods = 'INSERT INTO contact_methods (contact_id, type, value) VALUES ?';
            const values = contactMethods.map(method => [contactId, method.type, method.value]);
            await db.query(sqlMethods, [values]);
        }

        res.status(201).json({ message: '联系人添加成功', id: contactId });
    } catch (err) {
        console.error('Error adding contact:', err);
        next(err);
    }
});

// 修改联系人及其联系方式
router.put('/contacts/:id', async (req, res, next) => {
    const { id } = req.params;
    const { name, email, favorite, contactMethods } = req.body;

    try {
        const sqlContact = 'UPDATE contacts SET name = ?, email = ?, favorite = ? WHERE id = ?';
        await db.query(sqlContact, [name, email, favorite, id]);

        const sqlDeleteMethods = 'DELETE FROM contact_methods WHERE contact_id = ?';
        await db.query(sqlDeleteMethods, [id]);

        if (contactMethods && contactMethods.length > 0) {
            const sqlMethods = 'INSERT INTO contact_methods (contact_id, type, value) VALUES ?';
            const values = contactMethods.map(method => [id, method.type, method.value]);
            await db.query(sqlMethods, [values]);
        }

        res.json({ message: '联系人信息更新成功' });
    } catch (err) {
        console.error('Error updating contact:', err);
        next(err);
    }
});

// 删除联系人及其联系方式
router.delete('/contacts/:id', async (req, res, next) => {
    const { id } = req.params;

    try {
        const sqlContact = 'DELETE FROM contacts WHERE id = ?';
        const sqlMethods = 'DELETE FROM contact_methods WHERE contact_id = ?';

        await db.query(sqlMethods, [id]);
        await db.query(sqlContact, [id]);

        res.json({ message: '联系人已删除' });
    } catch (err) {
        console.error('Error deleting contact:', err);
        next(err);
    }
});

module.exports = router;
