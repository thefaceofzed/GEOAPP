@ECHO OFF
SETLOCAL

SET WRAPPER_DIR=%~dp0.mvn\wrapper
SET MAVEN_VERSION=3.9.9
SET MAVEN_HOME=%WRAPPER_DIR%\apache-maven-%MAVEN_VERSION%
SET MAVEN_ZIP=%WRAPPER_DIR%\apache-maven-%MAVEN_VERSION%-bin.zip
SET MAVEN_URL=https://archive.apache.org/dist/maven/maven-3/%MAVEN_VERSION%/binaries/apache-maven-%MAVEN_VERSION%-bin.zip

IF EXIST "%MAVEN_HOME%\bin\mvn.cmd" (
  CALL "%MAVEN_HOME%\bin\mvn.cmd" %*
  EXIT /B %ERRORLEVEL%
)

ECHO Downloading Maven %MAVEN_VERSION%...
powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; New-Item -ItemType Directory -Force -Path '%WRAPPER_DIR%' | Out-Null; Invoke-WebRequest -Uri '%MAVEN_URL%' -OutFile '%MAVEN_ZIP%'; Expand-Archive -Path '%MAVEN_ZIP%' -DestinationPath '%WRAPPER_DIR%' -Force"
IF %ERRORLEVEL% NEQ 0 EXIT /B %ERRORLEVEL%

CALL "%MAVEN_HOME%\bin\mvn.cmd" %*
