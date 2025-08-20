function Generate-TreeStructure {
    param(
        [string]$Path = ".",
        [string]$Prefix = "",
        [bool]$IsLast = $true,
        [string[]]$ExcludeDirs = @("node_modules", ".git", "dist", "build", ".next", "coverage", ".cache", ".vscode", ".idea"),
        [string[]]$ExcludeFiles = @("package-lock.json", "yarn.lock", ".DS_Store", "Thumbs.db")
    )

    $items = Get-ChildItem -Path $Path | Where-Object { 
        $_.Name -notin $ExcludeDirs -and $_.Name -notin $ExcludeFiles -and !$_.Name.StartsWith(".")
    } | Sort-Object @{Expression={$_.PSIsContainer}; Descending=$true}, Name

    for ($i = 0; $i -lt $items.Count; $i++) {
        $item = $items[$i]
        $isLastItem = ($i -eq ($items.Count - 1))
        
        if ($isLastItem) {
            $currentPrefix = "+-- "
            $nextPrefix = "    "
        } else {
            $currentPrefix = "|-- "
            $nextPrefix = "|   "
        }

        $output = $Prefix + $currentPrefix + $item.Name
        
        if ($item.PSIsContainer) {
            $output += "/"
        }
        
        Write-Output $output

        if ($item.PSIsContainer) {
            Generate-TreeStructure -Path $item.FullName -Prefix ($Prefix + $nextPrefix) -ExcludeDirs $ExcludeDirs -ExcludeFiles $ExcludeFiles
        }
    }
}

# Generate the structure
$projectName = Split-Path -Leaf (Get-Location)
Write-Output "$projectName/"
Generate-TreeStructure | Out-File -FilePath "clean_structure.txt" -Encoding UTF8
Write-Host "Clean structure saved to clean_structure.txt"