# [koishi-plugin-sd-switch](https://forum.koishi.xyz/t/topic/57)

[![downloads](https://img.shields.io/npm/dm/koishi-plugin-sd-switch?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-sd-switch)
[![npm](https://img.shields.io/npm/v/koishi-plugin-sd-switch?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-sd-switch)

一个快速切换 SD 模型的插件，能够自动获取模型列表，通过序号选择你需要的模型。
指令 `sd-switch` `切换模型`
帮助 `help sd-switch`

## 更新日志
- 1.0.0 第一版发布
- 1.0.1 修复了一个模型序号对应的问题，新增 i18n，可以自定义回复信息了
- 1.1.0 重写此插件，新增了当前模型和当前 VAE 显示，新增了 vae 切换，优化了切换模型后的提示。
- 1.2.0 新增图片形式输出，解决由于模型名称导致的风控。
