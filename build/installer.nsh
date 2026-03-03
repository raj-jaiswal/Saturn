!macro customInstall
  WriteRegStr HKLM "SYSTEM\CurrentControlSet\Control\Session Manager\Environment" "SATURN_HOME" "$INSTDIR"
  ReadRegStr $0 HKLM "SYSTEM\CurrentControlSet\Control\Session Manager\Environment" "PATH"
  StrCpy $1 "$0;$INSTDIR"
  WriteRegExpandStr HKLM "SYSTEM\CurrentControlSet\Control\Session Manager\Environment" "PATH" "$1"
  SendMessage ${HWND_BROADCAST} ${WM_SETTINGCHANGE} 0 "STR:Environment"
!macroend

!macro customUnInstall
  DeleteRegValue HKLM "SYSTEM\CurrentControlSet\Control\Session Manager\Environment" "SATURN_HOME"
!macroend