# -*- coding: utf-8 -*-
"""从云端拉回 calculate 云函数副本，用于部署后验证。

纪律（2026-09-09 事故）：deploy 日志 success ≠ 线上正确，必须 download 回副本实测。
用法：python scripts/_verify_cloud_calculate.py
"""
import subprocess
import os
import shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CLI = r"c:\Program Files (x86)\Tencent\微信web开发者工具\cli.bat"
ENV = "cloud1-d2gfe2lrpe9cdf8a0"
OUT = os.path.join(ROOT, "scripts", "_cloud_verify")

if os.path.exists(OUT):
    shutil.rmtree(OUT)
os.makedirs(OUT)

args = [CLI, "cloud", "functions", "download",
        "--env", ENV, "--name", "calculate", "--path", OUT, "--project", ROOT]

p = subprocess.run(args, input="y\n", capture_output=True, text=True,
                   encoding="utf-8", errors="replace", timeout=900)
print(p.stdout[-1500:])
if p.stderr:
    print("--- stderr ---")
    print(p.stderr[-800:])
print("exit:", p.returncode)
print("\n下载目录:", OUT)
print(os.listdir(OUT) if os.path.exists(OUT) else "（空）")
