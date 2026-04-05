{ "command": "ide_patch", "args": { "file_path": "hello.c", "find": "#include <stdio.h>
#include <stdlib.h>

int main() {
    printf("Hello, World!\
");
    printf("Welcome to C programming!\
");
    return EXIT_SUCCESS;
}
", "replace": "#include <stdio.h>

int main() {
    printf("Hello, World!\
");
    return 0;
}
", "description": "Simplify to basic hello world program" } }