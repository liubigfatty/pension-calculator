# -*- coding: utf-8 -*-
"""上传小程序开发版 v2.1.8。

为什么不用 shell 直接调 cli.bat：
  Git Bash 传递含中文的参数（--desc）时会被 MSYS 参数转换拆坏，
  报 "'C:\\Program' 不是内部或外部命令"。用 Python 以参数列表调用
  CreateProcess，中文参数可正常传递。
"""
import subprocess
import sys
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CLI = r"c:\Program Files (x86)\Tencent\微信web开发者工具\cli.bat"

VERSION = "2.1.8"
DESC = (
    "1. 修复河南省城市选项与计发基数错配：此前选择开封市实际按信阳市基数测算、"
    "选择信阳市按开封市基数测算，导致两地参保人结果偏差，本次订正对应关系。"
    "2. 个人账户余额估算失败时，改为显示云端返回的具体原因。"
)
INFO_OUT = os.path.join(ROOT, ".upload-info.json")


def main():
    args = [
        CLI, "upload",
        "--project", ROOT,
        "--version", VERSION,
        "--desc", DESC,
        "--info-output", INFO_OUT,
    ]
    print("执行：cli upload --version %s" % VERSION)
    # stdin 传 "y"：CLI 在「服务端口未开启」时会提示
    #   "please enter y to confirm enabling CLI capability"，非交互调用下会直接退出，
    #   故显式应答一次以自动开启服务端口。
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
        print("--- info-output ---")
        with open(INFO_OUT, encoding="utf-8") as f:
            print(f.read()[:1500])
    return p.returncode


if __name__ == "__main__":
    sys.exit(main())
