# -*- coding: utf-8 -*-
"""探测微信开发者工具 CLI 是否可用（IDE 必须已运行且服务端口开启）。"""
import subprocess
import sys

CLI = r"c:\Program Files (x86)\Tencent\微信web开发者工具\cli.bat"

def run(args, timeout=60):
    p = subprocess.run(args, input="", capture_output=True, text=True,
                       encoding="utf-8", errors="replace", timeout=timeout)
    return p.returncode, (p.stdout or ""), (p.stderr or "")

rc, out, err = run([CLI, "cloud", "functions", "list",
                    "--env", "cloud1-d2gfe2lrpe9cdf8a0"], timeout=90)
print("=== cloud functions list ===")
print(out)
if err:
    print("--- stderr ---")
    print(err)
print("--- exit:", rc, "---")
sys.exit(0)
