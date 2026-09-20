# -*- coding: utf-8 -*-
"""上传「正元养老金计算器」主程序开发版 v2.2.0。

本次内容（前端 `miniprogram/pages/step2/step2.js`）：
  1. 2022 年记账利率 3.97% → 6.12%（国家公布值，前端此前从未同步引擎）
  2. 补入 2026 年记账利率 2.60%
  3. 未来年份兜底由「2025 值」改为「2026 值」，与结算引擎统一
改完后前端 31 年（1996-2026）利率表与云端引擎逐项一致（脚本全表比对，0 差异）。

云端同步（已部署，不随包上传）：社平年度口径统一、贵州条件性待遇 bug 修复。

为什么用 Python 调 cli.bat：Git Bash 的 MSYS 参数转换会拆坏带空格的 CLI 路径
（报 "'C:\\Program' 不是内部或外部命令"），Python 以参数列表调 CreateProcess 可规避。

上传后是**开发版**，仍需到微信后台提交审核。
"""
import subprocess
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CLI = r"c:\Program Files (x86)\Tencent\微信web开发者工具\cli.bat"

# 主程序必须传仓库根：根 project.config.json 才声明 miniprogramRoot/cloudfunctionRoot
PROJECT = ROOT

VERSION = "2.2.0"
DESC = (
    "订正个人账户记账利率数据：2022年由3.97%更正为国家公布的6.12%，补入2026年2.60%，"
    "并统一未来年份取值口径。同步更新云端测算引擎，修正各省历年社平工资的年度口径偏差，"
    "测算结果更准确。"
)
INFO_OUT = os.path.join(ROOT, ".upload-info-main.json")


def main():
    args = [
        CLI, "upload",
        "--project", PROJECT,
        "--version", VERSION,
        "--desc", DESC,
        "--info-output", INFO_OUT,
    ]
    print("执行：cli upload --project <仓库根> --version %s" % VERSION)
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
