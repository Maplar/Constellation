// @copyright 原始代码版权归 Achilng 所有 (Copyright (c) 2026 Achilng)
// 基于 MIT 许可证授权
//
// 修改部分版权：Copyright (c) 2026 Maplar
// 修改说明：二次开发修改

// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    floral_notepaper_lib::run()
}
