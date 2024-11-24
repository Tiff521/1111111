const API_URL = 'http://localhost:3000/api/contacts';
let contacts = []; // 存储所有联系人数据

// 加载所有联系人
async function loadContacts() {
    try {
        const response = await fetch(API_URL);
        contacts = await response.json();
        displayContacts(contacts); // 显示联系人
        updateFavorites(); // 更新收藏的联系人列表
    } catch (error) {
        alert("加载联系人失败，请稍后再试！");
        console.error("加载联系人失败:", error);
    }
}

// 显示联系人列表
function displayContacts(contactList) {
    const contactsBody = document.getElementById('contactsBody');
    contactsBody.innerHTML = ''; // 清空现有内容

    contactList.forEach(contact => {
        const contactMethods = contact.contactMethods
            .map(method => `${method.type}: ${method.value}`) // 格式化显示每种联系方式
            .join('<br>');

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${contact.name}</td>
            <td>${contactMethods}</td>
            <td>
                <button onclick="toggleFavorite(${contact.id})">
                    ${contact.favorite ? '取消收藏' : '收藏'}
                </button>
                <button onclick="editContact(${contact.id})">编辑</button>
                <button onclick="deleteContact(${contact.id})">删除</button>
            </td>
        `;
        contactsBody.appendChild(row);
    });
}

// 更新收藏的联系人列表
function updateFavorites() {
    const favoritesBody = document.getElementById('favoritesBody');
    favoritesBody.innerHTML = ''; // 清空现有收藏列表

    // 筛选出收藏的联系人
    const favoriteContacts = contacts.filter(contact => contact.favorite);

    favoriteContacts.forEach(contact => {
        const contactMethods = contact.contactMethods
            .map(method => `${method.type}: ${method.value}`)
            .join('<br>');

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${contact.name}</td>
            <td>${contactMethods}</td>
            <td>
                <button onclick="toggleFavorite(${contact.id})">取消收藏</button>
            </td>
        `;
        favoritesBody.appendChild(row);
    });
}

// 导出联系人为 Excel 文件
function exportToExcel() {
    if (contacts.length === 0) {
        alert("没有可导出的联系人！");
        return;
    }

    const data = contacts.map(contact => {
        const contactMethods = contact.contactMethods
            .map(method => `${method.type}: ${method.value}`)
            .join('; ');

        return {
            姓名: contact.name,
            收藏: contact.favorite ? '是' : '否',
            联系方式: contactMethods
        };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "联系人");
    XLSX.writeFile(workbook, "联系人.xlsx");
}

// 导入联系人从 Excel 文件
document.getElementById('importExcel').addEventListener('change', async function (event) {
    const file = event.target.files[0]; // 获取用户上传的文件
    if (!file) {
        alert('请选择一个文件！');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
        // 发送文件到后端
        const response = await fetch(`${API_URL}/import`, {
            method: 'POST',
            body: formData,
        });

        if (response.ok) {
            alert('联系人导入成功！');
            loadContacts(); // 重新加载联系人列表
        } else {
            const errorData = await response.json();
            alert(`导入失败: ${errorData.error || '未知错误'}`);
        }
    } catch (error) {
        console.error('导入联系人时出错:', error);
        alert('导入失败，请检查网络连接或文件格式！');
    }
});

// 切换收藏状态
async function toggleFavorite(id) {
    try {
        const contact = contacts.find(c => c.id === id);
        contact.favorite = !contact.favorite; // 切换收藏状态

        // 更新后端数据
        await fetch(`${API_URL}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(contact)
        });

        loadContacts(); // 重新加载联系人列表和收藏列表
    } catch (error) {
        alert("切换收藏状态失败，请稍后再试！");
        console.error("切换收藏状态失败:", error);
    }
}

// 添加或更新联系人
async function saveContact(event) {
    event.preventDefault(); // 防止表单默认提交

    const contactData = {
        name: document.getElementById('name').value,
        contactMethods: getContactMethodsFromForm()
    };
    const contactId = document.getElementById('contactId').value;

    try {
        const response = await fetch(contactId ? `${API_URL}/${contactId}` : API_URL, {
            method: contactId ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(contactData)
        });

        if (response.ok) {
            alert(contactId ? "联系人更新成功！" : "联系人新增成功！");
            document.getElementById('contactForm').reset();
            loadContacts(); // 重新加载联系人
        } else {
            alert("操作失败，请稍后重试！");
        }
    } catch (error) {
        alert("保存联系人时出错，请检查网络连接！");
        console.error("保存联系人失败:", error);
    }
}

// 从表单获取联系方式
function getContactMethodsFromForm() {
    const contactMethodsContainer = document.getElementById('contactMethodsContainer');
    const methodElements = contactMethodsContainer.querySelectorAll('.contact-method');

    return Array.from(methodElements).map(methodElement => {
        const type = methodElement.querySelector('.method-type').value;
        const value = methodElement.querySelector('.method-value').value;
        return { type, value };
    });
}

// 添加联系方式输入框
function addContactMethodInput(type = '', value = '') {
    const contactMethodsContainer = document.getElementById('contactMethodsContainer');
    const methodElement = document.createElement('div');
    methodElement.classList.add('contact-method');
    methodElement.innerHTML = `
        <select class="method-type">
            <option value="phone" ${type === 'phone' ? 'selected' : ''}>电话</option>
            <option value="email" ${type === 'email' ? 'selected' : ''}>邮箱</option>
            <option value="social" ${type === 'social' ? 'selected' : ''}>社交媒体</option>
            <option value="address" ${type === 'address' ? 'selected' : ''}>地址</option>
        </select>
        <input type="text" class="method-value" value="${value}" placeholder="输入联系方式">
        <button type="button" onclick="removeContactMethodInput(this)">删除</button>
    `;
    contactMethodsContainer.appendChild(methodElement);
}

// 删除联系方式输入框
function removeContactMethodInput(button) {
    const methodElement = button.parentElement;
    methodElement.remove();
}

// 删除联系人
async function deleteContact(id) {
    try {
        const response = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
        if (response.ok) {
            alert("联系人删除成功！");
            loadContacts();
        } else {
            alert("删除失败，请稍后重试！");
        }
    } catch (error) {
        alert("删除联系人时出错，请检查网络连接！");
        console.error("删除联系人失败:", error);
    }
}

// 编辑联系人
function editContact(id) {
    const contact = contacts.find(c => c.id === id);
    if (contact) {
        document.getElementById('name').value = contact.name;
        document.getElementById('contactId').value = id; // 保存当前编辑的联系人 ID

        // 清空原联系方式，并加载现有联系方式
        const contactMethodsContainer = document.getElementById('contactMethodsContainer');
        contactMethodsContainer.innerHTML = '';
        contact.contactMethods.forEach(method =>
            addContactMethodInput(method.type, method.value)
        );
    }
}

// 初始化表单添加一个默认联系方式输入框
document.getElementById('contactForm').addEventListener('submit', saveContact);
addContactMethodInput(); // 默认加载一个联系方式输入框

// 页面加载时获取联系人列表
loadContacts();
