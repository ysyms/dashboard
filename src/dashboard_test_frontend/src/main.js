import './index.scss';
import { fetchAndDisplayChart } from "./chart.js";

// 全局变量
let currentPeriod = "daily";



window.onload = () => {

  console.log("页面加载完成，初始化 daily 图表...");
  fetchAndDisplayChart("daily"); // 默认显示 24 小时
  // 下拉菜单切换事件
  const periodSelect = document.getElementById("period-select");
  if (periodSelect) {
    periodSelect.addEventListener("change", (event) => {
      currentPeriod = event.target.value;
      console.log(`选择时间段: ${currentPeriod}`);
      fetchAndDisplayChart(currentPeriod);
    });
  }

  // 每 5 秒刷新图表和余额
  const intervalId = setInterval(async () => {
    console.log(`定时刷新 ${currentPeriod} 图表和余额...`);
    try {
      await fetchAndDisplayChart(currentPeriod);
    } catch (error) {
      console.error("定时刷新失败:", error);
    }
  }, 5000);

  // 移除持币者表格的定时刷新和手动刷新按钮
  window.onbeforeunload = () => {
    console.log("页面卸载，清除定时器...");
    clearInterval(intervalId);
    if (chart) chart.destroy(); // 注意：chart 是 chart.js 中的全局变量
  };
};