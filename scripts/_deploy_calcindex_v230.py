# -*- coding: utf-8 -*-
"""部署云函数 calcIndex（指数小程序）— 指数引擎 v2.3.0

本次变更（2026-09-21）：
  - 废除通用 [0.6, 3.0] 夹取：60%/300% 属缴费端基数核定口径，非计算端规则
  - 仅保留省级明文（沪分段保底 / 渝上限分段 / 桂建账前<1按1）
  - 新增 outOfRangeFlag()、yearsDetail.indexRaw / outOfRange、顶层 warnings[]

只部署 calcIndex：calculate 用的是 pension-engine.js，本次未改动。

为什么用 Python 调 cli.bat：Git Bash 的 MSYS 参数转换会拆坏带空格的 CLI 路径
（报 "'C:\\Program' 不是内部或外部命令"），Python 以参数列表调 CreateProcess 可规避。

前置：微信开发者工具必须已运行且服务端口开启（CLI 不会冷启动 IDE）。
"""
import subprocess
import os
import sys
import io

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CLI = r"c:\Program Files (x86)\Tencent\微信web开发者工具\cli.bat"

ENV_INDEX = "pension-calculato-d8dhrr613b49c3"  # 指数小程序 wxc226d43e4cfc62e3

# CLI 实际读取的 profile（与 IDE 运行时 profile 可能不是同一个）
CLI_PROFILES = [
    r"C:\Users\14041\AppData\Local\微信开发者工具\User Data\22ba539e67ea05e6bfbb2f901a101457\Default",
    r"C:\Users\14041\AppData\Local\微信开发者工具\User Data\2ca4252ffa87560ea1fd48b913e45179\Default",
    r"C:\Users\14041\AppData\Local\微信开发者工具\User Data\80d774828fc67c7dafc59cd74ce70db0\Default",
]


def fix_cli_port(port):
    """把所有 profile 的 .cli / .ide 统一写成当前真实端口，并置 .ide-status=On。"""
    for prof in CLI_PROFILES:
        if not os.path.isdir(prof):
            print("  [跳过] 不存在：%s" % prof)
            continue
        for name in (".cli", ".ide"):
            p = os.path.join(prof, name)
            old = None
            if os.path.exists(p):
                old = io.open(p, encoding="utf-8", errors="replace").read().strip()
            if old != port:
                io.open(p, "w", encoding="utf-8", newline="").write(port)
                print("  %s [%s]: %s -> %s" % (name, prof[-24:-8], old or "(空)", port))
            else:
                print("  %s [%s]: 已是 %s" % (name, prof[-24:-8], port))
        sp = os.path.join(prof, ".ide-status")
        io.open(sp, "w", encoding="utf-8", newline="").write("On")


def run(args, label):
    print("\n" + "=" * 62)
    print(label)
    print("=" * 62)
    p = subprocess.run(
        args, input="y\n", capture_output=True, text=True,
        encoding="utf-8", errors="replace", timeout=900,
    )
    print(p.stdout)
    if p.stderr:
        print("--- stderr ---")
        print(p.stderr)
    print("--- exit code:", p.returncode, "---")
    return p.returncode


def main():
    port = sys.argv[1] if len(sys.argv) > 1 else "52093"
    print("[1/3] 统一 CLI profile 端口 -> %s" % port)
    fix_cli_port(port)

    print("\n[2/3] 连通性探测（cloud functions list）")
    rc0 = run(
        [CLI, "cloud", "functions", "list", "--env", ENV_INDEX,
         "--project", os.path.join(ROOT, "index-mini")],
        "探测：cloud functions list",
    )
    if rc0 != 0:
        print("\n⚠️ 探测失败——多半是端口不对。请确认 IDE 服务端口后重跑：")
        print("   python scripts/_deploy_calcindex_v230.py <端口>")
        return

    print("\n[3/3] 部署 calcIndex")
    rc = run(
        [CLI, "cloud", "functions", "deploy", "--env", ENV_INDEX,
         "--names", "calcIndex", "--project", os.path.join(ROOT, "index-mini")],
        "部署 calcIndex -> %s" % ENV_INDEX,
    )
    print("\n" + "=" * 62)
    print("部署退出码：%s" % rc)
    print("=" * 62)
    print("⚠️ deploy 日志 success 不等于线上正确，必须 download 回副本逐省验证。")


if __name__ == "__main__":
    main()
