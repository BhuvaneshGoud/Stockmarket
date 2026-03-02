@REM Maven Wrapper startup script for Windows
@echo off

set MAVEN_OPTS=%MAVEN_OPTS% -Xmx512m

@REM Execute Maven
"%~dp0.mvn\wrapper\mvnw.cmd" %*
