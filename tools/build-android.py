#!/usr/bin/env python3
"""Build a signed offline APK using Android SDK 35 and JDK 17, without Gradle downloads.
ANDROID_SDK_ROOT, RD_KEYSTORE, RD_STORE_PASS_FILE must be supplied.
The signing key is private and must never be committed.
"""
import os
import re
import shutil
import subprocess
import zipfile
from pathlib import Path

root = Path(__file__).resolve().parent.parent
sdk = Path(os.environ['ANDROID_SDK_ROOT'])
tools = sdk / 'build-tools/35.0.0'
platform = sdk / 'platforms/android-35/android.jar'
key = Path(os.environ['RD_KEYSTORE']).resolve()
password = Path(os.environ['RD_STORE_PASS_FILE']).resolve()
build = root / 'android/build'
if build.exists():
    shutil.rmtree(build)
for folder in ['assets', 'classes', 'dex', 'compiled']:
    (build / folder).mkdir(parents=True)
for directory in ['js', 'css', 'fonts', 'icons', 'assets']:
    shutil.copytree(root / directory, build / 'assets' / directory)
for filename in ['index.html', 'manifest.json', 'helligdager.ics']:
    shutil.copy2(root / filename, build / 'assets' / filename)


def run(*args):
    subprocess.run([str(a) for a in args], check=True)


res = root / 'android/app/src/main/res'
manifest = root / 'android/app/src/main/AndroidManifest.xml'
run(tools / 'aapt2', 'compile', '--dir', res, '-o', build / 'resources.zip')
run(tools / 'aapt2', 'link', '-o', build / 'unsigned.apk', '-I', platform,
    '--manifest', manifest, '-A', build / 'assets', build / 'resources.zip')
sources = list((root / 'android/app/src/main/java').rglob('*.java'))
run('javac', '--release', '8', '-classpath', platform, '-d', build / 'classes', *sources)
run(tools / 'd8', '--lib', platform, '--min-api', '26', '--output', build / 'dex',
    *list((build / 'classes').rglob('*.class')))
with zipfile.ZipFile(build / 'unsigned.apk', 'a', zipfile.ZIP_DEFLATED) as archive:
    archive.write(build / 'dex/classes.dex', 'classes.dex')
run(tools / 'zipalign', '-f', '-P', '16', '4', build / 'unsigned.apk', build / 'aligned.apk')
version = re.search(r'VERSION = "([0-9.]+)"', (root / 'js/version.js').read_text()).group(1)
apk = build / ('Rode-dager-' + version + '.apk')
run(tools / 'apksigner', 'sign', '--ks', key, '--ks-key-alias', 'rode-dager',
    '--ks-pass', 'file:' + str(password),
    '--out', apk, build / 'aligned.apk')
run(tools / 'apksigner', 'verify', '--verbose', apk)
run(tools / 'zipalign', '-c', '-P', '16', '4', apk)
print('APK:', apk)
