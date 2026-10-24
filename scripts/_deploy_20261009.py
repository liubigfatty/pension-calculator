# -*- coding: utf-8 -*-
"""2026-10-09 部署：calculate（主程序）+ calcIndex（指数小程序）

本轮内容：
  ① 9 省规则核对 → 修 4 项（广东条件停发津贴 / 上海换 16号文口径+见分进角 / 福建半段进整 / 江苏三年过渡期）、撤回 1 项（江苏最低缴费系数）
  ② 重庆独生子女增发 3%：补「1996-01-01 前参工」门槛 + 去掉多余的 transPension>0 条件（渝劳办发〔2000〕261号）
  ③ 黑龙江御寒津贴 45：从"月基本养老金合计"口径中移除（核定表实证不含）【用户拍板】

姿势（2026-10-01 实测）：必须 `--paths <云函数绝对目录>` + `--appid`，
  `--project --names` 会报 "cloudfunction path not found"（cloudfunctionRoot 是相对路径）。
前置：微信开发者工具已运行且服务端口开启（CLI 不能冷启动 IDE）。
"""
import subprocess
import os
import sys
import io

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CLI = r"c:\Program Files (x86)\Tencent\微信web开发者工具\cli.bat"

ENV_MAIN = "cloud1-d2gfe2lrpe9cdf8a0"           # 主程序 wx76075ba352d5333c
ENV_INDEX = "pension-calculato-d8dhrr613b49c3"  # 指数小程序 wxc226d43e4cfc62e3
APPID_MAIN = "wx76075ba352d5333c"
APPID_INDEX = "wxc226d43e4cfc62e3"

CLI_PROFILE = r"C:\Users\14041\AppData\Local\微信开发者工具\User Data\22ba539e67ea05e6bfbb2f901a101457\Default"


def fix_cli_port(port):
    if not os.path.isdir(CLI_PROFILE):
        print("  [跳过] profile 目录不存在：%s" % CLI_PROFILE)
        return
    for name in (".cli", ".ide"):
        p = os.path.join(CLI_PROFILE, name)
        old = io.open(p, encoding="utf-8", errors="replace").read().strip() if os.path.exists(p) else None
        if old != port:
            io.open(p, "w", encoding="utf-8", newline="").write(port)
            print("  %s: %s -> %s" % (name, old or "(空)", port))
        else:
            print("  %s: 已是 %s" % (name, port))
    io.open(os.path.join(CLI_PROFILE, ".ide-status"), "w", encoding="utf-8", newline="").write("On")


def deploy(fn_dir, env, appid, label):
    args = [CLI, "cloud", "functions", "deploy",
            "-e", env, "--paths", fn_dir, "--appid", appid]
    print("\n" + "=" * 64)
    print("部署 %s" % label)
    print("  dir  = %s" % fn_dir)
    print("  env  = %s" % env)
    print("  appid= %s" % appid)
    print("=" * 64)
    p = subprocess.run(args, input="y\n", capture_output=True, text=True,
                       encoding="utf-8", errors="replace", timeout=900)
    print(p.stdout)
    if p.stderr:
        print("--- stderr ---")
        print(p.stderr)
    print("--- exit code:", p.returncode, "---")
    return p.returncode


def main():
    port = sys.argv[1] if len(sys.argv) > 1 else "52093"
    print("[0/2] 修正 CLI profile 端口 -> %s" % port)
    fix_cli_port(port)

    rc1 = deploy(os.path.join(ROOT, "cloudfunctions", "calculate"), ENV_MAIN, APPID_MAIN, "calculate（主程序）")
    rc2 = deploy(os.path.join(ROOT, "index-mini", "cloudfunctions", "calcIndex"), ENV_INDEX, APPID_INDEX, "calcIndex（指数小程序）")

    print("\n" + "=" * 64)
    print("汇总：calculate=%s  calcIndex=%s" % (rc1, rc2))
    print("=" * 64)
    print("⚠️ deploy 日志 success 不等于线上正确，必须 download 回副本验证。")


if __name__ == "__main__":
    main()
