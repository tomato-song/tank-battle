# 🔥 坦克大战 (Tank Battle)

一个使用 HTML5 Canvas + 原生 JavaScript 制作的复古风格坦克射击游戏，无需任何依赖，直接在浏览器中打开即可游玩。

## 🎮 在线试玩

访问 GitHub Pages 即可直接游玩：

> https://tomato-song.github.io/tank-battle

## 🕹️ 操作说明

| 按键 | 操作 |
|------|------|
| `W` / `↑` | 向上移动 |
| `S` / `↓` | 向下移动 |
| `A` / `←` | 向左移动 |
| `D` / `→` | 向右移动 |
| `空格键` | 发射炮弹 |

## ✨ 游戏特性

- 🟢 玩家坦克（绿色）与敌方坦克（红色）对战
- 🧱 可破坏的砖墙与不可破坏的钢墙
- 🤖 简单的敌人 AI：巡逻、随机转向、自动射击
- 💥 爆炸粒子特效
- 🏆 计分系统、生命值、关卡推进
- 📱 响应式布局，适配不同屏幕尺寸
- 🎨 复古像素风格

## 📁 文件结构

```
tank-battle/
├── index.html    # 游戏页面结构
├── style.css     # 游戏样式与布局
├── game.js       # 游戏核心逻辑
└── README.md     # 项目说明
```

## 🚀 本地运行

1. 克隆仓库：
   ```bash
   git clone https://github.com/tomato-song/tank-battle.git
   cd tank-battle
   ```

2. 直接用浏览器打开 `index.html` 即可开始游戏。

   或者使用本地服务器：
   ```bash
   python -m http.server 8080
   # 然后访问 http://localhost:8080
   ```

## 🛠️ 技术栈

- HTML5 Canvas
- 原生 JavaScript（ES6+）
- CSS3

## 📝 开源协议

本项目基于 [MIT License](LICENSE) 开源。

---

祝你游戏愉快！🎉
