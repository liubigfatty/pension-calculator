# -*- coding: utf-8 -*-
"""部署云函数 calculate（主程序）+ calcIndex（指数小程序）。

背景（2026-09-20）：
  - 社平数组年度语义统一为「执行年」（方案 A），31 省全量右移/补齐
  - 贵州独生子女增发 bug 修复（原默认人人发 248.70 元/月）
  - 22 省 2026 年度官方社平入库
  - calcIndex 分母取数索引 +1（数组右移联动）

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

# ⚠️ 两个小程序各用各的云环境，不能混用（混用报 code 10: env xxx not exists）
ENV_MAIN = "cloud1-d2gfe2lrpe9cdf8a0"          # 主程序 wx76075ba352d5333c
ENV_INDEX = "pension-calculato-d8dhrr613b49c3"  # 指数小程序 wxc226d43e4cfc62e3

# CLI 实际读取的 profile（与 IDE 运行时 profile 不是同一个）
CLI_PROFILE = r"C:\Users\14041\AppData\Local\微信开发者工具\User Data\22ba539e67ea05e6bfbb2f901a101457\Default"


def fix_cli_port(port):
    """CLI 读的 profile 里记录的端口可能是历史值（连不上就 wait IDE port timeout）。

    实测：CLI 读 22ba539e...，而 IDE 实际端口在 2ca4252f.../当前进程端口。
    把 .cli / .ide 写成当前真实端口即可。
    """
    if not os.path.isdir(CLI_PROFILE):
        print("  [跳过] profile 目录不存在：%s" % CLI_PROFILE)
        return
    for name in (".cli", ".ide"):
        p = os.path.join(CLI_PROFILE, name)
        old = None
        if os.path.exists(p):
            old = io.open(p, encoding="utf-8", errors="replace").read().strip()
        if old != port:
            io.open(p, "w", encoding="utf-8", newline="").write(port)
            print("  %s: %s -> %s" % (name, old or "(空)", port))
        else:
            print("  %s: 已是 %s" % (name, port))
    sp = os.path.join(CLI_PROFILE, ".ide-status")
    io.open(sp, "w", encoding="utf-8", newline="").write("On")


def deploy(name, project, env):
    args = [
        CLI, "cloud", "functions", "deploy",
        "--env", env,
        "--names", name,
        "--project", project,
    ]
    print("\n" + "=" * 60)
    print("部署 %s   project=%s" % (name, project))
    print("=" * 60)
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
    print("[0/3] 修正 CLI profile 端口 -> %s" % port)
    fix_cli_port(port)

    rc1 = deploy("calculate", ROOT, ENV_MAIN)
    rc2 = deploy("calcIndex", os.path.join(ROOT, "index-mini"), ENV_INDEX)

    print("\n" + "=" * 60)
    print("汇总：calculate=%s  calcIndex=%s" % (rc1, rc2))
    print("=" * 60)
    print("⚠️ deploy 日志 success 不等于线上正确，必须 download 回副本逐省验证。")


if __name__ == "__main__":
    main()
