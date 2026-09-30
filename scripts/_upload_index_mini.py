# -*- coding: utf-8 -*-
"""上传指数小程序代码包（含中文 --desc 必须走 subprocess 参数列表，避免编码乱码）"""
import subprocess, sys

CLI = r"C:\Program Files (x86)\Tencent\微信web开发者工具\cli.bat"
PROJ = r"C:\Users\14041\WorkBuddy\2026-07-16-10-20-33\养老金计算平台\index-mini"
VER = "2.1.8"
DESC = "补齐青海、广西2026年度社平工资，同步上海、西藏、新疆、内蒙古、黑龙江、湖南六省2026年养老金计发基数官方数据"

def run(args, label):
    print(f"--- {label} ---")
    r = subprocess.run(args, capture_output=True, text=True, encoding="utf-8", errors="replace")
    print((r.stdout or "")[-2500:])
    if r.stderr:
        print("[stderr]", (r.stderr or "")[-1200:])
    print(f"rc={r.returncode}\n")
    return r.returncode

# 先 islogin 确保 IDE server 已启动（否则 upload 会报 'C:\Program' 不是内部命令）
run([CLI, "islogin"], "islogin")
rc = run([CLI, "upload", "--project", PROJ, "-v", VER, "-d", DESC], f"upload v{VER}")
sys.exit(rc)
