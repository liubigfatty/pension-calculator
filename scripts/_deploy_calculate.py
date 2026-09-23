import subprocess, sys

CLI = r'C:\Program Files (x86)\Tencent\微信web开发者工具\cli.bat'
PROJ = r'C:\Users\14041\WorkBuddy\2026-07-16-10-20-33\养老金计算平台'

r = subprocess.run(
    [CLI, 'cloud', 'functions', 'deploy', '--names', 'calculate', '--env', 'cloud1-d2gfe2lrpe9cdf8a0', '--project', PROJ],
    capture_output=True, text=True, encoding='utf-8', timeout=240,
)
sys.stdout.write(r.stdout or '')
sys.stderr.write(r.stderr or '')
print('=== returncode:', r.returncode, '===')
sys.exit(r.returncode)
