import { dashboard_test_backend } from "../../declarations/dashboard_test_backend";

// 全局图表实例
let chart = null;

export function sampleData(data, maxPoints = 100) {
  if (data.length <= maxPoints) return data;
  const step = Math.floor(data.length / maxPoints);
  return data.filter((_, index) => index % step === 0);
}

export async function fetchAndDisplayChart(period = "daily") {
  try {
    console.log(`尝试获取 ${period} 历史数据...`);
    let buffer;
    switch (period) {
      case "daily": buffer = await dashboard_test_backend.getDailyBuffer(); break;
      case "weekly": buffer = await dashboard_test_backend.getWeeklyBuffer(); break;
      case "monthly": buffer = await dashboard_test_backend.getMonthlyBuffer(); break;
      case "yearly": buffer = await dashboard_test_backend.getYearlyBuffer(); break;
      case "decade": buffer = await dashboard_test_backend.getDecadeBuffer(); break;
      default: throw new Error("未知的时间段");
    }
    console.log(`${period} 历史数据获取成功:`, buffer);
    const decimals = 100000000n;

    // 更新余额
    const balanceResult = await dashboard_test_backend.getBalance();
    const balanceInBTC = balanceResult.balance / decimals;
    const remainder = balanceResult.balance % decimals;
    const formattedBalance = `${balanceInBTC.toString()}.${remainder.toString().padStart(8, '0').slice(0, 4)}`;
    const balanceElement = document.getElementById("current-balance");
    if (balanceElement) {
      balanceElement.innerText = formattedBalance;
      console.log("余额更新为:", formattedBalance);
    } else {
      console.warn("未找到 'current-balance' 元素");
    }

    // 检查数据点数量
    const validData = buffer.filter(item => Number(item.timestamp) > 0);
    const chartMessage = document.getElementById("chart-message");
    if (validData.length < 2) {
      console.warn(`${period} 数据点不足，无法绘制图表:`, validData.length);
      if (chartMessage) {
        chartMessage.classList.remove("hidden");
        chartMessage.innerText = "数据点不足";
      }
      if (chart) {
        chart.destroy();
        chart = null;
      }
      return;
    }

    if (chartMessage) chartMessage.classList.add("hidden");

    // 转换为 Chart.js 格式
    const chartData = sampleData(validData.map(item => ({
      x: new Date(Number(item.timestamp) / 1000000),
      y: Number(item.balance / decimals) + Number(item.balance % decimals) / 100000000
    })), 2880);

    const balances = chartData.map(item => item.y);
    const minBalance = Math.min(...balances);
    const maxBalance = Math.max(...balances);
    const padding = (maxBalance - minBalance) * 0.1 || 0.01;

    const now = new Date();
    let startTime, timeUnit, label;
    switch (period) {
      case "daily": startTime = new Date(now - 24 * 60 * 60 * 1000); timeUnit = 'hour'; label = 'Balance (BTC) - 24 Hours'; break;
      case "weekly": startTime = new Date(now - 7 * 24 * 60 * 60 * 1000); timeUnit = 'day'; label = 'Balance (BTC) - 1 Week'; break;
      case "monthly": startTime = new Date(now - 28 * 24 * 60 * 60 * 1000); timeUnit = 'day'; label = 'Balance (BTC) - 1 Month'; break;
      case "yearly": startTime = new Date(now - 336 * 24 * 60 * 60 * 1000); timeUnit = 'month'; label = 'Balance (BTC) - 1 Year'; break;
      case "decade": startTime = new Date(now - 3360 * 24 * 60 * 60 * 1000); timeUnit = 'year'; label = 'Balance (BTC) - 10 Years'; break;
    }

    const ctx = document.getElementById('balanceChart')?.getContext('2d');
    if (!ctx) {
      throw new Error("未找到 'balanceChart' 元素");
    }

    if (chart) {
      // 更新现有图表
      chart.data.datasets[0].data = chartData;
      chart.data.datasets[0].label = label;
      chart.options.scales.x.min = startTime;
      chart.options.scales.x.max = now;
      chart.options.scales.x.time.unit = timeUnit;
      chart.options.scales.y.suggestedMin = minBalance - padding;
      chart.options.scales.y.suggestedMax = maxBalance + padding;
      chart.update(); // 更新图表而不重建
      console.log(`${period} 图表更新完成`);
    } else {
      // 首次创建图表
      chart = new Chart(ctx, {
        type: 'line',
        data: {
          datasets: [{
            label: label,
            data: chartData,
            borderColor: '#34c759',
            backgroundColor: 'rgba(52, 199, 89, 0.1)',
            borderWidth: 2,
            fill: false,
            tension: 0.1,
            pointRadius: 0,
            pointHitRadius: 5
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 300 }, // 平滑动画
          scales: {
            x: {
              type: 'time',
              time: {
                unit: timeUnit,
                displayFormats: { hour: 'HH:mm', day: 'MM-dd', month: 'yyyy-MM', year: 'yyyy' },
                tooltipFormat: 'yyyy-MM-dd HH:mm'
              },
              min: startTime,
              max: now,
              title: { display: true, text: 'Time (UTC+8)', color: '#000000' },
              ticks: { color: '#000000', maxTicksLimit: 10 },
              grid: { color: '#000000' },
              border: { display: true, color: '#000000' }
            },
            y: {
              suggestedMin: minBalance - padding,
              suggestedMax: maxBalance + padding,
              title: { display: true, text: 'Balance (BTC)', color: '#000000' },
              ticks: { color: '#000000' },
              grid: { color: '#000000' },
              border: { display: false }
            }
          },
          plugins: {
            legend: { display: true, position: 'top', labels: { color: '#666' } },
            tooltip: {
              mode: 'index',
              intersect: false,
              backgroundColor: '#ffffff',
              borderColor: '#e0e0e0',
              borderWidth: 1,
              titleColor: '#333',
              bodyColor: '#333',
              callbacks: { label: (context) => `Balance: ${context.parsed.y.toFixed(4)} BTC` }
            }
          }
        }
      });
      console.log(`${period} 图表创建完成`);
    }

    const periodSelect = document.getElementById('period-select');
    if (periodSelect) periodSelect.value = period;
  } catch (error) {
    console.error(`获取 ${period} 数据失败:`, error);
    document.getElementById("current-balance").innerText = "错误";
    const messageElement = document.getElementById("chart-message");
    if (messageElement) {
      messageElement.classList.remove("hidden");
      messageElement.innerText = "加载失败: " + (error.message || "未知错误");
    }
    if (chart) {
      chart.destroy();
      chart = null;
    }
  }
}