function Get-FormattedTree {
    param (
        [string]$Path,
        [string]$Indent = "",
        [bool]$isLast = $true,
        [int]$Level = 1
    )

    # Get all items in the directory
    $items = Get-ChildItem $Path

    for ($i = 0; $i -lt $items.Count; $i++) {
        $item = $items[$i]
        $isLastItem = $i -eq ($items.Count - 1)

        # Determine the item prefix for formatting
        $itemPrefix = if ($isLastItem) { "|- " } else { "|- " }

        # Output the current item with proper indentation and level number
        $output = "{0}{1} (L{3}) {2} " -f $Indent, $itemPrefix, $item.Name,  $Level
        Write-Host $output

        # If the current item is a directory (except for "node_modules"), recursively call the function with increased indentation and incremented level
        if ($item.PSIsContainer -and $item.Name -ne "node_modules") {
            $subIndent = if ($isLast) { "    " } else { "|   " }
            Get-FormattedTree -Path $item.FullName -Indent ($Indent + $subIndent) -isLast $isLastItem -Level ($Level + 1)
        }
    }
}

# Usage: Replace "C:\Your\Directory\Path" with your desired directory path
Get-FormattedTree -Path "C:\Users\SBhatt\OneDrive - McMurray Aviation\sahil\Personal\GitHub Projects"
