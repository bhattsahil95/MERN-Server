function Print-DirectoryTree {
    param (
        [string]$Path,
        [int]$IndentLevel = 0
    )

    # Get the current indentation
    $Indent = '    ' * $IndentLevel

    # Get all items in the directory
    $items = Get-ChildItem $Path

    foreach ($item in $items) {
        if ($item.Name -ne "node_modules") {
            # Print the current item
            Write-Host "$Indent$item"

            # If the current item is a directory, recursively call the function
            if ($item.PSIsContainer) {
                Print-DirectoryTree -Path $item.FullName -IndentLevel ($IndentLevel + 1)
            }
        }
    }
}

# Usage: Replace "C:\Your\Directory\Path" with your desired directory path
Print-DirectoryTree -Path "C:\Users\SBhatt\OneDrive - McMurray Aviation\sahil\Personal\GitHub Projects\React-Node\server"
