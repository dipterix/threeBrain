SET mypath=%~dp0
CD "%mypath%"

@echo off

SETLOCAL ENABLEDELAYEDEXPANSION

SET count=0
FOR /F "tokens=*" %%a in (
'where /R "C:\Program Files" Rscript.exe'
) do (
set /a count=!count!+1
set r_path=%%a
)

IF !count! EQU 0 goto _installR

goto _check_rserv

:_installR
cls
ECHO +---------------------------------------------------------+
ECHO + No Rscript.exe detected in C:\Program Files             +
ECHO +                                                         +
ECHO + Please install R into C:\Program Files, then run this   +
ECHO +   script again.                                         +
ECHO +                                                         +
ECHO + To download latest R, please go to                      +
ECHO +         https://cloud.r-project.org/bin/windows/base/   +
ECHO +                                                         +
ECHO +---------------------------------------------------------+

goto _pause

:_check_rserv

ECHO Found R at %r_path%

set r_cmd="%r_path%" --no-site-file --no-init-file --no-save --no-restore -e


%r_cmd% "if(system.file(\"\",package=\"servr\")==\"\"){utils::install.packages(\"servr\",repos=\"https://cloud.r-project.org\")}"

ECHO ----------------------------------------------------------
ECHO Launching a simple server. Enter Ctrl+C twice to terminate...

%r_cmd% "servr::httd(browser=TRUE)"


:_pause
pause

:end

ENDLOCAL
