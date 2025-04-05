import { dashboard_test_backend } from "../../declarations/dashboard_test_backend";

// 用户指纹，默认值
let userFingerprint = "ANON_";

// 初始化 FingerprintJS 获取用户指纹
if (typeof FingerprintJS !== "undefined") {
  FingerprintJS.load().then(fp => {
    fp.get().then(result => {
      userFingerprint = result.visitorId.substring(0, 5); // 取指纹前五位作为用户名
      console.log("用户指纹:", userFingerprint);
    });
  });
} else {
  console.warn("FingerprintJS 未加载，使用默认值 'ANON_'");
}

// DOM 元素获取和事件绑定
window.addEventListener('DOMContentLoaded', () => {
  const messageBtn = document.getElementById("message-btn");
  const messageModal = document.getElementById("message-modal");
  const closeBtn = document.getElementById("close-message-btn");
  const sendBtn = document.getElementById("send-message-btn");
  const messageInput = document.getElementById("message-input");

  if (messageBtn && messageModal) {
    messageBtn.addEventListener("click", () => {
      messageModal.classList.add("open");
      fetchMessages();
    });
  }
  if (closeBtn && messageModal) {
    closeBtn.addEventListener("click", () => {
      messageModal.classList.remove("open");
    });
  }
  if (sendBtn) sendBtn.addEventListener("click", sendMessage);
  if (messageInput) {
    messageInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") sendMessage();
    });
  }
});

// 获取消息
async function fetchMessages() {
  const messageList = document.getElementById("message-list");
  if (!messageList) return;
  try {
    const messages = await dashboard_test_backend.getMessageBuffer();
    messageList.innerHTML = messages
      .filter(msg => msg.userName !== "NULL_USER")
      .sort((a, b) => Number(a.timestamp) - Number(b.timestamp))
      .map(msg => `
        <div class="message-item">
          <span class="username">${msg.userName}</span>
          <span class="content">${msg.message}</span>
          <span class="timestamp">${new Date(Number(msg.timestamp) / 1000000).toLocaleString()}</span>
        </div>
      `)
      .join("");
    messageList.scrollTop = messageList.scrollHeight; // 滚动到最新消息
  } catch (error) {
    console.error("获取消息失败:", error);
    messageList.innerHTML = "<div>消息加载失败，请稍后重试</div>";
  }
}

// 发送消息
async function sendMessage() {
  const messageInput = document.getElementById("message-input");
  const sendBtn = document.getElementById("send-message-btn");
  if (!messageInput || !sendBtn) return;

  const message = messageInput.value.trim();
  if (!message) return; // 如果消息为空，不执行

  if (userFingerprint === "ANON_") {
    setTimeout(sendMessage, 1000); // 延迟重试，直到指纹初始化完成
    return;
  }

  // 修改按钮状态为“上链中”
  sendBtn.textContent = "上链中";
  sendBtn.disabled = true;
  sendBtn.style.background = "#767676"; // 灰色表示正在处理

  try {
    const result = await dashboard_test_backend.addMessageToBuffer(userFingerprint, message);
    if (result.Ok !== null) { // 检查返回结果是否为 #ok
      console.log("消息添加成功");
      messageInput.value = ""; // 清空输入框
      fetchMessages(); // 刷新消息列表
    } else {
      console.error("添加消息失败:", result.Err);
    }
  } catch (error) {
    console.error("发送消息失败:", error);
  } finally {
    // 无论成功或失败，恢复按钮状态
    sendBtn.textContent = "发送";
    sendBtn.disabled = false;
    sendBtn.style.background = "#34c759"; // 恢复原始颜色
  }
}