; =====================================================================
; Synhale NSIS 安装/卸载增强脚本 (electron-builder include)
; - 通过 customCheckAppRunning 宏完全替换 electron-builder 内置的
;   CHECK_APP_RUNNING 逻辑（内置逻辑用 PowerShell/tasklist 管道探测，
;   易误报且失败即要求"手动关闭"，体验差）。
; - 自定义流程：nsProcess 原生枚举 -> taskkill 温和关闭 -> 轮询等待
;   (覆盖 Electron 多进程退出延迟) -> 强杀 -> 轮询确认 -> 仅在真正
;   关不掉时提示，"重试"会再次自动执行整个关闭流程。
; - 安装时：若检测到旧版本 -> 更新模式（覆盖安装、保留用户数据）
; =====================================================================
!include "LogicLib.nsh"

; ---------------------------------------------------------------------
; 关闭正在运行的 Synhale 进程（单轮尝试）
; 输出：$R9 = 0 已释放 / 1 本来未运行 / 2 无法关闭
; 注意：本宏只在 customCheckAppRunning 中展开一次，重试通过外层回跳实现。
; ---------------------------------------------------------------------
!macro CloseRunningSynhale
  StrCpy $R9 1
  nsProcess::_FindProcess "Synhale.exe"
  Pop $R0
  ${If} $R0 == 0
    StrCpy $R9 0

    ; 1) 温和关闭：发送 WM_CLOSE，允许应用保存呼吸会话/音频状态
    nsExec::ExecToLog 'taskkill /IM "Synhale.exe"'

    ; 2) 轮询等待所有同名进程退出（含 GPU/渲染子进程的退出延迟）
    StrCpy $R8 0
    poll_wait_${__MACRO__}:
      nsProcess::_FindProcess "Synhale.exe"
      Pop $R0
      StrCmp $R0 "0" poll_alive_${__MACRO__} poll_wait_done_${__MACRO__}
      poll_alive_${__MACRO__}:
      IntCmp 6 $R8 poll_wait_done_${__MACRO__} poll_wait_done_${__MACRO__} poll_wait_more_${__MACRO__}
      poll_wait_more_${__MACRO__}:
      Sleep 800
      IntOp $R8 $R8 + 1
      Goto poll_wait_${__MACRO__}
    poll_wait_done_${__MACRO__}:

    ; 3) 仍存活 -> 强制结束
    ${If} $R0 == 0
      nsProcess::_KillProcess "Synhale.exe"
      Pop $R0
      StrCpy $R8 0
      poll_confirm_${__MACRO__}:
        nsProcess::_FindProcess "Synhale.exe"
        Pop $R0
        StrCmp $R0 "0" poll_confirm_alive_${__MACRO__} poll_confirm_done_${__MACRO__}
        poll_confirm_alive_${__MACRO__}:
        IntCmp 4 $R8 poll_confirm_done_${__MACRO__} poll_confirm_done_${__MACRO__} poll_confirm_more_${__MACRO__}
        poll_confirm_more_${__MACRO__}:
        Sleep 800
        IntOp $R8 $R8 + 1
        Goto poll_confirm_${__MACRO__}
      poll_confirm_done_${__MACRO__}:
      ${If} $R0 == 0
        StrCpy $R9 2
      ${EndIf}
    ${EndIf}
  ${EndIf}
!macroend

; ---------------------------------------------------------------------
; 替换 electron-builder 内置的 CHECK_APP_RUNNING（安装器与卸载器共用）
; ---------------------------------------------------------------------
!macro customCheckAppRunning
  ensure_start_${__MACRO__}:
    !insertmacro CloseRunningSynhale
    StrCmp $R9 "2" 0 ensure_done_${__MACRO__}
    ; 静默模式（卸载器被安装器 /S 调用时）下不弹窗，直接重试一次后放弃
    ${If} ${Silent}
      ; 复用主流程标签再执行一轮关闭（通过回跳，避免宏二次展开）
      Goto ensure_start_${__MACRO__}_silent_retry
    ${EndIf}
    MessageBox MB_RETRYCANCEL|MB_ICONSTOP "Synhale 无法自动关闭（可能以更高权限运行）。$\r$\n$\r$\n点击“重试”将再次尝试自动关闭；点击“取消”退出安装。" /SD IDRETRY IDRETRY ensure_start_${__MACRO__} IDCANCEL ensure_cancel_${__MACRO__}
    Goto ensure_start_${__MACRO__}
  ensure_start_${__MACRO__}_silent_retry:
    ; 静默分支：直接强杀后结束，不再循环
    nsProcess::_KillProcess "Synhale.exe"
    Pop $R0
    Goto ensure_done_${__MACRO__}
  ensure_cancel_${__MACRO__}:
    Quit
  ensure_done_${__MACRO__}:
!macroend

; ---------------------------------------------------------------------
; 安装/更新初始化：更新模式检测
; ---------------------------------------------------------------------
!macro customInit
  ; --- 最早期主动关闭运行中的 Synhale 进程 ---
  ; 必须在卸载旧版本之前完成，否则旧卸载器会因文件占用而静默失败。
  ; 复用 CloseRunningSynhale 宏（展开一次）。
  !insertmacro CloseRunningSynhale
  ; 若仍有关不掉的，再强杀一次兜底（不弹窗，静默处理）
  StrCmp $R9 "2" 0 init_close_done
  nsProcess::_KillProcess "Synhale.exe"
  Pop $R0
  init_close_done:

  ; --- 更新模式检测：默认每用户安装目录存在卸载器即视为已有安装 ---
  IfFileExists "$LOCALAPPDATA\Programs\Synhale\Uninstall Synhale.exe" 0 fresh_install
    MessageBox MB_OK|MB_ICONINFORMATION "检测到已安装的 Synhale。$\r$\n$\r$\n安装程序将以更新模式运行：旧版本将被替换为 1.0.1，你的设置与呼吸会话数据（用户数据目录）将被完整保留。" /SD IDOK IDOK update_ok
    Abort
  update_ok:
    Goto init_done
  fresh_install:
    ; 全新安装：无需提示，静默继续
  init_done:
!macroend

; ---------------------------------------------------------------------
; 替换默认的"卸载旧版本失败"处理：不弹窗、不退出，直接继续覆盖安装。
; 旧 1.0.0 卸载器存在静默模式缺陷（返回错误码 2），无法通过新安装器
; 修复，因此更新流程改为"尽力卸载旧版，失败则直接覆盖安装"。
; ---------------------------------------------------------------------
!macro customUnInstallCheck
  ; 不做任何错误处理，ClearErrors 后直接 Return，安装流程继续
  ClearErrors
!macroend

!macro customUnInstallCheckCurrentUser
  ClearErrors
!macroend
