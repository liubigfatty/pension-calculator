# -*- coding: utf-8 -*-
"""上传「本人平均缴费指数计算器」开发版 v2.1.7。

本次内容：
  1. 社平工资年度口径统一为「执行年度」（原 29 省沿用统计年口径，差一年）
  2. 补齐 14 省 2025 年度、22 省 2026 年度官方数据
  3. 缴费指数分母取数年份同步修正（此前结果偏低 3%—5%）
  4. 「全国社平」查询页数据同步更新

为什么用 Python 调 cli.bat：Git Bash 的 MSYS 参数转换会拆坏带空格的 CLI 路径
（报 "'C:\\Program' 不是内部或外部命令"），Python 以参数列表调 CreateProcess 可规避。

上传后是**开发版**，仍需到微信后台提交审核。
"""
import subprocess
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CLI = r"c:\Program Files (x86)\Tencent\微信web开发者工具\cli.bat"
PROJECT = os.path.join(ROOT, "index-mini")

VERSION = "2.1.7"
DESC = (
    "订正全国31省历年社平工资年度口径，统一为“执行年度”（原29省沿用的是统计年口径，差一年）；"
    "补齐14省2025年度与22省2026年度官方数据。同步修正平均缴费指数计算的分母取数年份，"
    "此前结果偏低3%—5%已纠正。"
)
INFO_OUT = os.path.join(ROOT, ".upload-info-index.json")


def main():
    args = [
        CLI, "upload",
        "--project", PROJECT,
        "--version", VERSION,
        "--desc", DESC,
        "--info-output", INFO_OUT,
    ]
    print("执行：cli upload --project index-mini --version %s" % VERSION)
    print("说明文字（%d 字）：%s\n" % (len(DESC), DESC))
    p = subprocess.run(
        args, input="y\n", capture_output=True, text=True,
        encoding="utf-8", errors="replace", timeout=600,
    )
    print("--- stdout ---")
    print(p.stdout[-3000:] if p.stdout else "(空)")
    print("--- stderr ---")
    print(p.stderr[-2000:] if p.stderr else "(空)")
    print("--- exit code: %d ---" % p.returncode)
    if os.path.exists(INFO_OUT):
        print("--- upload info ---")
        print(open(INFO_OUT, encoding="utf-8").read())


if __name__ == "__main__":
    main()
