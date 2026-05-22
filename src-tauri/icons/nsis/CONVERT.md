# NSIS 资源文件转换说明

## 概述

本文档说明如何将 SVG 源文件转换为 NSIS 安装程序所需的 BMP 格式资源。

## 前置条件

安装 ImageMagick：
- Windows: `winget install ImageMagick` 或从 https://imagemagick.org 下载
- 确保 `magick` 命令在 PATH 中可用

## 转换命令

### 1. header.bmp (150×57 像素)

```bash
cd src-tauri/icons/nsis

magick convert header.svg ^
  -resize 150x57! ^
  -type TrueColor ^
  BMP3:header.bmp
```

### 2. sidebar.bmp (164×314 像素)

```bash
magick convert sidebar.svg ^
  -resize 164x314! ^
  -type TrueColor ^
  BMP3:sidebar.bmp
```

### 3. installer-icon.ico (多尺寸嵌入)

```bash
cd src-tauri/icons

magick convert installer-icon.svg ^
  -resize 256x256 ^
  -define icon:auto-resize=256,48,32,16 ^
  installer-icon.ico
```

## 验证

转换完成后，应生成以下文件：

```
src-tauri/icons/
├── nsis/
│   ├── header.svg      (SVG 源文件)
│   ├── header.bmp      (NSIS 用，150×57)
│   ├── sidebar.svg     (SVG 源文件)
│   └── sidebar.bmp     (NSIS 用，164×314)
├── installer-icon.svg  (SVG 源文件)
└── installer-icon.ico  (NSIS 安装程序图标)
```

## 注意事项

1. BMP 格式不支持透明度，SVG 中的透明区域会被渲染为白色或黑色背景
2. NSIS 对图片尺寸要求严格，不要超出指定像素
3. 24位 BMP 颜色精度足够，避免使用过窄的渐变带
4. 如果转换后的 BMP 颜色偏差较大，可尝试调整 ImageMagick 参数：
   ```bash
   magick convert input.svg -depth 8 -type TrueColor BMP3:output.bmp
   ```

## 快速转换脚本 (Windows PowerShell)

```powershell
# 在项目根目录运行
cd src-tauri/icons/nsis

# 转换 header
magick convert header.svg -resize 150x57! -type TrueColor BMP3:header.bmp
Write-Host "header.bmp created"

# 转换 sidebar
magick convert sidebar.svg -resize 164x314! -type TrueColor BMP3:sidebar.bmp
Write-Host "sidebar.bmp created"

# 转换 installer icon
cd ..
magick convert installer-icon.svg -resize 256x256 -define icon:auto-resize=256,48,32,16 installer-icon.ico
Write-Host "installer-icon.ico created"

Write-Host "All conversions complete!"
```
