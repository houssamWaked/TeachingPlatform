#define AppName "Deeb Center"
#define AppVersion "1.0.0"
#define AppExe "teachingplatform_flutter.exe"
#define BuildDir "..\build\windows\x64\runner\Release"

[Setup]
AppId={{BCEAD43F-373F-49D0-AD3C-5532893E125D}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher=Deeb Center
AppPublisherURL=https://teaching-platform-one.vercel.app/
AppSupportURL=https://teaching-platform-one.vercel.app/
DefaultDirName={autopf}\Deeb Center
DefaultGroupName=Deeb Center
DisableProgramGroupPage=yes
UninstallDisplayName=Deeb Center
UninstallDisplayIcon={app}\{#AppExe}
SetupIconFile=..\windows\runner\resources\app_icon.ico
OutputDir=..\..\Releases
OutputBaseFilename=DeebCenter-Setup-{#AppVersion}-x64
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=admin
WizardStyle=modern
Compression=lzma2/ultra64
SolidCompression=yes
CloseApplications=yes
RestartApplications=no
VersionInfoVersion=1.0.0.0
VersionInfoCompany=Deeb Center
VersionInfoDescription=Deeb Center Setup
VersionInfoProductName=Deeb Center
VersionInfoProductVersion={#AppVersion}

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; GroupDescription: "Additional shortcuts:"

[Files]
Source: "{#BuildDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "assets\MicrosoftEdgeWebView2Setup.exe"; DestDir: "{tmp}"; Flags: deleteafterinstall

[Icons]
Name: "{autoprograms}\Deeb Center"; Filename: "{app}\{#AppExe}"; WorkingDir: "{app}"
Name: "{autodesktop}\Deeb Center"; Filename: "{app}\{#AppExe}"; WorkingDir: "{app}"; Tasks: desktopicon

[Run]
Filename: "{tmp}\MicrosoftEdgeWebView2Setup.exe"; Parameters: "/silent /install"; StatusMsg: "Preparing the app's browser component..."; Flags: waituntilterminated; Check: not IsWebView2RuntimeInstalled
Filename: "{app}\{#AppExe}"; Description: "Launch Deeb Center"; Flags: postinstall nowait skipifsilent runasoriginaluser

[UninstallDelete]
Type: dirifempty; Name: "{app}"

[Code]
const
  RuntimeKey = 'Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}';

function HasRuntimeVersion(RootKey: Integer; SubKey: string): Boolean;
var
  Version: string;
begin
  Result := RegQueryStringValue(RootKey, SubKey, 'pv', Version);
  if Result then
    Result := (Version <> '') and (Version <> '0.0.0.0');
end;

function IsWebView2RuntimeInstalled: Boolean;
begin
  Result := HasRuntimeVersion(HKLM, 'SOFTWARE\WOW6432Node\' + RuntimeKey);
  if not Result then
    Result := HasRuntimeVersion(HKLM, 'SOFTWARE\' + RuntimeKey);
  if not Result then
    Result := HasRuntimeVersion(HKCU, 'Software\' + RuntimeKey);
end;
