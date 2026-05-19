# GitHub API 推送脚本
import os
import base64
import requests

REPO = "liubigfatty/pension-calculator"
TOKEN = os.environ.get("GITHUB_TOKEN", "")

def push_files():
    # 1. 提交 pension-engine/ 目录
    import subprocess
    os.chdir("C:/Users/14041/AppData/Roaming/winclaw/.openclaw/workspace/养老金计算平台")
    
    # 提交
    subprocess.run(["git", "commit", "-m", "add pension-engine directory"], check=True)
    
    # 推送
    subprocess.run(["git", "push"], check=True)
    
    print("推送完成！")

if __name__ == "__main__":
    push_files()
