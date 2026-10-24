# -*- coding: utf-8 -*-
"""拉回线上 calculate 云函数代码到 _tmp_download（用于验证部署是否真的生效）"""
import subprocess, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CLI = r"c:\Program Files (x86)\Tencent\微信web开发者工具\cli.bat"
ENV_MAIN = "cloud1-d2gfe2lrpe9cdf8a0"
APPID_MAIN = "wx76075ba352d5333c"

port = sys.argv[1] if len(sys.argv) > 1 else "52093"
out = os.path.join(ROOT, "_tmp_download")

# 复用端口修正
CLI_PROFILE = r"C:\Users\14041\AppData\Local\微信开发者工具\User Data\22ba539e67ea05e6bfbb2f901a101457\Default"
import io
for name in (".cli", ".ide"):
    p = os.path.join(CLI_PROFILE, name)
    if os.path.exists(p) or os.path.isdir(CLI_PROFILE):
        io.open(p, "w", encoding="utf-8", newline="").write(port)
io.open(os.path.join(CLI_PROFILE, ".ide-status"), "w", encoding="utf-8", newline="").write("On")

args = [CLI, "cloud", "functions", "download",
        "-e", ENV_MAIN, "-n", "calculate", "--path", out, "--appid", APPID_MAIN]
print("下载到", out)
p = subprocess.run(args, input="y\n", capture_output=True, text=True,
                   encoding="utf-8", errors="replace", timeout=600)
print(p.stdout)
if p.stderr:
    print("--- stderr ---")
    print(p.stderr)
print("--- exit:", p.returncode, "---")
