$ErrorActionPreference = 'Stop'

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Text;

public static class RepoPulseWindows {
    private delegate bool WindowCallback(IntPtr window, IntPtr data);
    [DllImport("user32.dll")] private static extern bool EnumWindows(WindowCallback callback, IntPtr data);
    [DllImport("user32.dll")] private static extern bool IsWindowVisible(IntPtr window);
    [DllImport("user32.dll")] private static extern uint GetWindowThreadProcessId(IntPtr window, out uint pid);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] private static extern int GetWindowText(IntPtr window, StringBuilder title, int capacity);

    public static bool HasVisibleAppWindow(uint processId, string expectedTitle) {
        bool found = false;
        EnumWindows((window, data) => {
            uint owner;
            GetWindowThreadProcessId(window, out owner);
            if (owner != processId || !IsWindowVisible(window)) return true;
            var title = new StringBuilder(256);
            GetWindowText(window, title, title.Capacity);
            found = title.ToString() == expectedTitle;
            return !found;
        }, IntPtr.Zero);
        return found;
    }
}
'@

$binary = Resolve-Path -LiteralPath './dist/win-unpacked/RepoPulse.exe'
$instance = Start-Process -FilePath $binary.Path -PassThru

try {
    $deadline = [DateTime]::UtcNow.AddSeconds(45)
    while ([DateTime]::UtcNow -lt $deadline) {
        if ($instance.HasExited) {
            throw "Packaged RepoPulse terminated before opening its main window. Exit code: $($instance.ExitCode)."
        }
        if ([RepoPulseWindows]::HasVisibleAppWindow($instance.Id, 'RepoPulse')) {
            Write-Host 'Packaged Windows RepoPulse opened its main window.'
            return
        }
        Start-Sleep -Milliseconds 250
    }
    throw 'Packaged RepoPulse did not open its main window within 45 seconds.'
} finally {
    if (!$instance.HasExited) {
        Stop-Process -Id $instance.Id
    }
}
