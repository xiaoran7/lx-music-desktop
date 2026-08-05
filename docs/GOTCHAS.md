# 踩坑点 / Gotchas

本文件记录本仓库（`xiaoran7/lx-music-improve` 仓库 `desktop` 分支，fork 自 `lyswhut/lx-music-desktop`，
移除了自动更新、新增了听歌统计模块）二次开发时遇到的坑，不是上游通用问题记录。

目前尚无已记录的坑——新踩到的坑（尤其听歌统计模块 CRDT store 相关的 main/renderer 进程同步问题）随手加一条：
现象 + 根因 + 修法/规避。

相关：`../lx-music-sync-server`（该模块对接的同步服务器）。
