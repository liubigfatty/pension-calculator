# -*- coding: utf-8 -*-
"""部署云函数 calculate（2026-09-14 引擎两项修复）。

修复内容：
  1. 未来计发基数不再写死，改为按「该省上一年已公布增幅」复合外推
     （删除吉林 2027-2035 / 四川 2026-2035 / 黑龙江 2027 的无来源写死值）
  2. getMinYears 默认表修正：2029 年前 15 年、2030 起每年 +0.5、2039 起 20 年

为什么用 Python 调 cli.bat：Git Bash 的 MSYS 参数转换会拆坏带空格的 CLI 路径
（报 "'C:\\Program' 不是内部或外部命令"），Python 以参数列表调 CreateProcess 可规避。

前置：微信开发者工具必须已运行且服务端口开启（CLI 不会冷启动 IDE）。
"""
import subprocess
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CLI = r"c:\Program Files (x86)\Tencent\微信web开发者工具\cli.bat"
ENV = "cloud1-d2gfe2lrpe9cdf8a0"

args = [
    CLI, "cloud", "functions", "deploy",
    "--env", ENV,
    "--names", "calculate",
    "--project", ROOT,
]

print("执行：cli cloud functions deploy --names calculate")
print("（前置：开发者工具需已运行且服务端口开启）\n")

p = subprocess.run(
    args, input="y\n", capture_output=True, text=True,
    encoding="utf-8", errors="replace", timeout=900,
)
print("--- stdout ---")
print(p.stdout)
if p.stderr:
    print("--- stderr ---")
    print(p.stderr)
print("--- exit code:", p.returncode, "---")
