"""用 Python 生成 HTML —— 你已经会的那部分，可以直接接管重复劳动。

HTML 自己不循环。所以真实项目里，表格、列表这种重复结构
通常是 Python（或 JS）在服务器端拼好字符串，再一次性发给浏览器。

运行：python3 gen_html.py
产出：generated.html（用浏览器打开）
"""

import html
from pathlib import Path

# 1) 数据：Python 里随便你怎么算
rows = [
    ("小明", 92, "A"),
    ("小红", 85, "B"),
    ("小刚", 58, "F"),
]
title = "期末成绩单 <2025>"

# 2) 拼字符串：f-string + 列表推导式 + join
#    html.escape() 很关键：把用户数据里的 < > & 转义，防止内容把页面结构搞坏
tbody = "\n".join(
    f"      <tr><td>{html.escape(name)}</td>"
    f"<td>{score}</td>"
    f"<td>{grade}</td></tr>"
    for name, score, grade in rows
)

page = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>{html.escape(title)}</title>
  <style>
    body {{ font-family: -apple-system, "PingFang SC", sans-serif; padding: 2rem; }}
    table {{ border-collapse: collapse; }}
    th, td {{ border: 1px solid #ccc; padding: .4rem .8rem; }}
    th {{ background: #f2f2f2; }}
  </style>
</head>
<body>
  <h1>{html.escape(title)}</h1>
  <table>
    <thead><tr><th>姓名</th><th>分数</th><th>等级</th></tr></thead>
    <tbody>
{tbody}
    </tbody>
  </table>
</body>
</html>
"""

Path("generated.html").write_text(page, encoding="utf-8")
print("已生成 generated.html")

# 注意 f-string 里的 {{ }} 要写双花括号 —— 因为 CSS 自己就用花括号。
# 这是 Python 写 HTML 最烦的一点。数据一多、结构一复杂，就换模板引擎
# （Jinja2）或框架（Flask / Django），它们就是专门解决这个问题的。
